import { getDb } from '@/lib/db/connection'

export const shiftRepository = {
  async findActiveByFleet(fleetNumber) {
    const db = await getDb()
    return db.collection('shifts').findOne({ fleetNumber, status: 'active' })
  },

  async openShift(doc) {
    const db = await getDb()
    await db.collection('shifts').insertOne(doc)
  },

  async closeShift(shiftId, update) {
    const db = await getDb()
    await db.collection('shifts').updateOne({ _id: shiftId }, { $set: update })
  },

  async findList(filter, limit) {
    const db = await getDb()
    return db.collection('shifts').find(filter).sort({ startedAt: -1 }).limit(limit).toArray()
  },

  async findActive() {
    const db = await getDb()
    return db.collection('shifts').find({ status: 'active' }).sort({ startedAt: -1 }).toArray()
  },

  async aggregateClosedSince(since) {
    const db = await getDb()
    return db.collection('shifts').aggregate([
      { $match: { status: 'closed', startedAt: { $gte: since } } },
      { $group: {
          _id: '$operatorRFID',
          totalSec: { $sum: '$durationSec' },
          totalDistance: { $sum: '$distanceKm' },
          shifts: { $sum: 1 },
      }},
      { $sort: { totalSec: -1 } },
    ]).toArray()
  },
}
