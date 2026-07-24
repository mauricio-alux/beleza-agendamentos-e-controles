const { z } = require('zod');
const { SERVICE_CATEGORIES, normalizeServiceCategory } = require('../../constants/service-categories');
const {
  validateCategoryValue,
  validateServiceName
} = require('../../utils/taxonomy-validator');

const officialCategorySchema = z.preprocess((value) => (
  value === '' ? null : value === undefined ? value : normalizeServiceCategory(value)
), z.enum(SERVICE_CATEGORIES).nullable().optional());

const serviceSchema = z.object({
  nome: z.string().min(2).max(150),
  descricao: z.string().optional(),
  duracao_minutos: z.number().int().positive(),
  preco: z.number().nonnegative().default(0),
  categoria: officialCategorySchema,
  percentual_comissao: z.number().min(0).max(100).optional(),
  metadata: z.record(z.any()).optional()
}).superRefine((value, ctx) => {
  validateServiceName(ctx, value.nome);
  validateCategoryValue(ctx, value.categoria);
});

const createTenantSchema = z.object({
  plano_id: z.string().uuid(),
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
  admin: z.object({
    nome: z.string().min(2).max(150),
    telefone: z.string().max(20).optional()
  }),
  atua_como_profissional: z.boolean().default(true),
  servicos_iniciais: z.array(serviceSchema).default([])
});

const updateStepSchema = z.object({
  status: z.enum(['pendente', 'em_andamento', 'concluido', 'ignorado']),
  metadata: z.record(z.any()).optional()
});

module.exports = {
  createTenantSchema,
  updateStepSchema
};
