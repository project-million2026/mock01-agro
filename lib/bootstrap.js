import { ensureWorkerStarted } from '@/lib/worker'
import { seedAdminIfNeeded } from '@/lib/services/seedService'

let seedPromise = null

// Idempotent: safe to call on every request. The worker only ever starts
// once (guarded internally), and the admin-seed check only ever runs once
// per server process (memoized promise) instead of once per request like
// the old catch-all route used to do.
export function ensureAppBootstrapped() {
  ensureWorkerStarted()
  if (!seedPromise) {
    seedPromise = seedAdminIfNeeded().catch((e) => {
      console.error('[seed] error', e)
    })
  }
  return seedPromise
}
