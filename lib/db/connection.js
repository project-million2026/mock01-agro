import { MongoClient } from 'mongodb'

// Singleton connection, cached on globalThis so Next.js hot-reload (dev mode)
// doesn't open a new connection on every module reload.
export async function getDb() {
  if (!globalThis.__mongoDb) {
    if (!globalThis.__mongoClient) {
      const client = new MongoClient(process.env.MONGO_URL)
      await client.connect()
      globalThis.__mongoClient = client
    }
    globalThis.__mongoDb = globalThis.__mongoClient.db(process.env.DB_NAME || 'agrotelemetry')
  }
  return globalThis.__mongoDb
}
