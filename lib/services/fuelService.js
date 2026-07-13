import { telemetryRepository } from '@/lib/repositories/telemetryRepository'
import { alertRepository } from '@/lib/repositories/alertRepository'
import { cleanArr } from '@/lib/http/response'
import { withCache } from '@/lib/cache/withCache'

const WINDOW_24H_MS = 24 * 60 * 60 * 1000

export const fuelService = {
  async byMachine() {
    return withCache('fuel:by-machine', 15, async () => {
      const since = new Date(Date.now() - WINDOW_24H_MS)
      const data = await telemetryRepository.aggregateFuelByMachine(since)
      return {
        items: data.map((d) => ({
          fleetNumber: d._id,
          avgFuel: parseFloat((d.avgFuel || 0).toFixed(1)),
          minFuel: d.minFuel,
          maxFuel: d.maxFuel,
          samples: d.samples,
          avgRpm: Math.round(d.avgRpm || 0),
          avgSpeed: parseFloat((d.avgSpeed || 0).toFixed(1)),
        })),
      }
    })
  },

  async timeline(fleet) {
    return withCache(`fuel:timeline:${fleet || 'all'}`, 30, async () => {
      const since = new Date(Date.now() - WINDOW_24H_MS)
      const match = { receivedAt: { $gte: since } }
      if (fleet) match.fleetNumber = fleet
      const data = await telemetryRepository.aggregateFuelTimeline(match)
      return {
        points: data.map((d) => ({
          fleet: d._id.fleet,
          hour: d._id.hour,
          avgFuel: parseFloat((d.avgFuel || 0).toFixed(1)),
        })),
      }
    })
  },

  async lowAlerts() {
    return { items: cleanArr(await alertRepository.findList({ type: 'low_fuel' }, 50)) }
  },
}
