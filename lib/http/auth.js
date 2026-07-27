import { verifyToken } from '@/lib/security/tokens'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors/AppError'

// Returns the decoded token payload, or null if missing/invalid. Never throws.
export function getCurrentUser(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace(/^Bearer\s+/i, '')
  return verifyToken(token)
}

// Same as getCurrentUser, but throws 401 (caught by withErrorHandling) when absent.
export function requireUser(request) {
  const user = getCurrentUser(request)
  if (!user) throw new UnauthorizedError()
  return user
}

export function requireRole(user, ...roles) {
  if (!roles.includes(user.role)) throw new ForbiddenError()
}
