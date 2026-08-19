const { z } = require('zod');
const { disponibilidadeSchema, clienteSchema } = require('../agenda/agenda.validators');

const slugSchema = z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/i);
const campaignKeySchema = z.string().trim().min(2).max(150).regex(/^[a-z0-9_-]+$/i);

const publicAvailabilitySchema = disponibilidadeSchema;
const publicClienteSchema = clienteSchema.extend({
  telefone: z.string({
    required_error: 'Informe seu celular/WhatsApp para continuar.'
  }).trim().min(10, 'Informe seu celular/WhatsApp para continuar.').max(30, 'Informe um celular/WhatsApp valido para continuar.')
});

const publicIdentityContextSchema = z.object({
  token: z.string().min(20).max(200).optional(),
  campanha: campaignKeySchema.optional(),
  origem: z.string().trim().max(50).optional(),
  sessao_id: z.string().trim().max(120).optional(),
  lookup_only: z.boolean().optional(),
  cliente: publicClienteSchema.optional(),
  contexto: z.object({
    referrer: z.string().max(500).optional(),
    user_agent: z.string().max(300).optional(),
    timezone: z.string().max(80).optional(),
    locale: z.string().max(40).optional()
  }).optional()
}).strict();

const publicAppointmentSchema = z.object({
  cliente: publicClienteSchema.optional(),
  profissional_id: z.string().uuid(),
  servico_id: z.string().uuid(),
  especialidade_id: z.string().uuid().optional(),
  data_inicio: z.string().datetime(),
  observacoes: z.string().max(1000).optional(),
  campanha: campaignKeySchema.optional(),
  origem: z.string().trim().max(50).optional(),
  sessao_id: z.string().trim().max(120).optional(),
  client_context: z.object({
    client_token: z.string().max(200).optional(),
    device_hash: z.string().max(180).optional(),
    user_agent: z.string().max(300).optional(),
    timezone: z.string().max(80).optional(),
    locale: z.string().max(40).optional()
  }).optional()
}).refine((input) => input.cliente || input.client_context?.client_token, {
  message: 'Identificacao do cliente obrigatoria.',
  path: ['cliente']
});

const appointmentOperationalTokenSchema = z.string().trim().min(20).max(120);

const publicAppointmentActionSchema = z.object({
  token: appointmentOperationalTokenSchema,
  cmd: z.enum(['confirmar', 'cancelar']),
  motivo: z.string().max(500).optional()
});

const publicAppointmentActionQuerySchema = z.object({
  tk: appointmentOperationalTokenSchema,
  cmd: z.enum(['confirmar', 'cancelar']).optional()
});

const publicClientUpcomingAppointmentsQuerySchema = z.object({
  token: z.string().min(20).max(200)
});

const publicAppointmentRescheduleSchema = z.object({
  token: appointmentOperationalTokenSchema,
  data_inicio: z.string().datetime(),
  motivo: z.string().max(500).optional()
});

module.exports = {
  slugSchema,
  publicAvailabilitySchema,
  publicIdentityContextSchema,
  publicAppointmentSchema,
  appointmentOperationalTokenSchema,
  publicAppointmentActionSchema,
  publicAppointmentActionQuerySchema,
  publicClientUpcomingAppointmentsQuerySchema,
  publicAppointmentRescheduleSchema
};
