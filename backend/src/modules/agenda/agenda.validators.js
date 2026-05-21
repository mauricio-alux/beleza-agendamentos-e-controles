const { z } = require('zod');

const uuid = z.string().uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const clienteSchema = z.object({
  nome: z.string().min(2).max(150),
  telefone: z.string().min(10).max(20),
  email: z.string().email().optional()
});

const disponibilidadeSchema = z.object({
  data: isoDate,
  profissional_id: uuid,
  servico_id: uuid
});

const listAgendaSchema = z.object({
  data_inicio: z.string().datetime().optional(),
  data_fim: z.string().datetime().optional(),
  profissional_id: uuid.optional(),
  status: z.string().optional()
});

const createAgendaSchema = z.object({
  cliente_id: uuid.optional(),
  cliente: clienteSchema.optional(),
  profissional_id: uuid,
  servico_id: uuid,
  data_inicio: z.string().datetime(),
  observacoes: z.string().max(1000).optional()
}).refine((data) => data.cliente_id || data.cliente, {
  message: 'Cliente obrigatorio',
  path: ['cliente']
});

const updateAgendaSchema = z.object({
  observacoes: z.string().max(1000).optional(),
  status: z.enum(['pendente', 'confirmado', 'cancelado', 'concluido', 'no_show']).optional()
});

const cancelAgendaSchema = z.object({
  motivo: z.string().max(500).optional()
});

const rescheduleAgendaSchema = z.object({
  data_inicio: z.string().datetime(),
  motivo: z.string().max(500).optional()
});

module.exports = {
  disponibilidadeSchema,
  listAgendaSchema,
  createAgendaSchema,
  updateAgendaSchema,
  cancelAgendaSchema,
  rescheduleAgendaSchema
};
