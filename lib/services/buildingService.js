import { createCrudService } from './crudServiceFactory'
import { buildingRepository } from '@/lib/repositories/buildingRepository'

export const buildingService = createCrudService(buildingRepository)
