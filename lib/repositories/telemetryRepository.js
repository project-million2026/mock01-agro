import { getDb } from '@/lib/db/connection'

export const telemetryRepository = {
  // ---- queue (outbox pattern) ----
  async enqueue(item) {
    const db = await getDb()
    await db.collection('telemetry_queue').insertOne(item)
    return item
  },

  async enqueueMany(items) {
    const db = await getDb()
    if (items.length) await db.collection('telemetry_queue').insertMany(items)
    return items.length
  },

  async claimPendingBatch(batchSize) {
    const db = await getDb()
    const items = await db.collection('telemetry_queue').find({
      status: 'pending',
      $or: [{ nextAttemptAt: { $lte: new Date() } }, { nextAttemptAt: { $exists: false } }],
    }).limit(batchSize).toArray()

    const claimed = []
    for (const item of items) {
      const result = await db.collection('telemetry_queue').updateOne(
        { _id: item._id, status: 'pending' },
        { $set: { status: 'processing', claimedAt: new Date() } }
      )
      if (result.modifiedCount > 0) claimed.push(item)
    }
    return claimed
  },

  async markDone(queueItemId) {
    const db = await getDb()
    await db.collection('telemetry_queue').updateOne(
      { _id: queueItemId },
      { $set: { status: 'done', processedAt: new Date() } }
    )
  },

  async markRetry(queueItemId, attempts, errorMessage, backoffMs) {
    const db = await getDb()
    await db.collection('telemetry_queue').updateOne(
      { _id: queueItemId },
      { $set: { status: 'pending', attempts, lastError: errorMessage, nextAttemptAt: new Date(Date.now() + backoffMs) } }
    )
  },

  async markDead(queueItemId, attempts, errorMessage) {
    const db = await getDb()
    await db.collection('telemetry_queue').updateOne(
      { _id: queueItemId },
      { $set: { status: 'dead', attempts, error: errorMessage, deadAt: new Date() } }
    )
  },

  async insertDeadLetter(doc) {
    const db = await getDb()
    await db.collection('telemetry_dlq').insertOne(doc)
  },

  async findQueueRecent(limit = 50) {
    const db = await getDb()
    return db.collection('telemetry_queue').find({}).sort({ receivedAt: -1 }).limit(limit).toArray()
  },

  async countQueueByStatus() {
    const db = await getDb()
    const stats = await db.collection('telemetry_queue').aggregate([
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]).toArray()
    const queue = { pending: 0, processing: 0, done: 0, dead: 0 }
    stats.forEach((s) => { queue[s._id] = s.n })
    return queue
  },

  // ---- events ----
  async insertEvent(doc) {
    const db = await getDb()
    await db.collection('telemetry_events').insertOne(doc)
  },

  async findEvents(filter, limit) {
    const db = await getDb()
    return db.collection('telemetry_events').find(filter).sort({ receivedAt: -1 }).limit(limit).toArray()
  },

  async findRecentEvents(limit = 20) {
    const db = await getDb()
    return db.collection('telemetry_events').find({}).sort({ receivedAt: -1 }).limit(limit).toArray()
  },

  async findEventsInRange(fleetNumber, startedAt, endedAt) {
    const db = await getDb()
    return db.collection('telemetry_events').find({
      fleetNumber, timestamp: { $gte: startedAt, $lte: endedAt },
    }).sort({ timestamp: 1 }).project({ _id: 0, latitude: 1, longitude: 1, speed: 1 }).toArray()
  },

  async findRouteHistory(fleetNumber, since) {
    const db = await getDb()
    return db.collection('telemetry_events')
      .find({ fleetNumber, timestamp: { $gte: since } })
      .project({ _id: 0, timestamp: 1, latitude: 1, longitude: 1, speed: 1, engineRpm: 1, fuelLevel: 1, ignition: 1, engineHours: 1 })
      .sort({ timestamp: 1 })
      .limit(5000)
      .toArray()
  },

  async countEventsSince(since) {
    const db = await getDb()
    return db.collection('telemetry_events').countDocuments({ receivedAt: { $gte: since } })
  },

  async aggregateFuelByMachine(since) {
    const db = await getDb()
    return db.collection('telemetry_events').aggregate([
      { $match: { receivedAt: { $gte: since } } },
      { $group: {
          _id: '$fleetNumber',
          avgFuel: { $avg: '$fuelLevel' },
          minFuel: { $min: '$fuelLevel' },
          maxFuel: { $max: '$fuelLevel' },
          samples: { $sum: 1 },
          avgRpm: { $avg: '$engineRpm' },
          avgSpeed: { $avg: '$speed' },
      }},
      { $sort: { _id: 1 } },
    ]).toArray()
  },

  async aggregateFuelTimeline(match) {
    const db = await getDb()
    return db.collection('telemetry_events').aggregate([
      { $match: match },
      { $group: {
          _id: { fleet: '$fleetNumber', hour: { $dateToString: { format: '%H:00', date: '$receivedAt' } } },
          avgFuel: { $avg: '$fuelLevel' },
      }},
      { $sort: { '_id.hour': 1 } },
    ]).toArray()
  },

  async aggregateEventsTimeline(since) {
    const db = await getDb()
    return db.collection('telemetry_events').aggregate([
      { $match: { receivedAt: { $gte: since } } },
      { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d %H:00', date: '$receivedAt' } },
          count: { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
    ]).toArray()
  },
}
