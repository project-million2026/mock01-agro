import { createCrudService } from './crudServiceFactory'
import { operatorRepository } from '@/lib/repositories/operatorRepository'

export const operatorService = createCrudService(operatorRepository)
