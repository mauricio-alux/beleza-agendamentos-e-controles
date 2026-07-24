const { z } = require('zod');
const { SERVICE_CATEGORIES, normalizeServiceCategory } = require('../../constants/service-categories');
const {
  validateCategoryValue,
  validateServiceName
} = require('../../utils/taxonomy-validator');

const officialCategorySchema = z.preprocess((value) => (
  value === '' ? null : value === undefined ? value : normalizeServiceCategory(value)
), z.enum(SERVICE_CATEGORIES).nullable().optional());

const servicePayloadBaseSchema = z.object({
  nome: z.string().min(2).max(150),
  descricao: z.string().max(500).nullable().optional(),
  duracao_minutos: z.coerce.number().int().min(1).max(1440),
  preco: z.coerce.number().min(0).max(999999).default(0),
  categoria: officialCategorySchema,
  permite_online: z.boolean().optional(),
  ordem_exibicao: z.coerce.number().int().min(0).optional(),
  especialidade_ids: z.array(z.string().uuid()).max(50).optional().default([])
}).strict();

const servicePayloadSchema = servicePayloadBaseSchema.superRefine((value, ctx) => {
  validateServiceName(ctx, value.nome);
  validateCategoryValue(ctx, value.categoria);
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
