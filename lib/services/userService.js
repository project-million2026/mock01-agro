import { v4 as uuidv4 } from 'uuid'
import { userRepository } from '@/lib/repositories/userRepository'
import { hashPassword } from '@/lib/security/passwords'
import { clean } from '@/lib/http/response'
import { ValidationError, ConflictError } from '@/lib/errors/AppError'

export const userService = {
  async list() {
    return { items: await userRepository.findAllSafe() }
  },

  async create({ email, name, role, password }) {
    if (!email || !password) throw new ValidationError('email e password são obrigatórios')
    const existing = await userRepository.findByEmail(email)
    if (existing) throw new ConflictError('Usuário já existe')
    const doc = {
      id: uuidv4(),
      email,
      name: name || email,
      role: role || 'operator',
      passwordHash: hashPassword(password),
      createdAt: new Date(),
    }
    await userRepository.insertOne(doc)
    const { passwordHash, ...safe } = doc
    return clean(safe)
  },

  async update(id, body) {
    const update = { updatedAt: new Date() }
    if (body.name) update.name = body.name
    if (body.role) update.role = body.role
    if (body.password) update.passwordHash = hashPassword(body.password)
    await userRepository.updateById(id, update)
    return userRepository.findByIdSafe(id)
  },

  async remove(id, currentUserId) {
    if (id === currentUserId) throw new ValidationError('Não pode excluir o próprio usuário')
    await userRepository.deleteById(id)
    return { deleted: true }
  },
}
