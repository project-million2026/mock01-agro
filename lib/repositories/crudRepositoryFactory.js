import { getDb } from '@/lib/db/connection'

// Builds a basic repository for a Mongo collection that follows the
// cadastro pattern: documents have an `id` (uuid) and, optionally, a
// business primary key (e.g. fleetNumber, rfid, code) that can also be
// used to look the document up — mirrors the old generic CRUD factory
// from the catch-all route, just split per collection/domain.
export function createCrudRepository(collectionName, pkField = null) {
  function lookupQuery(id) {
    return pkField ? { $or: [{ id }, { [pkField]: id }] } : { id }
  }

  return {
    async findAll(limit = 1000) {
      const db = await getDb()
      return db.collection(collectionName).find({}).sort({ createdAt: -1 }).limit(limit).toArray()
    },

    async findById(id) {
      const db = await getDb()
      return db.collection(collectionName).findOne(lookupQuery(id))
    },

    async insertOne(doc) {
      const db = await getDb()
      await db.collection(collectionName).insertOne(doc)
      return doc
    },

    async updateById(id, update) {
      const db = await getDb()
      const query = lookupQuery(id)
      await db.collection(collectionName).updateOne(query, { $set: update })
      return db.collection(collectionName).findOne(query)
    },

    async deleteById(id) {
      const db = await getDb()
      await db.collection(collectionName).deleteOne(lookupQuery(id))
    },
  }
}
