import { v4 as uuidv4 } from 'uuid'
import { pointInPolygon } from '@/lib/geo'
import { shiftRepository } from '@/lib/repositories/shiftRepository'
import { alertRepository } from '@/lib/repositories/alertRepository'
import { farmRepository } from '@/lib/repositories/farmRepository'
import { fieldRepository } from '@/lib/repositories/fieldRepository'
import { buildingRepository } from '@/lib/repositories/buildingRepository'
import { machineRepository } from '@/lib/repositories/machineRepository'
import { operatorRepository } from '@/lib/repositories/operatorRepository'
import { telemetryRepository } from '@/lib/repositories/telemetryRepository'
import { auditRepository } from '@/lib/repositories/auditRepository'
import { invalidate } from '@/lib/cache/withCache'

const LOW_FUEL_THRESHOLD = 15
const CRITICAL_FUEL_THRESHOLD = 5
const LOW_FUEL_DEDUPE_MS = 60 * 60 * 1000 // 1h

function validateEvent(payload) {
  const errors = []
  if (!payload.deviceId) errors.push('deviceId is required')
  if (!payload.fleetNumber) errors.push('fleetNumber is required')
  if (!payload.timestamp) errors.push('timestamp is required')
  if (typeof payload.latitude !== 'number') errors.push('latitude must be number')
  if (typeof payload.longitude !== 'number') errors.push('longitude must be number')
  return errors
}

