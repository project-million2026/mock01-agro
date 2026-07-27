import { getDb } from '@/lib/db/connection'

export const auditRepository = {
  async insertOne(doc) {
    const db = await getDb()
    await db.collection('audit_logs').insertOne(doc)
  },
}
