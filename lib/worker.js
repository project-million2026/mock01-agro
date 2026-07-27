// Async telemetry worker - processes events from MongoDB queue (outbox pattern).
// This file is now a thin scheduler: all business logic (validation, shift
// control, geofencing, alerts) lives in lib/services/telemetryProcessingService.js
import { telemetryRepository } from './repositories/telemetryRepository'
import { telemetryProcessingService } from './services/telemetryProcessingService'

const PROCESSING_INTERVAL_MS = 5000
const MAX_RETRIES = 5
const BATCH_SIZE = 50

async function tick() {
  try {
    const claimedItems = await telemetryRepository.claimPendingBatch(BATCH_SIZE)

    for (const item of claimedItems) {
      try {
        await telemetryProcessingService.processOne(item)
        await telemetryRepository.markDone(item._id)
      } catch (e) {
        const attempts = (item.attempts || 0) + 1
        if (attempts >= MAX_RETRIES) {
          await telemetryRepository.markDead(item._id, attempts, e.message)
          await telemetryRepository.insertDeadLetter({
            id: item.id,
            payload: item.payload,
            error: e.message,
            attempts,
            failedAt: new Date(),
          })
        } else {
          const backoffMs = Math.pow(2, attempts) * 1000
          await telemetryRepository.markRetry(item._id, attempts, e.message, backoffMs)
        }
      }
    }

    await telemetryProcessingService.markMachinesOfflineStale()
  } catch (e) {
    console.error('[worker] tick error', e)
  }
}

export function ensureWorkerStarted() {
  if (globalThis.__telemetryWorkerInterval) {
    clearInterval(globalThis.__telemetryWorkerInterval)
  }
  globalThis.__telemetryWorkerInterval = setInterval(tick, PROCESSING_INTERVAL_MS)
  console.log('[worker] starting telemetry worker')
}
