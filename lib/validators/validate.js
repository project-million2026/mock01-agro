import { ZodError } from 'zod'
import { ValidationError } from '@/lib/errors/AppError'

export function parseOrThrow(schema, data) {
  try {
    return schema.parse(data)
  } catch (e) {
    if (e instanceof ZodError) {
      const message = e.errors.map((er) => er.message).join(', ')
      throw new ValidationError(message)
    }
    throw e
  }
}
