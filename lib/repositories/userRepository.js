import { getDb } from '@/lib/db/connection'

const COLLECTION = 'users'

export const userRepository = {
  async findByEmail(email) {
    const db = await getDb()
    return db.collection(COLLECTION).findOne({ email })
  },

  async findByIdSafe(id) {
    const db = await getDb()
    return db.collection(COLLECTION).findOne({ id }, { projection: { _id: 0, passwordHash: 0 } })
  },

  async findAllSafe() {
    const db = await getDb()
    return db.collection(COLLECTION).find({}).project({ _id: 0, passwordHash: 0 }).toArray()
  },

  async insertOne(doc) {
    const db = await getDb()
    await db.collection(COLLECTION).insertOne(doc)
    return doc
  },

  async updateById(id, update) {
    const db = await getDb()
    await db.collection(COLLECTION).updateOne({ id }, { $set: update })
  },

  async deleteById(id) {
    const db = await getDb()
    await db.collection(COLLECTION).deleteOne({ id })
  },
}
