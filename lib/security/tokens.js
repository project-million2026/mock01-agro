import crypto from 'crypto'

const SECRET = process.env.JWT_SECRET || 'agrotelemetry-mvp-secret-key-change-me'

function base64url(input) {
  return Buffer.from(input).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}
function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  return Buffer.from(str, 'base64').toString('utf-8')
}

export function signToken(payload, expiresInSec = 60 * 60 * 24 * 7) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const body = { ...payload, iat: now, exp: now + expiresInSec }
  const h = base64url(JSON.stringify(header))
  const b = base64url(JSON.stringify(body))
  const sig = crypto.createHmac('sha256', SECRET).update(`${h}.${b}`).digest('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${h}.${b}.${sig}`
}

export function verifyToken(token) {
  try {
    const [h, b, sig] = token.split('.')
    if (!h || !b || !sig) return null
    const expected = crypto.createHmac('sha256', SECRET).update(`${h}.${b}`).digest('base64')
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    if (expected !== sig) return null
    const payload = JSON.parse(base64urlDecode(b))
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}
