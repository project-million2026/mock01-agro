import { NextResponse } from 'next/server'

function cors(res) {
  res.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return res
}

export function ok(data, status = 200) {
  return cors(NextResponse.json(data, { status }))
}

export function created(data) {
  return ok(data, 201)
}

export function err(message, status = 400) {
  return cors(NextResponse.json({ error: message }, { status }))
}

// Strips Mongo's internal _id before a document goes back over the wire.
export function clean(doc) {
  if (!doc) return doc
  const { _id, ...rest } = doc
  return rest
}

export function cleanArr(docs) {
  return docs.map(clean)
}

// Shared CORS preflight handler — every route file does:
//   export { OPTIONS } from '@/lib/http/response'
export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 200 }))
}
