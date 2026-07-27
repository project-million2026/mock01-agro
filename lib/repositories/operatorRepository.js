import { getDb } from '@/lib/db/connection'
import { createCrudRepository } from './crudRepositoryFactory'

const base = createCrudRepository('operators', 'rfid')

export const operatorRepository = {
  ...base,

  async findOneByRfid(rfid) {
    const db = await getDb()
    return db.collection('operators').findOne({ rfid })
  },

  async findByRfids(rfids) {
    const db = await getDb()
    return db.collection('operators').find({ rfid: { $in: rfids } }).toArray()
  },

  async countAll() {
    const db = await getDb()
    return db.collection('operators').countDocuments()
  },
}
