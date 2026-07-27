import { ok, err } from './response'
import { AppError } from '@/lib/errors/AppError'
import { ensureAppBootstrapped } from '@/lib/bootstrap'

// Wraps a controller function so it can simply `return somePlainObject`
// (gets sent as 200 JSON) or `return created(data)` / any Response (passed
// through untouched), and can `throw new SomeAppError(...)` instead of
// manually constructing error responses.
export function withErrorHandling(fn) {
  return async (request, ctx) => {
    try {
      await ensureAppBootstrapped()
      const result = await fn(request, ctx)
      if (result instanceof Response) return result
      return ok(result)
    } catch (e) {
      if (e instanceof AppError) return err(e.message, e.status)
      console.error('API Error:', e)
      return err('Erro interno: ' + e.message, 500)
    }
  }
}
