import { createCrudService } from './crudServiceFactory'
import { maintenanceRepository } from '@/lib/repositories/maintenanceRepository'

export const maintenanceService = createCrudService(maintenanceRepository)
