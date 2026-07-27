import { machineRepository } from '@/lib/repositories/machineRepository'
import { operatorRepository } from '@/lib/repositories/operatorRepository'
import { farmRepository } from '@/lib/repositories/farmRepository'
import { fieldRepository } from '@/lib/repositories/fieldRepository'
import { buildingRepository } from '@/lib/repositories/buildingRepository'
import { telemetryRepository } from '@/lib/repositories/telemetryRepository'
import { cleanArr } from '@/lib/http/response'
import { withCache } from '@/lib/cache/withCache'

const WINDOW_24H_MS = 24 * 60 * 60 * 1000

export const dashboardService = {
  async stats() {
    return withCache('dashboard:stats', 5, async () => {
      const since = new Date(Date.now() - WINDOW_24H_MS)
      const machines = await machineRepository.countAll()
      const operators = await operatorRepository.countAll()
      const farms = await farmRepository.countAll()
      const fields = await fieldRepository.countAll()
      const buildings = await buildingRepository.countAll()
      const events24h = await telemetryRepository.countEventsSince(since)
      const online = await machineRepository.countOnline()
      const offline = await machineRepository.countOffline()
      const queue = await telemetryRepository.countQueueByStatus()
      return { machines, operators, farms, fields, buildings, events24h, online, offline, queue }
    })
  },

  async positions() {
    return withCache('dashboard:positions', 3, async () => {
      const positions = await machineRepository.findPositions()
      const farms = await farmRepository.findAll()
      const fields = await fieldRepository.findAll()
      const buildings = await buildingRepository.findAll()
      return { positions, farms, fields, buildings }
    })
  },

  async eventsTimeline() {
    return withCache('dashboard:events-timeline', 30, async () => {
      const since = new Date(Date.now() - WINDOW_24H_MS)
      const buckets = await telemetryRepository.aggregateEventsTimeline(since)
      return { buckets: buckets.map((b) => ({ hour: b._id, count: b.count })) }
    })
  },

  async recentEvents() {
    return withCache('dashboard:recent-events', 5, async () => {
      return { events: cleanArr(await telemetryRepository.findRecentEvents(20)) }
    })
  },
}