function haversineKm(a, b) {
  const R = 6371, toRad = (x) => (x * Math.PI) / 180
  const dLat = toRad(b.latitude - a.latitude), dLng = toRad(b.longitude - a.longitude)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

// ===== SHIFT / JOURNEY CONTROL =====
async function handleShiftControl(p) {
  try {
    const active = await shiftRepository.findActiveByFleet(p.fleetNumber)
    const hasOperator = !!p.operatorRFID
    const isOn = !!p.ignition
    const operatorChanged = active && hasOperator && active.operatorRFID !== p.operatorRFID
    // O operador pode remover o cartão ou a ignição pode desligar
    const shouldCloseActive = active && (!isOn || !hasOperator || operatorChanged)
    // Inicializa a jornada assim que houver um cartão RFID (independente de ignição no primeiro momento)
    const shouldOpenNew = hasOperator && (!active || operatorChanged)

    if (shouldCloseActive) {
      const endedAt = new Date(p.timestamp)
      const startedAt = new Date(active.startedAt)
      const duration = Math.max(0, Math.floor((endedAt - startedAt) / 1000))
      const evs = await telemetryRepository.findEventsInRange(p.fleetNumber, startedAt, endedAt)
      let dist = 0, speedSum = 0
      for (let i = 1; i < evs.length; i++) {
        dist += haversineKm(evs[i - 1], evs[i])
        speedSum += evs[i].speed || 0
      }
      const avgSpeed = evs.length > 1 ? speedSum / (evs.length - 1) : 0
      await shiftRepository.closeShift(active._id, {
        status: 'closed',
        endedAt,
        durationSec: duration,
        endLatitude: p.latitude,
        endLongitude: p.longitude,
        distanceKm: parseFloat(dist.toFixed(2)),
        avgSpeed: parseFloat(avgSpeed.toFixed(1)),
        sampleCount: evs.length,
        reason: !isOn ? 'ignition_off' : !hasOperator ? 'operator_removed' : 'operator_changed',
      })
      await alertRepository.insertOne({
        id: uuidv4(),
        type: 'shift_closed',
        severity: 'info',
        fleetNumber: p.fleetNumber,
        operatorRFID: active.operatorRFID,
        message: `Turno encerrado: ${active.operatorRFID} em ${p.fleetNumber} (${Math.floor(duration / 3600)}h${Math.floor((duration % 3600) / 60)}min)`,
        createdAt: new Date(),
        read: false,
      })
    }

    if (shouldOpenNew) {
      const op = await operatorRepository.findOneByRfid(p.operatorRFID)
      await shiftRepository.openShift({
        id: uuidv4(),
        fleetNumber: p.fleetNumber,
        operatorRFID: p.operatorRFID,
        operatorName: op?.name || null,
        startedAt: new Date(p.timestamp),
        startLatitude: p.latitude,
        startLongitude: p.longitude,
        startEngineHours: p.engineHours,
        status: 'active',
        createdAt: new Date(),
      })
    }
  } catch (e) {
    console.error('[telemetry] shift control error', e)
  }
}

// ===== GEOFENCING: detect enter/exit of field polygons =====
async function handleGeofencing(p) {
  try {
    const fields = await fieldRepository.findWithPolygon()
    const farms = await farmRepository.findWithPolygon()
    const buildings = await buildingRepository.findWithPolygon()
    
    const insideFields = []
    const insideFarms = []
    const insideBuildings = []
    
    for (const f of fields) if (pointInPolygon(p.latitude, p.longitude, f.polygon)) insideFields.push({ id: f.id, name: f.name, farm: f.farm })
    for (const f of farms) if (pointInPolygon(p.latitude, p.longitude, f.polygon)) insideFarms.push({ id: f.id, name: f.name })
    for (const b of buildings) if (pointInPolygon(p.latitude, p.longitude, b.polygon)) insideBuildings.push({ id: b.id, name: b.name })

    const machinePrev = await machineRepository.findOneByFleet(p.fleetNumber)
    const prevInsideFields = machinePrev?.insideFields || []
    const prevInsideBuildings = machinePrev?.insideBuildings || []
    
    const prevFieldIds = new Set(prevInsideFields.map((x) => x.id))
    const currFieldIds = new Set(insideFields.map((x) => x.id))
    
    const prevBuildingIds = new Set(prevInsideBuildings.map((x) => x.id))
    const currBuildingIds = new Set(insideBuildings.map((x) => x.id))

    // Alertas de Talhões
    for (const f of insideFields) {
      if (!prevFieldIds.has(f.id)) {
        await alertRepository.insertOne({
          id: uuidv4(), type: 'geofence_enter', severity: 'info', fleetNumber: p.fleetNumber, fieldId: f.id, fieldName: f.name, farm: f.farm, latitude: p.latitude, longitude: p.longitude,
          message: `Máquina ${p.fleetNumber} entrou no talhão ${f.name}`, createdAt: new Date(), read: false,
        })
      }
    }
    for (const f of prevInsideFields) {
      if (!currFieldIds.has(f.id)) {
        await alertRepository.insertOne({
          id: uuidv4(), type: 'geofence_exit', severity: 'info', fleetNumber: p.fleetNumber, fieldId: f.id, fieldName: f.name, farm: f.farm, latitude: p.latitude, longitude: p.longitude,
          message: `Máquina ${p.fleetNumber} saiu do talhão ${f.name}`, createdAt: new Date(), read: false,
        })
      }
    }
    
    // Alertas de Prédios/Barracões (Gatilho para possível manutenção)
    for (const b of insideBuildings) {
      if (!prevBuildingIds.has(b.id)) {
        await alertRepository.insertOne({
          id: uuidv4(), type: 'maintenance_question', severity: 'warning', fleetNumber: p.fleetNumber, buildingId: b.id, buildingName: b.name, latitude: p.latitude, longitude: p.longitude,
          message: `Máquina ${p.fleetNumber} entrou em um prédio (${b.name}). Trata-se de uma manutenção?`, createdAt: new Date(), read: false,
        })
      }
    }

    return { insideFields, insideFarms, insideBuildings }
  } catch (e) {
    console.error('[telemetry] geofence error', e)
    return []
  }
}

// ===== PREVENTIVE MAINTENANCE & LOW FUEL ALERTS =====
async function handleMaintenanceAndFuelAlerts(p) {
  try {
    const machine = await machineRepository.findOneByFleet(p.fleetNumber)
    if (machine?.nextServiceAtHours && p.engineHours >= machine.nextServiceAtHours) {
      const exists = await alertRepository.findOneByTypeAndThreshold('maintenance_due', p.fleetNumber, machine.nextServiceAtHours)
      if (!exists) {
        await alertRepository.insertOne({
          id: uuidv4(),
          type: 'maintenance_due',
          severity: 'warning',
          fleetNumber: p.fleetNumber,
          threshold: machine.nextServiceAtHours,
          engineHours: p.engineHours,
          message: `Manutenção preventiva vencida: ${p.fleetNumber} atingiu ${p.engineHours.toFixed(1)}h (limite: ${machine.nextServiceAtHours}h)`,
          serviceType: machine.serviceType || 'Revisão geral',
          createdAt: new Date(),
          read: false,
        })
      }
    }
    if (typeof p.fuelLevel === 'number' && p.fuelLevel < LOW_FUEL_THRESHOLD) {
      const since = new Date(Date.now() - LOW_FUEL_DEDUPE_MS)
      const recent = await alertRepository.findRecentByType('low_fuel', p.fleetNumber, since)
      if (!recent) {
        await alertRepository.insertOne({
          id: uuidv4(),
          type: 'low_fuel',
          severity: p.fuelLevel < CRITICAL_FUEL_THRESHOLD ? 'critical' : 'warning',
          fleetNumber: p.fleetNumber,
          fuelLevel: p.fuelLevel,
          message: `Combustível baixo em ${p.fleetNumber}: ${p.fuelLevel}%`,
          createdAt: new Date(),
          read: false,
        })
      }
    }
  } catch (e) {
    console.error('[telemetry] maintenance/fuel alerts error', e)
  }
}

export const telemetryProcessingService = {
  validateEvent,

  async processOne(item) {
    const errors = validateEvent(item.payload)
    if (errors.length) throw new Error('Validation failed: ' + errors.join(', '))

    const p = item.payload
    const eventDoc = {
      id: item.id,
      deviceId: p.deviceId,
      fleetNumber: p.fleetNumber,
      timestamp: new Date(p.timestamp),
      latitude: p.latitude,
      longitude: p.longitude,
      speed: p.speed ?? 0,
      engineRpm: p.engineRpm ?? 0,
      engineHours: p.engineHours ?? 0,
      fuelLevel: p.fuelLevel ?? 0,
      operatorRFID: p.operatorRFID || null,
      ignition: !!p.ignition,
      raw: p,
      receivedAt: item.receivedAt,
      processedAt: new Date(),
    }

    await handleShiftControl(p)
    const geo = await handleGeofencing(p)
    eventDoc.insideFields = geo.insideFields
    eventDoc.insideFarms = geo.insideFarms
    eventDoc.insideBuildings = geo.insideBuildings
    await telemetryRepository.insertEvent(eventDoc)
    
    let opStatus = 'deslocamento'
    if (geo.insideBuildings.length > 0) opStatus = 'suspensa'
    else if (geo.insideFields.length > 0 || geo.insideFarms.length > 0) opStatus = 'trabalhando'

    await machineRepository.upsertStatus(
      p.fleetNumber,
      {
        lastStatus: {
          deviceId: p.deviceId,
          latitude: p.latitude,
          longitude: p.longitude,
          speed: p.speed ?? 0,
          engineRpm: p.engineRpm ?? 0,
          engineHours: p.engineHours ?? 0,
          fuelLevel: p.fuelLevel ?? 0,
          operatorRFID: p.operatorRFID || null,
          ignition: !!p.ignition,
          timestamp: new Date(p.timestamp),
          updatedAt: new Date(),
        },
        insideFields: geo.insideFields,
        insideFarms: geo.insideFarms,
        insideBuildings: geo.insideBuildings,
        operationStatus: opStatus,
        lastSeenAt: new Date(),
        online: true,
        deviceSerial: p.deviceId,
      },
      {
        id: p.fleetNumber,
        fleetNumber: p.fleetNumber,
        brand: 'Unknown',
        model: 'Unknown',
        year: new Date().getFullYear(),
        createdAt: new Date(),
        autoCreated: true,
      }
    )

    await handleMaintenanceAndFuelAlerts(p)

    await auditRepository.insertOne({
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36),
      type: 'telemetry_processed',
      fleetNumber: p.fleetNumber,
      eventId: item.id,
      at: new Date(),
    })

    // Cache TTLs are short (3-5s) so this is just to make the live map/stats
    // feel snappier right after an event lands, not a correctness requirement.
    await invalidate('dashboard:positions', 'dashboard:stats')
  },

  async markMachinesOfflineStale() {
    await machineRepository.markOfflineStale(new Date(Date.now() - 60_000))
  },
}
