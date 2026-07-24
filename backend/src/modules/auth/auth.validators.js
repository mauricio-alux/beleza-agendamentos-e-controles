const { z } = require('zod');
const { SERVICE_CATEGORIES, normalizeServiceCategory } = require('../../constants/service-categories');

const officialCategorySchema = z.preprocess((value) => (
  value === '' ? null : value === undefined ? value : normalizeServiceCategory(value)
), z.enum(SERVICE_CATEGORIES).nullable().optional());

const serviceSchema = z.object({
  nome: z.string().min(2).max(150),
  descricao: z.string().optional(),
  duracao_minutos: z.number().int().positive(),
  preco: z.number().nonnegative().default(0),
  categoria: officialCategorySchema,
  percentual_comissao: z.number().min(0).max(100).optional()
});

const registerSchema = z.object({
  nome: z.string().min(2).max(150),
  email: z.string().email(),
  senha: z.string().min(8),
  telefone: z.string().min(8).max(20).optional(),
  plano_id: z.string().uuid(),
  tipo_usuario_operacional: z.enum(['Administrador', 'Autonomo']).default('Administrador'),
  tenant: z.object({
    nome_fantasia: z.string().min(2).max(150),
    razao_social: z.string().max(150).optional(),
    cpf_cnpj: z.string().max(20).optional(),
    email: z.string().email().optional(),
    telefone: z.string().max(20).optional(),
    tipo_negocio: z.string().max(80).optional(),
    timezone: z.string().max(50).optional(),
    endereco: z.record(z.any()).optional()
  }),
  atua_como_profissional: z.boolean().default(true),
  servicos_iniciais: z.array(serviceSchema).default([])
});

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1)
});

const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1)
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema
};
