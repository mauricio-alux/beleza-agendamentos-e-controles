const { z } = require('zod');

const phoneSchema = z.string().min(8).max(20);

const registerSchema = z.object({
  user: z.object({
    nome: z.string().min(2).max(120),
    email: z.string().email(),
    senha: z.string().min(8),
    telefone: phoneSchema.optional(),
    tipo_usuario: z.enum(['Administrador', 'Autonomo']).default('Administrador')
  }),
  tenant: z.object({
    nome_fantasia: z.string().min(2).max(150),
    slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/i).optional(),
    email: z.string().email().optional(),
    telefone: z.string().max(20).optional(),
    tipo_negocio: z.string().max(80).optional(),
    timezone: z.string().max(50).optional(),
    endereco: z.record(z.any()).optional()
  }),
  invite_token: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1)
});

const recoverPasswordSchema = z.object({
  email: z.string().email()
});

const resetPasswordSchema = z.object({
  access_token: z.string().min(1),
  senha: z.string().min(8)
});

const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1)
});

module.exports = {
  registerSchema,
  loginSchema,
  recoverPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema
};