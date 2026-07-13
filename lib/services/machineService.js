import { createCrudService } from './crudServiceFactory'
import { machineRepository } from '@/lib/repositories/machineRepository'
import { telemetryRepository } from '@/lib/repositories/telemetryRepository'

const base = createCrudService(machineRepository)

export const machineService = {
  ...base,

  async routeHistory(fleetNumber, hours) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000)
    const points = await telemetryRepository.findRouteHistory(fleetNumber, since)
    return { fleet: fleetNumber, hours, points }
  },
}
