import { getDb } from '@/lib/db/connection'
import { createCrudRepository } from './crudRepositoryFactory'

const base = createCrudRepository('machines', 'fleetNumber')

export const machineRepository = {
  ...base,

  async upsertStatus(fleetNumber, setFields, setOnInsertFields) {
    const db = await getDb()
    await db.collection('machines').updateOne(
      { fleetNumber },
      { $set: setFields, $setOnInsert: setOnInsertFields },
      { upsert: true }
    )
  },

  async markOfflineStale(staleBefore) {
    const db = await getDb()
    await db.collection('machines').updateMany(
      { lastSeenAt: { $lt: staleBefore }, online: true },
      { $set: { online: false } }
    )
  },

  async findByFleetNumbers(fleetNumbers) {
    const db = await getDb()
    return db.collection('machines').find({ fleetNumber: { $in: fleetNumbers } }).toArray()
  },

  async findOneByFleet(fleetNumber) {
    const db = await getDb()
    return db.collection('machines').findOne({ fleetNumber })
  },

  async findPositions() {
    const db = await getDb()
    return db.collection('machines').find({ 'lastStatus.latitude': { $exists: true } })
      .project({ _id: 0, id: 1, fleetNumber: 1, brand: 1, model: 1, online: 1, operationStatus: 1, lastStatus: 1, lastSeenAt: 1 })
      .toArray()
  },

  async countAll() {
    const db = await getDb()
    return db.collection('machines').countDocuments()
  },

  async countOnline() {
    const db = await getDb()
    return db.collection('machines').countDocuments({ online: true })
  },

  async countOffline() {
    const db = await getDb()
    return db.collection('machines').countDocuments({ online: { $ne: true } })
  },
}
