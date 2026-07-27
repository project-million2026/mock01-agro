import { getDb } from '@/lib/db/connection'
import { createCrudRepository } from './crudRepositoryFactory'

const base = createCrudRepository('fields', null)

export const fieldRepository = {
  ...base,

  async findWithPolygon() {
    const db = await getDb()
    return db.collection('fields').find({ polygon: { $exists: true, $ne: [] } }).toArray()
  },

  async countAll() {
    const db = await getDb()
    return db.collection('fields').countDocuments()
  },
}
