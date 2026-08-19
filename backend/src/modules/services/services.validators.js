const { z } = require('zod');
const { SERVICE_CATEGORIES, normalizeServiceCategory } = require('../../constants/service-categories');
const {
  validateCategoryValue,
  validateServiceName
} = require('../../utils/taxonomy-validator');

const officialCategorySchema = z.preprocess((value) => (
  value === '' ? null : value === undefined ? value : normalizeServiceCategory(value)
), z.enum(SERVICE_CATEGORIES).nullable().optional());

const serviceSpecialtyConfigSchema = z.object({
  especialidade_id: z.string().uuid(),
  duracao_minutos: z.coerce.number().int().min(1).max(1440).nullable().optional(),
  preco: z.coerce.number().min(0).max(999999).nullable().optional(),
  dias_retorno_recomendado: z.coerce.number().int().min(1).max(3650).nullable().optional(),
  aceita_agendamento_online: z.boolean().optional(),
  ativo: z.boolean().optional()
}).strict();

const servicePayloadBaseSchema = z.object({
  servico_catalogo_id: z.string().uuid().optional(),
  codigo_canonico: z.string().min(2).max(120).optional(),
  nome: z.string().min(2).max(150).optional(),
  descricao: z.string().max(500).nullable().optional(),
  duracao_minutos: z.coerce.number().int().min(1).max(1440).nullable().optional(),
  preco: z.coerce.number().min(0).max(999999).nullable().optional(),
  categoria: officialCategorySchema,
  dias_retorno_recomendado: z.coerce.number().int().min(1).max(3650).nullable().optional(),
  servico_ocasional: z.boolean().optional(),
  permite_online: z.boolean().optional(),
  ativo: z.boolean().optional(),
  ordem_exibicao: z.coerce.number().int().min(0).optional(),
  especialidade_ids: z.array(z.string().uuid()).max(50).optional().default([]),
  especialidades_config: z.array(serviceSpecialtyConfigSchema).max(50).optional()
}).strict();

const servicePayloadSchema = servicePayloadBaseSchema.superRefine((value, ctx) => {
  if (!value.servico_catalogo_id && !value.codigo_canonico && !value.nome) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['servico_catalogo_id'],
      message: 'Informe servico_catalogo_id, codigo_canonico ou nome.'
    });
  }

  if (!value.servico_catalogo_id && !value.codigo_canonico) {
    validateServiceName(ctx, value.nome);
    validateCategoryValue(ctx, value.categoria);
  }
});

const updateServiceSchema = servicePayloadBaseSchema.partial()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: 'Informe ao menos um campo para atualizar'
  })
  .superRefine((value, ctx) => {
    if (value.nome !== undefined) {
      validateServiceName(ctx, value.nome);
    }

    if (value.categoria !== undefined) {
      validateCategoryValue(ctx, value.categoria);
    }
  });

module.exports = {
  servicePayloadSchema,
  updateServiceSchema
};
