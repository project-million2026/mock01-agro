import { getDb } from '@/lib/db/connection'

export const alertRepository = {
  async insertOne(doc) {
    const db = await getDb()
    await db.collection('alerts').insertOne(doc)
  },

  async findList(filter, limit) {
    const db = await getDb()
    return db.collection('alerts').find(filter).sort({ createdAt: -1 }).limit(limit).toArray()
  },

  async countUnread() {
    const db = await getDb()
    return db.collection('alerts').countDocuments({ read: false })
  },

  async markRead(ids) {
    const db = await getDb()
    if (Array.isArray(ids) && ids.length) {
      await db.collection('alerts').updateMany({ id: { $in: ids } }, { $set: { read: true } })
    } else {
      await db.collection('alerts').updateMany({ read: false }, { $set: { read: true } })
    }
  },

  // Dedup helpers used by the telemetry processing service
  async findOneByTypeAndThreshold(type, fleetNumber, threshold) {
    const db = await getDb()
    return db.collection('alerts').findOne({ type, fleetNumber, threshold })
  },

  async findRecentByType(type, fleetNumber, since) {
    const db = await getDb()
    return db.collection('alerts').findOne({ type, fleetNumber, createdAt: { $gte: since } })
  },
}
