import { shiftRepository } from '@/lib/repositories/shiftRepository'
import { operatorRepository } from '@/lib/repositories/operatorRepository'
import { machineRepository } from '@/lib/repositories/machineRepository'
import { cleanArr } from '@/lib/http/response'
import { withCache } from '@/lib/cache/withCache'

export const shiftService = {
  async list({ limit = 100, operator, fleet, status }) {
    const cappedLimit = Math.min(limit, 500)
    const filter = {}
    if (operator) filter.operatorRFID = operator
    if (fleet) filter.fleetNumber = fleet
    if (status) filter.status = status
    return { items: cleanArr(await shiftRepository.findList(filter, cappedLimit)) }
  },

  async listActive() {
    const items = await shiftRepository.findActive()
    const opRfids = [...new Set(items.map((i) => i.operatorRFID))]
    const fleets = [...new Set(items.map((i) => i.fleetNumber))]
    const ops = await operatorRepository.findByRfids(opRfids)
    const machines = await machineRepository.findByFleetNumbers(fleets)
    const opMap = Object.fromEntries(ops.map((o) => [o.rfid, o]))
    const machMap = Object.fromEntries(machines.map((m) => [m.fleetNumber, m]))
    const enriched = items.map((s) => ({
      ...s,
      operatorName: s.operatorName || opMap[s.operatorRFID]?.name || null,
      machineBrand: machMap[s.fleetNumber]?.brand || null,
      machineModel: machMap[s.fleetNumber]?.model || null,
      currentStatus: machMap[s.fleetNumber]?.lastStatus || null,
      elapsedSec: Math.floor((Date.now() - new Date(s.startedAt).getTime()) / 1000),
    }))
    return { items: cleanArr(enriched) }
  },

  async stats(period = 'today') {
    return withCache(`shifts:stats:${period}`, 15, async () => {
      let since
      if (period === 'today') since = new Date(new Date().setHours(0, 0, 0, 0))
      else if (period === 'week') since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      else if (period === 'month') since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      else since = new Date(0)

      const closed = await shiftRepository.aggregateClosedSince(since)
      const active = await shiftRepository.findActive()
      for (const a of active) {
        const elapsed = Math.floor((Date.now() - new Date(a.startedAt).getTime()) / 1000)
        const existing = closed.find((c) => c._id === a.operatorRFID)
        if (existing) { existing.totalSec += elapsed; existing.shifts += 1 }
        else closed.push({ _id: a.operatorRFID, totalSec: elapsed, totalDistance: 0, shifts: 1 })
      }

      const opRfids = closed.map((c) => c._id).filter(Boolean)
      const ops = await operatorRepository.findByRfids(opRfids)
      const opMap = Object.fromEntries(ops.map((o) => [o.rfid, o]))
      const items = closed.map((c) => ({
        operatorRFID: c._id,
        operatorName: opMap[c._id]?.name || null,
        totalHours: parseFloat((c.totalSec / 3600).toFixed(2)),
        totalDistance: parseFloat((c.totalDistance || 0).toFixed(1)),
        shifts: c.shifts,
      })).sort((a, b) => b.totalHours - a.totalHours)

      const summary = {
        period,
        operatorsActive: closed.length,
        totalHours: parseFloat(items.reduce((s, x) => s + x.totalHours, 0).toFixed(2)),
        totalDistance: parseFloat(items.reduce((s, x) => s + x.totalDistance, 0).toFixed(1)),
        totalShifts: items.reduce((s, x) => s + x.shifts, 0),
        activeNow: active.length,
      }
      return { items, summary }
    })
  },
}
