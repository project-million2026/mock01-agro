import { v4 as uuidv4 } from 'uuid'
import { userRepository } from '@/lib/repositories/userRepository'
import { hashPassword } from '@/lib/security/passwords'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@telemetria.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

export async function seedAdminIfNeeded() {
  const existing = await userRepository.findByEmail(ADMIN_EMAIL)
  if (existing) return
  await userRepository.insertOne({
    id: uuidv4(),
    email: ADMIN_EMAIL,
    name: 'Administrador',
    role: 'admin',
    passwordHash: hashPassword(ADMIN_PASSWORD),
    createdAt: new Date(),
  })
}
