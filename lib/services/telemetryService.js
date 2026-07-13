import { v4 as uuidv4 } from 'uuid'
import { telemetryRepository } from '@/lib/repositories/telemetryRepository'
import { cleanArr } from '@/lib/http/response'

export const telemetryService = {
  async ingest(payload) {
    const id = uuidv4()
    await telemetryRepository.enqueue({
      id,
      payload,
      status: 'pending',
      attempts: 0,
      receivedAt: new Date(),
      nextAttemptAt: new Date(),
    })
    return { id, queued: true, status: 'pending' }
  },

  async simulate({ count = 50, fleets = ['TR001', 'TR002', 'TR003', 'CO101', 'PL202'] }) {
    const operators = ['A2F48D11', 'B7E12C99', 'C3D45F22', 'D9A11B88', 'E5F67A33']
    // Stable operator per fleet (so shifts stay open longer)
    const fleetOperator = Object.fromEntries(fleets.map((f, i) => [f, operators[i % operators.length]]))
    // Stable ignition per fleet (90% chance ON during simulation)
    const fleetIgnition = Object.fromEntries(fleets.map((f) => [f, Math.random() > 0.1]))
    const events = []
    // center: Palmas/TO region
    const baseLat = -10.1843, baseLng = -48.3336
    for (let i = 0; i < count; i++) {
      const fleet = fleets[Math.floor(Math.random() * fleets.length)]
      events.push({
        id: uuidv4(),
        payload: {
          deviceId: `VC07-${fleet}`,
          fleetNumber: fleet,
          timestamp: new Date(Date.now() - Math.random() * 60_000).toISOString(),
          latitude: baseLat + (Math.random() - 0.5) * 2,
          longitude: baseLng + (Math.random() - 0.5) * 2,
          speed: Math.random() * 30,
          engineRpm: 800 + Math.floor(Math.random() * 1500),
          engineHours: 1000 + Math.random() * 5000,
          fuelLevel: Math.floor(Math.random() * 100),
          operatorRFID: fleetOperator[fleet],
          ignition: fleetIgnition[fleet],
        },
        status: 'pending',
        attempts: 0,
        receivedAt: new Date(),
        nextAttemptAt: new Date(),
      })
    }
    await telemetryRepository.enqueueMany(events)
    return { enqueued: count }
  },

  async listEvents({ limit = 100, fleet }) {
    const cappedLimit = Math.min(limit, 500)
    const filter = fleet ? { fleetNumber: fleet } : {}
    return { events: cleanArr(await telemetryRepository.findEvents(filter, cappedLimit)) }
  },

  async listQueue() {
    return { items: cleanArr(await telemetryRepository.findQueueRecent(50)) }
  },
}
