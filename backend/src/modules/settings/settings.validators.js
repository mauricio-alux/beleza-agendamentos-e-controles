const { z } = require('zod');
const { BUSINESS_TYPES } = require('../../constants/business-types');

const profileSchema = z.object({
  nome: z.string().min(2).max(150).optional(),
  telefone: z.string().max(20).nullable().optional(),
  foto_url: z.string().url().nullable().optional(),
  preferencias: z.record(z.unknown()).optional()
}).strict();

const tenantSchema = z.object({
  nome_fantasia: z.string().min(2).max(150).optional(),
  razao_social: z.string().max(150).nullable().optional(),
  cpf_cnpj: z.string().max(20).nullable().optional(),
  email: z.string().email().nullable().optional(),
  telefone: z.string().max(20).nullable().optional(),
  tipo_negocio: z.string().max(80).nullable().optional(),
  business_type: z.enum(BUSINESS_TYPES).nullable().optional(),
  logo_url: z.string().url().nullable().optional(),
  timezone: z.string().min(3).max(50).optional(),
  endereco: z.record(z.unknown()).optional(),
  configuracoes: z.record(z.unknown()).optional()
}).strict();

const operationSchema = z.object({
  antecedencia_minima_minutos: z.coerce.number().int().min(0).max(10080).optional(),
  janela_agendamento_dias: z.coerce.number().int().min(1).max(365).optional(),
  tolerancia_atraso_minutos: z.coerce.number().int().min(0).max(240).optional(),
  tolerancia_intervalo_min: z.coerce.number().int().min(0).max(60).optional(),
  tolerancia_fim_expediente_min: z.coerce.number().int().min(0).max(60).optional(),
  intervalo_padrao_minutos: z.coerce.number().int().min(5).max(240).optional(),
  evita_buracos_agenda: z.boolean().optional(),
  permite_cancelamento_cliente: z.boolean().optional(),
  limite_cancelamento_horas: z.coerce.number().int().min(0).max(720).optional(),
  confirmation_policy: z.enum(['strict', 'flexible', 'auto_confirm']).optional(),
  attendant_confirmation_timeout_minutes: z.coerce.number().int().min(5).max(1440).optional(),
  client_confirmation_timeout_minutes: z.coerce.number().int().min(5).max(1440).optional(),
  weekly_booking_limit: z.coerce.number().int().min(1).max(50).optional(),
  block_when_weekly_limit_exceeded: z.boolean().optional(),
  configuracoes_whatsapp: z.record(z.unknown()).optional(),
  configuracoes_ia: z.record(z.unknown()).optional()
}).strict();

module.exports = {
  profileSchema,
  tenantSchema,
  operationSchema
};
