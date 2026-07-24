const { z } = require('zod');

const platformCampaignSchema = z.object({
  nome: z.string().min(2).max(150),
  descricao: z.string().max(2000).optional().nullable(),
  tipo: z.string().min(2).max(50).default('template'),
  canal: z.enum(['whatsapp', 'email', 'in_app', 'sms']).default('whatsapp'),
  escopo: z.enum(['bellory', 'global_tenants', 'template']).default('template'),
  publico_alvo: z.record(z.unknown()).optional().default({}),
  conteudo: z.record(z.unknown()).optional().default({}),
  metadata: z.record(z.unknown()).optional().default({})
});

const updatePlatformCampaignSchema = platformCampaignSchema.partial().extend({
  status: z.enum(['rascunho', 'publicada', 'arquivada']).optional()
});

const nullableTrimmedString = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}, z.string().nullable().optional());

const communicationTemplateSchema = z.object({
  tenant_id: z.string().uuid().nullable().optional(),
  nome: z.string().min(2).max(100),
  canal: z.enum(['whatsapp', 'email', 'sms', 'push']).default('whatsapp'),
  tipo: z.string().min(2).max(50),
  assunto: nullableTrimmedString,
  conteudo: z.string().min(1).max(8000),
  variaveis: z.array(z.string().trim().min(1).max(80)).default([]),
  provider_template_name: nullableTrimmedString,
  language: z.string().trim().min(2).max(20).default('pt_BR'),
  categoria_provider: nullableTrimmedString,
  ultima_sincronizacao_provider: nullableTrimmedString,
  observacoes: nullableTrimmedString,
  aprovado_provider: z.boolean().default(false),
  ativo: z.boolean().default(true)
});

const updateCommunicationTemplateSchema = communicationTemplateSchema.partial();

const subscriptionStatusSchema = z.enum([
  'trial',
  'ativo',
  'ativa',
  'expirada',
  'vencida',
  'suspensa',
  'inadimplente',
  'cancelada',
  'pendente_pagamento'
]);

const subscriptionOriginSchema = z.enum([
  'masteradmin',
  'pagamento',
  'upgrade',
  'downgrade',
  'trial',
  'sistema',
  'suporte'
]).default('masteradmin');

const subscriptionStatusUpdateSchema = z.object({
  status: subscriptionStatusSchema,
  origem: subscriptionOriginSchema,
  observacao: z.string().trim().min(3).max(1000),
  motivo_bloqueio: z.string().trim().max(1000).optional().nullable(),
  data_fim: z.string().date().optional().nullable(),
  expira_em: z.string().date().optional().nullable(),
  proxima_renovacao: z.string().date().optional().nullable(),
  confirm: z.literal(true)
});

const subscriptionPlanUpdateSchema = z.object({
  plano_id: z.string().uuid(),
  tipo_alteracao: z.enum(['upgrade', 'downgrade', 'manual']).default('manual'),
  origem: subscriptionOriginSchema,
  observacao: z.string().trim().min(3).max(1000),
  confirm: z.literal(true)
});

const subscriptionExtendTrialSchema = z.object({
  trial_ate: z.string().date().optional(),
  dias: z.number().int().min(1).max(365).optional(),
  observacao: z.string().trim().min(3).max(1000),
  confirm: z.literal(true)
}).refine((value) => value.trial_ate || value.dias, {
  message: 'Informe trial_ate ou dias.',
  path: ['trial_ate']
});

const subscriptionReactivateSchema = z.object({
  plano_id: z.string().uuid().optional(),
  expira_em: z.string().date().optional().nullable(),
  proxima_renovacao: z.string().date().optional().nullable(),
  observacao: z.string().trim().min(3).max(1000),
  confirm: z.literal(true)
});

module.exports = {
  platformCampaignSchema,
  updatePlatformCampaignSchema,
  communicationTemplateSchema,
  updateCommunicationTemplateSchema,
  subscriptionStatusUpdateSchema,
  subscriptionPlanUpdateSchema,
  subscriptionExtendTrialSchema,
  subscriptionReactivateSchema
};
