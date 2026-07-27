import { z } from 'zod'

export const createUserSchema = z.object({
  email: z.string().min(1, 'email é obrigatório'),
  password: z.string().min(1, 'password é obrigatório'),
  name: z.string().optional(),
  role: z.string().optional(),
})

export const updateUserSchema = z.object({
  name: z.string().optional(),
  role: z.string().optional(),
  password: z.string().optional(),
})
