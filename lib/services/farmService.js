import { createCrudService } from './crudServiceFactory'
import { farmRepository } from '@/lib/repositories/farmRepository'

export const farmService = createCrudService(farmRepository)
