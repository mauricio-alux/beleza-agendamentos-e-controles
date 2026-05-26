const { z } = require('zod');
const { SERVICE_CATEGORIES } = require('../../constants/service-categories');

const servicePayloadSchema = z.object({
  nome: z.string().min(2).max(150),
  descricao: z.string().max(500).nullable().optional(),
  duracao_minutos: z.coerce.number().int().min(1).max(1440),
  preco: z.coerce.number().min(0).max(999999).default(0),
  categoria: z.enum(SERVICE_CATEGORIES).nullable().optional(),
  permite_online: z.boolean().optional(),
  ordem_exibicao: z.coerce.number().int().min(0).optional()
}).strict();

const updateServiceSchema = servicePayloadSchema.partial().refine((payload) => Object.keys(payload).length > 0, {
  message: 'Informe ao menos um campo para atualizar'
});

module.exports = {
  servicePayloadSchema,
  updateServiceSchema
};
