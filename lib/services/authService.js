import { userRepository } from '@/lib/repositories/userRepository'
import { verifyPassword } from '@/lib/security/passwords'
import { signToken } from '@/lib/security/tokens'
import { UnauthorizedError } from '@/lib/errors/AppError'

export const authService = {
  async login(email, password) {
    const user = await userRepository.findByEmail(email)
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedError('Credenciais inválidas')
    }
    const token = signToken({ sub: user.id, email: user.email, role: user.role, name: user.name })
    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } }
  },

  async me(authUser) {
    return { user: { id: authUser.sub, email: authUser.email, name: authUser.name, role: authUser.role } }
  },
}
