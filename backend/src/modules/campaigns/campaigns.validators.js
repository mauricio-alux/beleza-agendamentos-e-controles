const { z } = require('zod');

const uuid = z.string().uuid();
const optionalUuid = uuid.optional().nullable();
const jsonRecord = z.record(z.unknown()).default({});

const campaignBaseSchema = z.object({
  nome: z.string().trim().min(2).max(150),
  descricao: z.string().trim().max(2000).optional().nullable(),
  tipo: z.string().trim().min(2).max(50).default('campanha_geral'),
  origem_campanha: z.enum(['tenant', 'plataforma', 'ia']).optional(),
  tipo_publico: z.enum(['clientes', 'usuarios_saas']).optional(),
  natureza_campanha: z.enum(['promocional', 'relacionamento', 'institucional', 'operacional']).optional(),
  estrategia_envio: z.enum(['UNICO', 'RECORRENTE', 'EVENTO']).optional(),
  intervalo_envio_dias: z.coerce.number().int().min(1).optional().nullable(),
  prioridade: z.coerce.number().int().min(0).max(100).optional(),
  canal: z.literal('whatsapp').default('whatsapp'),
  template_id: uuid,
  cupom_id: optionalUuid,
  servico_id: optionalUuid,
  especialidade_id: optionalUuid,
  servico_tenant_especialidade_id: optionalUuid,
  criterios_segmentacao: jsonRecord,
  parametros_template: jsonRecord,
  publico_alvo: jsonRecord.optional(),
  data_inicio: z.string().date().optional().nullable(),
  data_fim: z.string().date().optional().nullable(),
  agendada_para: z.string().datetime().optional().nullable(),
  metadata: jsonRecord.optional()
});

function refineCampaignDatesAndStrategy(data, ctx) {
  if (data.data_inicio && data.data_fim && data.data_fim < data.data_inicio) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['data_fim'],
      message: 'A data final deve ser maior ou igual a data inicial.'
    });
  }

  if (data.estrategia_envio === 'RECORRENTE' && !data.intervalo_envio_dias) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['intervalo_envio_dias'],
      message: 'Campanha recorrente exige intervalo de envio em dias.'
    });
  }
}

const campaignSchema = campaignBaseSchema.superRefine(refineCampaignDatesAndStrategy);

const updateCampaignSchema = campaignBaseSchema.partial().superRefine(refineCampaignDatesAndStrategy);

const campaignActionSchema = z.object({
  agendada_para: z.string().datetime().optional().nullable()
}).default({});

const campaignApproveSchema = z.object({
  oferta: z.string().trim().max(200).optional().nullable(),
  desconto: z.coerce.number().min(0).max(100).optional().nullable(),
  valor_promocional: z.coerce.number().min(0).optional().nullable(),
  brinde: z.string().trim().max(200).optional().nullable(),
  texto_complementar: z.string().trim().max(500).optional().nullable(),
  data_inicial: z.string().date().optional().nullable(),
  data_final: z.string().date().optional().nullable(),
  natureza_campanha: z.enum(['promocional', 'relacionamento', 'institucional', 'operacional']).optional(),
  estrategia_envio: z.enum(['UNICO', 'RECORRENTE', 'EVENTO']).optional(),
  intervalo_envio_dias: z.coerce.number().int().min(1).optional().nullable(),
  prioridade: z.coerce.number().int().min(0).max(100).optional(),
  recorrencia: z.string().trim().max(80).optional().nullable(),
  excecoes: z.string().trim().max(500).optional().nullable(),
  salvar_como_padrao: z.boolean().optional().default(false),
  execution_mode: z.enum(['tenant_assisted', 'saas_managed', 'choose_each_campaign']).optional(),
  manual_distribution_preference: z.enum(['broadcast_list', 'manual_contacts', 'other_whatsapp_method', 'choose_each_campaign']).optional().nullable(),
  agendada_para: z.string().datetime().optional().nullable(),
  parametros_template: jsonRecord.optional()
}).superRefine((data, ctx) => {
  if (data.data_inicial && data.data_final && data.data_final < data.data_inicial) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['data_final'],
      message: 'A data final deve ser maior ou igual a data inicial.'
    });
  }

  if (data.estrategia_envio === 'RECORRENTE' && !data.intervalo_envio_dias) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['intervalo_envio_dias'],
      message: 'Campanha recorrente exige intervalo de envio em dias.'
    });
  }
}).default({});

