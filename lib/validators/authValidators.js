import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().min(1, 'email é obrigatório'),
  password: z.string().min(1, 'password é obrigatório'),
})
