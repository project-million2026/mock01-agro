import { getRedis } from './redisClient'

const PREFIX = 'agro:cache:'

// Cache-aside wrapper for read-heavy service methods. On any failure
// (Redis down, timeout, bad JSON) it falls back to calling `fn()` directly
// — the cache is purely an optimization, never a hard dependency.
export async function withCache(key, ttlSeconds, fn) {
  const redis = getRedis()
  if (!redis) return fn()

  const fullKey = PREFIX + key
  try {
    const cached = await redis.get(fullKey)
    if (cached) return JSON.parse(cached)
  } catch (e) {
    console.warn('[cache] read error, bypassing cache:', e.message)
  }

  const fresh = await fn()

  try {
    await redis.set(fullKey, JSON.stringify(fresh), 'EX', ttlSeconds)
  } catch (e) {
    console.warn('[cache] write error, continuing without cache:', e.message)
  }

  return fresh
}

// Used after writes (e.g. telemetry processing) to drop stale dashboard
// data immediately instead of waiting out the TTL.
export async function invalidate(...keys) {
  const redis = getRedis()
  if (!redis || !keys.length) return
  try {
    await redis.del(...keys.map((k) => PREFIX + k))
  } catch (e) {
    console.warn('[cache] invalidate error:', e.message)
  }
}
