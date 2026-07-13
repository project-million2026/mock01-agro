import { createCrudService } from './crudServiceFactory'
import { fieldRepository } from '@/lib/repositories/fieldRepository'
import { polygonAreaHa } from '@/lib/geo'

function withCalculatedArea(body) {
  if (!Array.isArray(body.polygon) || body.polygon.length < 3) return body
  return {
    ...body,
    area: parseFloat(polygonAreaHa(body.polygon).toFixed(2)),
    latitude: body.polygon.reduce((s, p) => s + p[0], 0) / body.polygon.length,
    longitude: body.polygon.reduce((s, p) => s + p[1], 0) / body.polygon.length,
  }
}

export const fieldService = createCrudService(fieldRepository, {
  transformOnCreate: withCalculatedArea,
})
