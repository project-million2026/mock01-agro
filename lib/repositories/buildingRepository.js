import { getDb } from '@/lib/db/connection'
import { createCrudRepository } from './crudRepositoryFactory'

const base = createCrudRepository('buildings', null)

export const buildingRepository = {
  ...base,
  async countAll() {
    const db = await getDb()
    return db.collection('buildings').countDocuments()
  },
}