const campaignRejectSchema = z.object({
  motivo: z.string().trim().max(500).optional().nullable()
}).default({});

const previewSchema = z.object({
  cliente_id: optionalUuid,
  parametros_template: jsonRecord.optional(),
  data_inicio: z.string().date().optional().nullable(),
  data_fim: z.string().date().optional().nullable(),
  metadata: jsonRecord.optional()
}).default({});

const estimateSchema = z.object({
  criterios_segmentacao: jsonRecord.optional(),
  parametros_template: jsonRecord.optional()
}).default({});

const listCampaignsSchema = z.object({
  search: z.string().trim().max(150).optional().default(''),
  status: z.string().trim().max(30).optional().default('all'),
  tipo: z.string().trim().max(50).optional().default('all'),
  ativo: z.enum(['all', 'true', 'false']).optional().default('all'),
  created_from: z.string().date().optional(),
  created_to: z.string().date().optional(),
  send_from: z.string().date().optional(),
  send_to: z.string().date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(50).default(20)
}).superRefine((data, ctx) => {
  [
    ['created_from', 'created_to'],
    ['send_from', 'send_to']
  ].forEach(([fromKey, toKey]) => {
    if (data[fromKey] && data[toKey] && data[fromKey] > data[toKey]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [toKey],
        message: 'A data final deve ser maior ou igual a data inicial.'
      });
    }
  });
});

const couponSchema = z.object({
  campanha_id: optionalUuid,
  codigo: z.string().trim().min(2).max(50),
  nome: z.string().trim().min(2).max(150).optional().nullable(),
  descricao: z.string().trim().max(2000).optional().nullable(),
  tipo_codigo: z.enum(['generico', 'individual']).default('generico'),
  tipo_desconto: z.enum(['valor', 'percentual', 'preco_promocional']).default('percentual'),
  valor_desconto: z.coerce.number().min(0).optional().nullable(),
  percentual_desconto: z.coerce.number().min(0).max(100).optional().nullable(),
  valor_minimo: z.coerce.number().min(0).optional().nullable(),
  data_inicio: z.string().date().optional().nullable(),
  data_fim: z.string().date().optional().nullable(),
  limite_uso: z.coerce.number().int().min(1).optional().nullable(),
  limite_usos_por_cliente: z.coerce.number().int().min(1).optional().nullable(),
  servico_ids: z.array(uuid).optional().default([]),
  escopo: z.enum(['geral', 'servico', 'especialidade', 'combinacao']).optional().default('geral'),
  servico_tenant_id: optionalUuid,
  especialidade_id: optionalUuid,
  servico_tenant_especialidade_id: optionalUuid,
  ativo: z.boolean().default(true),
  metadata: jsonRecord.optional()
}).superRefine((data, ctx) => {
  const hasPercentage = data.tipo_desconto === 'percentual' && Number(data.percentual_desconto || 0) > 0;
  const hasValue = data.tipo_desconto !== 'percentual' && Number(data.valor_desconto || 0) > 0;

  if (!hasPercentage && !hasValue) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [data.tipo_desconto === 'percentual' ? 'percentual_desconto' : 'valor_desconto'],
      message: 'Informe um beneficio valido para o cupom.'
    });
  }

  if (data.escopo === 'servico' && !data.servico_tenant_id && !data.servico_ids.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['servico_tenant_id'],
      message: 'Informe o servico do tenant para este cupom.'
    });
  }
  if (data.escopo === 'especialidade' && !data.especialidade_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['especialidade_id'],
      message: 'Informe a especialidade para este cupom.'
    });
  }
  if (data.escopo === 'combinacao' && !data.servico_tenant_especialidade_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['servico_tenant_especialidade_id'],
      message: 'Informe a combinacao servico + especialidade para este cupom.'
    });
  }
});

module.exports = {
  campaignSchema,
  updateCampaignSchema,
  campaignApproveSchema,
  campaignRejectSchema,
  campaignActionSchema,
  previewSchema,
  estimateSchema,
  listCampaignsSchema,
  couponSchema
};
