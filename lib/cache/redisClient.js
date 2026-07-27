import Redis from 'ioredis'

let client = null
let triedConnecting = false
let warnedUnavailable = false

// Lazily creates a singleton Redis connection. Returns null (instead of
// throwing) whenever Redis isn't configured or isn't reachable, so every
// caller (lib/cache/withCache.js) can treat "no cache" as a normal,
// expected outcome rather than a fatal error.
export function getRedis() {
  if (!process.env.REDIS_URL) return null
  if (client) return client
  if (triedConnecting) return null
  triedConnecting = true

  client = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 1000)),
    lazyConnect: false,
    connectTimeout: 500,
    commandTimeout: 500,
    enableOfflineQueue: false,
  })

  client.on('error', (e) => {
    if (!warnedUnavailable) {
      console.warn('[cache] Redis indisponível, seguindo sem cache:', e.message)
      warnedUnavailable = true
    }
  })

  return client
}
