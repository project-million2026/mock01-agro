import { getDb } from '@/lib/db/connection'
import { createCrudRepository } from './crudRepositoryFactory'

const base = createCrudRepository('farms', 'code')

export const farmRepository = {
  ...base,
  async countAll() {
    const db = await getDb()
    return db.collection('farms').countDocuments()
  },
}
