const crypto = require('crypto');
const { AppError, notFound } = require('../../utils/errors');
const { normalizePhoneToE164 } = require('../../utils/normalize');
const env = require('../../config/env');
const { APP_BRAND, buildAppUrl } = require('../../config/app-brand');
const repository = require('./campaigns.repository');

const TERMINAL_STATUSES = new Set(['concluida', 'cancelada', 'falhou', 'encerrada', 'rejeitada']);
const ACTIVE_EQUIVALENT_STATUSES = ['rascunho', 'pronta', 'agendada', 'gerando_mensagens', 'em_processamento', 'pausada'];
const COMMERCIAL_ACTIVE_STAGES = new Set(['SUGERIDA', 'APROVADA', 'PARAMETRIZADA', 'AGENDADA', 'EM_ANDAMENTO']);
const FUTURE_APPOINTMENT_STATUSES = new Set(['solicitado', 'pendente', 'pendente_atendente', 'pendente_cliente', 'confirmado']);
const CAMPAIGN_ORIGINS = new Set(['tenant', 'plataforma', 'ia']);
const AUDIENCE_TYPES = new Set(['clientes', 'usuarios_saas']);
const CAMPAIGN_NATURES = new Set(['promocional', 'relacionamento', 'institucional', 'operacional']);
const SEND_STRATEGIES = new Set(['UNICO', 'RECORRENTE', 'EVENTO']);
const DEFAULT_COMMERCIAL_COOLDOWN_DAYS = 7;
const INTERNAL_TENANT_ROLES = new Set(['Administrador', 'Funcionario', 'Autonomo', 'Terceiro']);
const PLATFORM_USER_ROLES = new Set(['Administrador', 'Autonomo']);
const CAMPAIGN_STATUS_FILTER_ALIASES = {
  all: 'all',
  todas: 'all',
  todos: 'all',
  rascunho: 'rascunho',
  draft: 'rascunho',
  pronta: 'pronta',
  pronto: 'pronta',
  ready: 'pronta',
  aprovada: 'pronta',
  aprovado: 'pronta',
  parametrizada: 'pronta',
  parametrizado: 'pronta',
  agendada: 'agendada',
  agendado: 'agendada',
  scheduled: 'agendada',
  gerando_mensagem: 'gerando_mensagens',
  gerando_mensagens: 'gerando_mensagens',
  generating_messages: 'gerando_mensagens',
  em_processamento: 'em_processamento',
  em_andamento: 'em_processamento',
  processing: 'em_processamento',
  concluida: 'concluida',
  concluido: 'concluida',
  encerrada: 'concluida',
  encerrado: 'concluida',
  completed: 'concluida',
  cancelada: 'cancelada',
  cancelado: 'cancelada',
  rejeitada: 'cancelada',
  rejeitado: 'cancelada',
  canceled: 'cancelada',
  falhou: 'falhou',
  falha: 'falhou',
  erro: 'falhou',
  failed: 'falhou'
};
const CAMPAIGN_TYPES = new Set([
  'campanha_geral',
  'promocao_servico',
  'recuperacao_inativos',
  'aniversario',
  'novo_servico',
  'horarios_disponiveis',
  'relacionamento'
]);
const TYPES_REQUIRING_SERVICE = new Set(['promocao_servico', 'novo_servico', 'horarios_disponiveis']);
const TYPES_REQUIRING_OFFER = new Set(['promocao_servico']);
const PROMOTIONAL_TYPES = new Set(['promocao_servico', 'novo_servico', 'aniversario', 'recuperacao_inativos', 'campanha_geral']);
const SUGGESTION_COOLDOWN_DAYS = {
  birthday_month: 25,
  inactive_recovery: 21,
  return_reminder: 21,
  open_slots: 1
};
const DEFAULT_SUGGESTIONS = [
  {
    key: 'birthday_month',
    tipo: 'aniversario',
    title: 'Aniversariantes do mes',
    description: 'Convide clientes aniversariantes para agendar com um beneficio simples.',
    reason: 'A IA recomenda reforcar relacionamento em datas pessoais.',
    criteria: { mode: 'segment', birthday_month: true },
    templateHints: ['birthday', 'aniversario'],
    natureza_campanha: 'relacionamento',
    estrategia_envio: 'UNICO',
    cooldown_days: SUGGESTION_COOLDOWN_DAYS.birthday_month
  },
  {
    key: 'inactive_recovery',
    tipo: 'recuperacao_inativos',
    title: 'Recuperacao de inativos',
    description: 'Reative clientes sem atendimento recente.',
    reason: 'Clientes inativos costumam responder melhor a convite direto com oferta clara.',
    criteria: { mode: 'segment', inactive_days: 60, no_future_appointment: true },
    templateHints: ['inactive', 'inativo', 'recuperacao'],
    natureza_campanha: 'promocional',
    estrategia_envio: 'UNICO',
    cooldown_days: SUGGESTION_COOLDOWN_DAYS.inactive_recovery
  },
  {
    key: 'return_reminder',
    tipo: 'relacionamento',
    title: 'Convite de retorno',
    description: 'Sugira um novo agendamento para clientes recorrentes.',
    reason: 'Relacionamento continuo ajuda a manter frequencia de retorno.',
    criteria: { mode: 'segment', recurring: true, min_completed: 2 },
    templateHints: ['return', 'retorno', 'relationship'],
    natureza_campanha: 'relacionamento',
    estrategia_envio: 'UNICO',
    cooldown_days: SUGGESTION_COOLDOWN_DAYS.return_reminder
  },
  {
    key: 'open_slots',
    tipo: 'horarios_disponiveis',
    title: 'Horarios disponiveis',
    description: 'Divulgue horarios livres para clientes sem agendamento futuro.',
    reason: 'Aproveitar ociosidade da agenda reduz buracos operacionais.',
    criteria: { mode: 'segment', no_future_appointment: true },
    templateHints: ['flash', 'holiday', 'custom'],
    natureza_campanha: 'promocional',
    estrategia_envio: 'EVENTO',
    cooldown_days: SUGGESTION_COOLDOWN_DAYS.open_slots
  }
];

function token() {
  return `cmp_${crypto.randomBytes(10).toString('hex')}`;
}

function normalizeTemplate(row) {
  if (!row) return null;
  const metadata = row.metadata || {};
  return {
    ...row,
    provider_template_name: metadata.provider_template_name || null,
    language: metadata.language || 'pt_BR',
    categoria_provider: metadata.categoria_provider || null,
    provider_parameter_format: metadata.provider_parameter_format || null,
    variaveis: Array.isArray(row.variaveis) ? row.variaveis : []
  };
}

function normalizeCampaign(row) {
  if (!row) return null;
  const metadata = decorateCampaignMetadata(row);
  return {
    ...row,
    metadata,
    origem_campanha: metadata.origem_campanha,
    tipo_publico: metadata.tipo_publico,
    natureza_campanha: metadata.natureza_campanha,
    status_campanha: metadata.status_campanha,
    status_processamento: metadata.status_processamento,
    estrategia_envio: metadata.estrategia_envio,
    intervalo_envio_dias: metadata.intervalo_envio_dias,
    prioridade_campanha: metadata.prioridade_campanha,
    template: normalizeTemplate(row.template),
    cupom: row.cupom || null,
    servico: row.servico || null,
    metrics: calculateMetricRates(row)
  };
}

function calculateMetricRates(row) {
  const enviadas = Number(row.total_enviadas || 0);
  const entregues = Number(row.total_entregues || 0);
  const lidas = Number(row.total_lidas || 0);
  const processadas = Number(row.total_processadas || 0);
  const falhas = Number(row.total_falhas || 0);
  return {
    taxa_entrega: enviadas ? Math.round((entregues / enviadas) * 10000) / 100 : 0,
    taxa_leitura: entregues ? Math.round((lidas / entregues) * 10000) / 100 : 0,
    taxa_falha: processadas ? Math.round((falhas / processadas) * 10000) / 100 : 0
  };
}

function normalizeLegacyStatus(status = '') {
  if (['cancelada', 'concluida', 'falhou'].includes(status)) return 'ENCERRADA';
  if (status === 'agendada') return 'AGENDADA';
  if (status === 'em_processamento' || status === 'gerando_mensagens') return 'EM_ANDAMENTO';
  if (status === 'pronta') return 'PARAMETRIZADA';
  return 'PARAMETRIZADA';
}

function normalizeFilterToken(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function normalizeCampaignStatusFilter(status = 'all') {
  const token = normalizeFilterToken(status);
  return CAMPAIGN_STATUS_FILTER_ALIASES[token] || String(status || 'all').trim();
}

function normalizeCampaignListFilters(filters = {}) {
  return {
    ...filters,
    status: normalizeCampaignStatusFilter(filters.status || 'all')
  };
}

function resolveCampaignOrigin(input = {}, current = null) {
  const metadata = input.metadata || {};
  const value = input.origem_campanha || metadata.origem_campanha || metadata.origin || current?.metadata?.origem_campanha || current?.metadata?.origin;
  if (value === 'ai_suggestion') return 'ia';
  return CAMPAIGN_ORIGINS.has(value) ? value : 'tenant';
}

function resolveAudienceType(input = {}, origin = 'tenant', current = null) {
  const metadata = input.metadata || {};
  const value = input.tipo_publico || metadata.tipo_publico || current?.metadata?.tipo_publico;
  if (AUDIENCE_TYPES.has(value)) return value;
  return origin === 'plataforma' ? 'usuarios_saas' : 'clientes';
}

function resolveCampaignNature(input = {}, current = null) {
  const metadata = input.metadata || {};
  const value = input.natureza_campanha || metadata.natureza_campanha || current?.metadata?.natureza_campanha;
  if (CAMPAIGN_NATURES.has(value)) return value;
  if ((input.tipo || current?.tipo) === 'relacionamento') return 'relacionamento';
  if (PROMOTIONAL_TYPES.has(input.tipo || current?.tipo)) return 'promocional';
  return 'relacionamento';
}

function resolveSendStrategy(input = {}, current = null) {
  const metadata = input.metadata || {};
  const value = input.estrategia_envio || metadata.estrategia_envio || current?.metadata?.estrategia_envio;
  return SEND_STRATEGIES.has(value) ? value : 'UNICO';
}

function commercialStatusFor({ lifecycleStage, dataInicio, dataFim, legacyStatus, now = new Date() }) {
  if (lifecycleStage === 'suggestion') return 'SUGERIDA';
  if (lifecycleStage === 'rejected') return 'REJEITADA';
  if (['cancelada', 'concluida', 'falhou'].includes(legacyStatus)) return 'ENCERRADA';

  const start = dataInicio ? new Date(`${dataInicio}T00:00:00`) : null;
  const end = dataFim ? new Date(`${dataFim}T23:59:59`) : null;
  if (end && end < now) return 'ENCERRADA';
  if (start && start > now) return 'AGENDADA';
  if (start && start <= now) return 'EM_ANDAMENTO';
  return normalizeLegacyStatus(legacyStatus);
}

function decorateCampaignMetadata(row) {
  const metadata = row.metadata || {};
  const origin = resolveCampaignOrigin({ metadata, tipo: row.tipo }, row);
  const audienceType = resolveAudienceType({ metadata }, origin, row);
  const nature = resolveCampaignNature({ metadata, tipo: row.tipo }, row);
  const sendStrategy = resolveSendStrategy({ metadata }, row);
  const commercialStatus = metadata.status_campanha || commercialStatusFor({
    lifecycleStage: metadata.lifecycle_stage,
    dataInicio: row.data_inicio || metadata.data_inicio || metadata.strategy?.approval?.data_inicial,
    dataFim: row.data_fim || metadata.data_fim || metadata.strategy?.approval?.data_final,
    legacyStatus: row.status
  });

  return {
    ...metadata,
    origem_campanha: origin,
    tipo_publico: audienceType,
    natureza_campanha: nature,
    status_campanha: commercialStatus,
    status_processamento: metadata.status_processamento || metadata.strategy?.execution?.technical_status || 'PENDENTE',
    estrategia_envio: sendStrategy,
    intervalo_envio_dias: metadata.intervalo_envio_dias || null,
    prioridade_campanha: Number(metadata.prioridade_campanha ?? metadata.priority ?? 50),
    cooldown_comercial_dias: Number(metadata.cooldown_comercial_dias || DEFAULT_COMMERCIAL_COOLDOWN_DAYS)
  };
}

async function list(tenantId, filters = {}) {
  const normalizedFilters = normalizeCampaignListFilters(filters);
  const result = await repository.listCampaigns(tenantId, normalizedFilters);
  const pageSize = result.page_size;
  const total = result.count;

  return {
    items: result.rows.map(normalizeCampaign),
    pagination: {
      page: result.page,
      page_size: pageSize,
      total,
      total_pages: pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1,
      has_next: result.page * pageSize < total,
      has_previous: result.page > 1
    },
    diagnostics: {
      criteria: {
        tenant_id: tenantId,
        deleted_at: null,
        order_by: 'created_at desc',
        search: normalizedFilters.search || null,
        status: normalizedFilters.status || 'all',
        tipo: normalizedFilters.tipo || 'all',
        ativo: normalizedFilters.ativo || 'all',
        created_from: normalizedFilters.created_from || null,
        created_to: normalizedFilters.created_to || null,
        send_from: normalizedFilters.send_from || null,
        send_to: normalizedFilters.send_to || null
      },
      limitation_reason: 'A listagem usa tenant_id, deleted_at is null, filtros enviados na query e paginacao. Sem filtros adicionais, retorna as campanhas do tenant atual em paginas de 20 por padrao.'
    }
  };
}

async function get(tenantId, id) {
  const campaign = await repository.getCampaign(tenantId, id);
  if (!campaign) throw notFound('Campanha nao encontrada.');
  return normalizeCampaign(campaign);
}

async function create(context, input) {
  const validated = await validateCampaignDomain(context, input);
  const trackingToken = token();
  const params = mergeCampaignParams(input.parametros_template, validated.service);
  const strategy = input.metadata?.strategy || {};
  const origin = resolveCampaignOrigin(input);
  const audienceType = resolveAudienceType(input, origin);
  const nature = resolveCampaignNature(input);
  const sendStrategy = resolveSendStrategy(input);
  const lifecycleStage = input.metadata?.lifecycle_stage || (origin === 'ia' ? 'suggestion' : 'manual_creation');
  const statusCampanha = lifecycleStage === 'suggestion'
    ? 'SUGERIDA'
    : commercialStatusFor({
      lifecycleStage,
      dataInicio: input.data_inicio,
      dataFim: input.data_fim,
      legacyStatus: input.agendada_para ? 'agendada' : 'rascunho'
    });
  const payload = {
    tenant_id: context.tenantId,
    nome: input.nome,
    descricao: input.descricao || null,
    tipo: input.tipo || 'campanha_geral',
    canal: 'whatsapp',
    template_id: input.template_id,
    servico_id: input.servico_id || null,
    status: input.agendada_para ? 'agendada' : 'rascunho',
    data_inicio: input.data_inicio || null,
    data_fim: input.data_fim || null,
    publico_alvo: input.publico_alvo || input.criterios_segmentacao || {},
    criterios_segmentacao: input.criterios_segmentacao || input.publico_alvo || {},
    parametros_template: params,
    agendada_para: input.agendada_para || null,
    criado_por: context.userId || null,
    tracking_token: trackingToken,
    metadata: {
      ...(input.metadata || {}),
      origem_campanha: origin,
      tipo_publico: audienceType,
      natureza_campanha: nature,
      status_campanha: statusCampanha,
      status_processamento: 'PENDENTE',
      estrategia_envio: sendStrategy,
      intervalo_envio_dias: input.intervalo_envio_dias || null,
      prioridade_campanha: input.prioridade ?? input.metadata?.prioridade_campanha ?? 50,
      cooldown_comercial_dias: input.metadata?.cooldown_comercial_dias || DEFAULT_COMMERCIAL_COOLDOWN_DAYS,
      cupom_id: input.cupom_id || null,
      servico_id: input.servico_id || null,
      nome_servico: validated.service?.nome || null,
      lifecycle_stage: lifecycleStage,
      requires_tenant_approval: input.metadata?.requires_tenant_approval === true || lifecycleStage === 'suggestion',
      strategy: {
        suggestion: strategy.suggestion || null,
        approval: strategy.approval || null,
        execution: strategy.execution || null,
        analysis: strategy.analysis || null
      },
      tracking_token: trackingToken,
      booking_url: buildCampaignBookingUrl(context.tenantSlug, trackingToken, input.cupom_id)
    }
  };

  const campaign = await repository.createCampaign(payload);
  return normalizeCampaign(campaign);
}

async function createFromSuggestion(context, key) {
  const availableSuggestions = await suggestions(context.tenantId);
  const suggestion = availableSuggestions.find((item) => item.key === key);
  if (!suggestion) throw notFound('Sugestao de campanha nao encontrada.');
  if (!suggestion.recommended_template_id) {
    throw new AppError('Nenhum template de campanha disponivel para gerar esta sugestao.', 400, 'CAMPAIGN_TEMPLATE_REQUIRED');
  }
  await assertSuggestionCanBeCreated(context.tenantId, suggestion);

  return create(context, {
    nome: suggestion.title,
    descricao: suggestion.description,
    tipo: suggestion.tipo,
    template_id: suggestion.recommended_template_id,
    criterios_segmentacao: suggestion.criteria,
    parametros_template: {},
    origem_campanha: 'ia',
    tipo_publico: 'clientes',
    natureza_campanha: suggestion.natureza_campanha,
    estrategia_envio: suggestion.estrategia_envio,
    metadata: {
      origin: 'ai_suggestion',
      origem_campanha: 'ia',
      tipo_publico: 'clientes',
      natureza_campanha: suggestion.natureza_campanha,
      estrategia_envio: suggestion.estrategia_envio,
      cooldown_sugestao_dias: suggestion.cooldown_days,
      suggestion_key: suggestion.key,
      lifecycle_stage: 'suggestion',
      requires_tenant_approval: true,
      strategy: {
        suggestion: {
          source: 'ai_rules',
          title: suggestion.title,
          reason: suggestion.reason,
          suggested_at: new Date().toISOString()
        }
      }
    }
  });
}

async function assertSuggestionCanBeCreated(tenantId, suggestion) {
  const equivalents = await repository.listEquivalentCampaigns(tenantId, {
    tipo: suggestion.tipo,
    tipoPublico: 'clientes',
    suggestionKey: suggestion.key,
    statuses: ACTIVE_EQUIVALENT_STATUSES
  });

  const activeEquivalent = equivalents.find((campaign) => {
    const status = decorateCampaignMetadata(campaign).status_campanha;
    return COMMERCIAL_ACTIVE_STAGES.has(status);
  });
  if (activeEquivalent) {
    throw new AppError('Ja existe campanha equivalente ativa ou pendente para esta oportunidade.', 409, 'CAMPAIGN_DUPLICATE_SUGGESTION');
  }

  const cooldownDays = Number(suggestion.cooldown_days || 0);
  if (cooldownDays > 0) {
    const since = new Date(Date.now() - cooldownDays * 86_400_000);
    const recent = equivalents.find((campaign) => new Date(campaign.created_at) >= since);
    if (recent) {
      throw new AppError('Cooldown de sugestao ainda ativo para este tipo de campanha.', 409, 'CAMPAIGN_SUGGESTION_COOLDOWN');
    }
  }
}

async function update(context, id, input) {
  const current = await get(context.tenantId, id);
  if (!['rascunho', 'pronta', 'agendada', 'pausada'].includes(current.status)) {
    throw new AppError('Campanhas iniciadas nao permitem edicao critica.', 409, 'CAMPAIGN_ALREADY_STARTED');
  }

  const mergedInput = {
    ...current,
    ...input,
    cupom_id: input.cupom_id !== undefined ? input.cupom_id : current.metadata?.cupom_id || null,
    servico_id: input.servico_id !== undefined ? input.servico_id : current.servico_id || current.metadata?.servico_id || null
  };
  const validated = await validateCampaignDomain(context, mergedInput);

  const payload = {
    updated_at: new Date().toISOString()
  };
  [
    'nome',
    'descricao',
    'tipo',
    'template_id',
    'servico_id',
    'data_inicio',
    'data_fim',
    'criterios_segmentacao',
    'parametros_template',
    'agendada_para'
  ].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(input, field)) payload[field] = input[field];
  });

  if (input.parametros_template !== undefined || input.servico_id !== undefined) {
    payload.parametros_template = mergeCampaignParams(mergedInput.parametros_template, validated.service);
  }

  if (
    input.cupom_id !== undefined
    || input.servico_id !== undefined
    || input.origem_campanha !== undefined
    || input.tipo_publico !== undefined
    || input.natureza_campanha !== undefined
    || input.estrategia_envio !== undefined
    || input.intervalo_envio_dias !== undefined
    || input.prioridade !== undefined
    || input.data_inicio !== undefined
    || input.data_fim !== undefined
  ) {
    const origin = resolveCampaignOrigin(mergedInput, current);
    const audienceType = resolveAudienceType(mergedInput, origin, current);
    const nature = resolveCampaignNature(mergedInput, current);
    const sendStrategy = resolveSendStrategy(mergedInput, current);
    const currentCommercialStatus = current.metadata?.status_campanha || normalizeLegacyStatus(current.status);
    payload.metadata = {
      ...(current.metadata || {}),
      origem_campanha: origin,
      tipo_publico: audienceType,
      natureza_campanha: nature,
      estrategia_envio: sendStrategy,
      intervalo_envio_dias: mergedInput.intervalo_envio_dias || current.metadata?.intervalo_envio_dias || null,
      prioridade_campanha: mergedInput.prioridade ?? current.metadata?.prioridade_campanha ?? 50,
      status_campanha: currentCommercialStatus === 'ENCERRADA'
        ? 'ENCERRADA'
        : commercialStatusFor({
          lifecycleStage: current.metadata?.lifecycle_stage,
          dataInicio: mergedInput.data_inicio,
          dataFim: mergedInput.data_fim,
          legacyStatus: payload.agendada_para ? 'agendada' : current.status
        }),
      cupom_id: mergedInput.cupom_id || null,
      servico_id: mergedInput.servico_id || null,
      nome_servico: validated.service?.nome || null,
      booking_url: buildCampaignBookingUrl(context.tenantSlug, current.tracking_token, mergedInput.cupom_id)
    };
  }

  return normalizeCampaign(await repository.updateCampaign(context.tenantId, id, payload));
}

function approvalParams(input = {}) {
  const params = { ...(input.parametros_template || {}) };
  if (input.desconto !== undefined && input.desconto !== null) {
    params.desconto = {
      source: 'fixed',
      value: input.desconto
    };
  }
  if (input.valor_promocional !== undefined && input.valor_promocional !== null) {
    params.valor_promocional = {
      source: 'fixed',
      value: formatCurrencyPtBr(input.valor_promocional)
    };
  }
  if (input.data_final) {
    params.validade_promocao = { source: 'fixed', value: input.data_final };
  }
  if (input.oferta) {
    params.oferta = { source: 'fixed', value: input.oferta };
  }
  if (input.brinde) {
    params.brinde = { source: 'fixed', value: input.brinde };
  }
  if (input.texto_complementar) {
    params.texto_complementar = { source: 'fixed', value: input.texto_complementar };
  }
  return params;
}

async function approve(context, id, input = {}) {
  const current = await get(context.tenantId, id);
  if (TERMINAL_STATUSES.has(current.status)) {
    throw new AppError('Campanha em status terminal nao pode ser aprovada.', 409, 'CAMPAIGN_TERMINAL');
  }
  const lifecycleStage = current.metadata?.lifecycle_stage || null;
  if (['approved', 'prepared_for_manual_delivery'].includes(lifecycleStage)) {
    return current;
  }

  const coupon = await repository.getCoupon(context.tenantId, current.metadata?.cupom_id);
  const nature = input.natureza_campanha || current.metadata?.natureza_campanha || resolveCampaignNature(current);
  const sendStrategy = input.estrategia_envio || current.metadata?.estrategia_envio || resolveSendStrategy(current);
  const params = mergeCampaignParams({
    ...(current.parametros_template || {}),
    ...approvalParams(input)
  }, current.servico);
  const dataInicio = input.data_inicial || current.data_inicio || current.metadata?.data_inicio || null;
  const dataFim = input.data_final || current.data_fim || current.metadata?.data_fim || null;
  const activationDraft = {
    ...current,
    data_inicio: dataInicio,
    data_fim: dataFim,
    parametros_template: params,
    desconto: input.desconto,
    valor_promocional: input.valor_promocional,
    brinde: input.brinde,
    metadata: {
      ...(current.metadata || {}),
      natureza_campanha: nature,
      estrategia_envio: sendStrategy,
      intervalo_envio_dias: input.intervalo_envio_dias || current.metadata?.intervalo_envio_dias || null,
      strategy: {
        ...(current.metadata?.strategy || {}),
        approval: {
          ...(current.metadata?.strategy?.approval || {}),
          data_inicial: dataInicio,
          data_final: dataFim,
          desconto: input.desconto ?? null,
          valor_promocional: input.valor_promocional ?? null,
          brinde: input.brinde || null
        }
      }
    }
  };
  assertActivationRules(activationDraft, coupon);

  const status = input.agendada_para || (dataInicio && new Date(`${dataInicio}T00:00:00`) > new Date()) ? 'agendada' : 'pronta';
  const statusCampanha = commercialStatusFor({
    lifecycleStage: 'approved',
    dataInicio,
    dataFim,
    legacyStatus: status
  });

  const campaign = await repository.updateCampaign(context.tenantId, id, {
    status,
    data_inicio: dataInicio,
    data_fim: dataFim,
    parametros_template: params,
    agendada_para: input.agendada_para || current.agendada_para || null,
    metadata: {
      ...(current.metadata || {}),
      origem_campanha: current.metadata?.origem_campanha || resolveCampaignOrigin(current),
      tipo_publico: current.metadata?.tipo_publico || 'clientes',
      natureza_campanha: nature,
      status_campanha: statusCampanha,
      status_processamento: current.metadata?.status_processamento || 'PENDENTE',
      estrategia_envio: sendStrategy,
      intervalo_envio_dias: input.intervalo_envio_dias || current.metadata?.intervalo_envio_dias || null,
      prioridade_campanha: input.prioridade ?? current.metadata?.prioridade_campanha ?? 50,
      data_inicio: dataInicio,
      data_fim: dataFim,
      lifecycle_stage: 'approved',
      approved_by: context.userId || null,
      approved_at: new Date().toISOString(),
      default_saved: input.salvar_como_padrao === true,
      execution_mode: input.execution_mode || current.metadata?.execution_mode || 'tenant_assisted',
      manual_distribution_preference: input.manual_distribution_preference || current.metadata?.manual_distribution_preference || null,
      strategy: {
        ...(current.metadata?.strategy || {}),
        approval: {
          oferta: input.oferta || null,
          desconto: input.desconto ?? null,
          valor_promocional: input.valor_promocional ?? null,
          brinde: input.brinde || null,
          texto_complementar: input.texto_complementar || null,
          data_inicial: input.data_inicial || null,
          data_final: input.data_final || null,
          natureza_campanha: nature,
          estrategia_envio: sendStrategy,
          intervalo_envio_dias: input.intervalo_envio_dias || null,
          recorrencia: input.recorrencia || null,
          excecoes: input.excecoes || null,
          salvar_como_padrao: input.salvar_como_padrao === true
        },
        execution: {
          mode: input.execution_mode || current.metadata?.execution_mode || 'tenant_assisted',
          manual_distribution_preference: input.manual_distribution_preference || current.metadata?.manual_distribution_preference || null
        }
      }
    },
    updated_at: new Date().toISOString()
  });

  return normalizeCampaign(campaign);
}

async function reject(context, id, input = {}) {
  const current = await get(context.tenantId, id);
  if (TERMINAL_STATUSES.has(current.status)) {
    throw new AppError('Campanha em status terminal nao pode ser rejeitada.', 409, 'CAMPAIGN_TERMINAL');
  }

  const campaign = await repository.updateCampaign(context.tenantId, id, {
    status: 'cancelada',
    cancelada_em: new Date().toISOString(),
    metadata: {
      ...(current.metadata || {}),
      lifecycle_stage: 'rejected',
      rejected_by: context.userId || null,
      rejected_at: new Date().toISOString(),
      rejection_reason: input.motivo || null,
      strategy: {
        ...(current.metadata?.strategy || {}),
        approval: {
          ...(current.metadata?.strategy?.approval || {}),
          rejected: true,
          reason: input.motivo || null
        }
      }
    },
    updated_at: new Date().toISOString()
  });

  return normalizeCampaign(campaign);
}

async function meta(tenantId) {
  const [templates, coupons, services] = await Promise.all([
    repository.listMarketingTemplates(tenantId),
    repository.listCoupons(tenantId),
    repository.listServices(tenantId)
  ]);

  return {
    templates: templates.map(normalizeTemplate),
    coupons,
    services
  };
}

function pickTemplateForSuggestion(templates, suggestion) {
  return templates.find((template) => {
    const haystack = [
      template.nome,
      template.metadata?.finalidade,
      template.metadata?.categoria,
      template.metadata?.catalogo
    ].filter(Boolean).join(' ').toLowerCase();
    return suggestion.templateHints.some((hint) => haystack.includes(hint));
  }) || templates[0] || null;
}

function mapSuggestion(templates, suggestion) {
  const template = pickTemplateForSuggestion(templates, suggestion);
  return {
    ...suggestion,
    origin: 'ai_suggestion',
    lifecycle_stage: 'suggestion',
    requires_approval: true,
    recommended_template_id: template?.id || null,
    recommended_template_name: template?.nome || null
  };
}

async function suggestions(tenantId) {
  const templates = (await repository.listMarketingTemplates(tenantId)).map(normalizeTemplate);
  return DEFAULT_SUGGESTIONS.map((suggestion) => mapSuggestion(templates, suggestion));
}

function hasMarketingCategory(template) {
  return template?.tipo === 'marketing'
    || template?.metadata?.categoria === 'campanha'
    || template?.metadata?.categoria_provider === 'Marketing';
}

function getFixedParam(params = {}, key) {
  const value = params[key];
  if (value && typeof value === 'object' && value.source === 'fixed') return value.value;
  if (value !== undefined && typeof value !== 'object') return value;
  return '';
}

function moneyValue(value) {
  const normalized = String(value || '')
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isFutureIso(value) {
  if (!value) return true;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date > new Date();
}

function isValidDateValue(value) {
  if (!value) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime());
}

function hasCampaignBenefit(input = {}, coupon = null) {
  if (coupon) return true;
  const params = input.parametros_template || {};
  const approval = input.metadata?.strategy?.approval || {};
  return Number(input.desconto ?? approval.desconto ?? 0) > 0
    || moneyValue(getFixedParam(params, 'valor_promocional')) > 0
    || Number(input.valor_promocional ?? approval.valor_promocional ?? 0) > 0
    || Boolean(input.brinde || approval.brinde);
}

function assertActivationRules(campaign, coupon = null) {
  const metadata = campaign.metadata || {};
  const nature = metadata.natureza_campanha || resolveCampaignNature(campaign);
  const dataInicio = campaign.data_inicio || metadata.data_inicio || metadata.strategy?.approval?.data_inicial;
  const dataFim = campaign.data_fim || metadata.data_fim || metadata.strategy?.approval?.data_final;
  const sendStrategy = metadata.estrategia_envio || resolveSendStrategy(campaign);

  if (!dataInicio) {
    throw new AppError('Informe a data de inicio da campanha.', 400, 'CAMPAIGN_START_DATE_REQUIRED');
  }

  if (dataInicio && dataFim && dataFim < dataInicio) {
    throw new AppError('A data final deve ser maior ou igual a data inicial.', 400, 'CAMPAIGN_DATE_RANGE_INVALID');
  }

  if (nature === 'promocional' && !hasCampaignBenefit(campaign, coupon)) {
    throw new AppError('Informe a data de inicio e pelo menos um beneficio da campanha: desconto, valor promocional ou brinde.', 400, 'CAMPAIGN_PROMOTIONAL_BENEFIT_REQUIRED');
  }

  if (sendStrategy === 'RECORRENTE' && !metadata.intervalo_envio_dias) {
    throw new AppError('Campanha recorrente exige intervalo de envio em dias.', 400, 'CAMPAIGN_RECURRENCE_INTERVAL_REQUIRED');
  }
}

function isCouponBenefitValid(coupon) {
  if (!coupon) return false;
  if (coupon.tipo_desconto === 'percentual') return Number(coupon.percentual_desconto || 0) > 0;
  return Number(coupon.valor_desconto || 0) > 0;
}

function isCouponAvailable(coupon, serviceId = null) {
  if (!coupon || coupon.ativo !== true || !isCouponBenefitValid(coupon)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (coupon.data_inicio && new Date(`${coupon.data_inicio}T00:00:00`) > today) return false;
  if (coupon.data_fim && new Date(`${coupon.data_fim}T23:59:59`) < today) return false;
  if (coupon.limite_uso && Number(coupon.total_usos || 0) >= Number(coupon.limite_uso)) return false;

  const serviceLinks = Array.isArray(coupon.servicos)
    ? coupon.servicos.map((item) => item.servico_id).filter(Boolean)
    : [];
  if (serviceId && serviceLinks.length && !serviceLinks.includes(serviceId)) return false;

  return true;
}

function mergeCampaignParams(params = {}, service = null) {
  const next = { ...(params || {}) };
  if (service?.nome && (!next.nome_servico || getFixedParam(next, 'nome_servico') === '')) {
    next.nome_servico = { source: 'fixed', value: service.nome };
  }
  return next;
}

async function validateCampaignDomain(context, input) {
  const type = input.tipo || 'campanha_geral';
  if (!CAMPAIGN_TYPES.has(type)) {
    throw new AppError('Tipo de campanha invalido.', 400, 'CAMPAIGN_TYPE_INVALID');
  }
  const origin = resolveCampaignOrigin(input);
  const audienceType = resolveAudienceType(input, origin);
  const sendStrategy = resolveSendStrategy(input);
  if (origin !== 'plataforma' && audienceType !== 'clientes') {
    throw new AppError('Campanhas comerciais do tenant devem usar publico de clientes.', 400, 'CAMPAIGN_AUDIENCE_TYPE_INVALID');
  }
  if (origin === 'plataforma' && audienceType !== 'usuarios_saas') {
    throw new AppError('Campanhas de plataforma devem usar publico de usuarios SaaS.', 400, 'CAMPAIGN_PLATFORM_AUDIENCE_REQUIRED');
  }
  if (input.data_inicio && input.data_fim && input.data_fim < input.data_inicio) {
    throw new AppError('A data final deve ser maior ou igual a data inicial.', 400, 'CAMPAIGN_DATE_RANGE_INVALID');
  }
  if (sendStrategy === 'RECORRENTE' && !input.intervalo_envio_dias && !input.metadata?.intervalo_envio_dias) {
    throw new AppError('Campanha recorrente exige intervalo de envio em dias.', 400, 'CAMPAIGN_RECURRENCE_INTERVAL_REQUIRED');
  }

  const criteria = input.criterios_segmentacao || input.publico_alvo || {};
  if (!criteria || Object.keys(criteria).length === 0) {
    throw new AppError('Informe o publico da campanha.', 400, 'CAMPAIGN_AUDIENCE_REQUIRED');
  }

  if (!input.template_id) {
    throw new AppError('Selecione um template de campanha.', 400, 'CAMPAIGN_TEMPLATE_REQUIRED');
  }

  const template = normalizeTemplate(await repository.getTemplate(context.tenantId, input.template_id));
  if (!template) throw new AppError('Template de campanha nao encontrado ou indisponivel para o tenant.', 400, 'CAMPAIGN_TEMPLATE_INVALID');
  if (template.canal !== 'whatsapp' || template.ativo !== true || !hasMarketingCategory(template)) {
    throw new AppError('Selecione um template WhatsApp ativo de marketing.', 400, 'CAMPAIGN_TEMPLATE_INVALID');
  }

  if (input.agendada_para && !isFutureIso(input.agendada_para)) {
    throw new AppError('Quando enviar deve ser uma data e hora futuras.', 400, 'CAMPAIGN_SCHEDULE_INVALID');
  }
  if ((input.agendada_para || input.metadata?.status_campanha === 'AGENDADA') && !input.data_inicio) {
    throw new AppError('Informe a data de inicio da campanha.', 400, 'CAMPAIGN_START_DATE_REQUIRED');
  }

  let service = null;
  if (input.servico_id) {
    service = await repository.getService(context.tenantId, input.servico_id);
    if (!service) throw new AppError('Servico da campanha nao encontrado ou inativo.', 400, 'CAMPAIGN_SERVICE_INVALID');
  }

  if (TYPES_REQUIRING_SERVICE.has(type) && !service) {
    throw new AppError('Selecione o servico da campanha.', 400, 'CAMPAIGN_SERVICE_REQUIRED');
  }

  const coupon = input.cupom_id ? await repository.getCoupon(context.tenantId, input.cupom_id) : null;
  if (input.cupom_id && !isCouponAvailable(coupon, input.servico_id || null)) {
    throw new AppError('Cupom indisponivel, expirado, sem beneficio valido ou incompativel com o servico.', 400, 'CAMPAIGN_COUPON_INVALID');
  }

  const promotionalValue = moneyValue(getFixedParam(input.parametros_template, 'valor_promocional'));
  if (TYPES_REQUIRING_OFFER.has(type) && !coupon && promotionalValue <= 0) {
    throw new AppError('Promocao de servico exige valor promocional ou cupom valido.', 400, 'CAMPAIGN_OFFER_REQUIRED');
  }

  const validity = getFixedParam(input.parametros_template, 'validade_promocao');
  if (TYPES_REQUIRING_OFFER.has(type) && !input.cupom_id && !isValidDateValue(validity)) {
    throw new AppError('Informe a validade da oferta promocional.', 400, 'CAMPAIGN_OFFER_VALIDITY_REQUIRED');
  }

  return { template, service, coupon };
}

function getClientName(row) {
  return row.nome_no_tenant || row.cliente?.nome || 'Cliente';
}

function getClientPhone(row) {
  return row.cliente?.telefone || '';
}

function hasInternalAudienceMarker(row = {}) {
  const client = row.cliente || {};
  const values = [
    ...(Array.isArray(row.internal_user_roles) ? row.internal_user_roles : []),
    row.metadata?.tipo_usuario,
    row.metadata?.tipo_usuario_operacional,
    row.metadata?.role,
    row.metadata?.user_role,
    row.metadata?.owner_role,
    client.metadata?.tipo_usuario,
    client.metadata?.tipo_usuario_operacional,
    client.metadata?.role,
    client.metadata?.user_role,
    client.metadata?.owner_role
  ].filter(Boolean);

  return values.some((role) => INTERNAL_TENANT_ROLES.has(String(role)));
}

function normalizeAudienceRow(row, criteria = {}, now = new Date()) {
  const exclusions = [];
  const client = row.cliente || {};
  const histories = Array.isArray(row.historico) ? row.historico.filter((item) => !item.deleted_at) : [];
  const appointments = Array.isArray(row.agendamentos) ? row.agendamentos.filter((item) => !item.deleted_at) : [];
  const futureAppointments = appointments.filter((item) => (
    FUTURE_APPOINTMENT_STATUSES.has(item.status)
    && new Date(item.data_inicio) > now
  ));

  let normalizedPhone = null;
  try {
    normalizedPhone = normalizePhoneToE164(getClientPhone(row));
  } catch (_) {
    exclusions.push('telefone_invalido');
  }

  if (!client.id) exclusions.push('cliente_invalido');
  if (hasInternalAudienceMarker(row)) exclusions.push('usuario_interno_tenant');
  if (!client.ativo || client.deleted_at || row.status !== 'ativo' || row.ativo === false) exclusions.push('cliente_inativo');
  if (!getClientPhone(row)) exclusions.push('sem_telefone');
  if (row.aceita_campanhas === false || row.metadata?.opt_out_whatsapp === true || row.metadata?.permite_marketing === false) exclusions.push('sem_consentimento');
  if (row.status === 'bloqueado' || row.metadata?.bloqueado_comunicacao === true) exclusions.push('bloqueado');

  const completed = histories.filter((item) => item.status === 'concluido');
  const noShows = histories.filter((item) => item.status === 'no_show');
  const lastCompleted = completed
    .map((item) => new Date(item.data_atendimento))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((left, right) => right - left)[0] || null;
  const inactiveDays = lastCompleted ? Math.floor((now - lastCompleted) / 86_400_000) : null;

  if (criteria.mode === 'manual' && Array.isArray(criteria.client_ids) && !criteria.client_ids.includes(client.id)) exclusions.push('fora_da_selecao_manual');
  if (criteria.has_future_appointment === true && futureAppointments.length === 0) exclusions.push('sem_agendamento_futuro');
  if (criteria.no_future_appointment === true && futureAppointments.length > 0) exclusions.push('possui_agendamento_futuro');
  if (criteria.inactive_days && (inactiveDays === null || inactiveDays < Number(criteria.inactive_days))) exclusions.push('nao_inativo_no_periodo');
  if (criteria.recurring === true && completed.length < Number(criteria.min_completed || 2)) exclusions.push('nao_recorrente');
  if (criteria.new_client === true && completed.length > 0) exclusions.push('nao_e_novo');
  if (criteria.has_no_show === true && noShows.length === 0) exclusions.push('sem_no_show');
  if (criteria.birthday_month === true) {
    const month = client.data_nascimento ? new Date(`${client.data_nascimento}T12:00:00Z`).getUTCMonth() : -1;
    if (month !== now.getMonth()) exclusions.push('fora_mes_aniversario');
  }

  return {
    cliente_id: client.id,
    nome: getClientName(row),
    telefone: normalizedPhone || getClientPhone(row),
    email: client.email || null,
    eligible: exclusions.length === 0,
    exclusions,
    stats: {
      completed_count: completed.length,
      no_show_count: noShows.length,
      future_appointments: futureAppointments.length,
      inactive_days: inactiveDays
    },
    internal_user_roles: row.internal_user_roles || [],
    raw: row
  };
}

function normalizeSaasAudienceRow(user, criteria = {}) {
  const exclusions = [];
  if (!user.id) exclusions.push('usuario_invalido');
  if (!user.ativo || user.deleted_at) exclusions.push('usuario_inativo');
  if (!PLATFORM_USER_ROLES.has(user.tipo_usuario)) exclusions.push('perfil_nao_permitido');
  if (Array.isArray(criteria.roles) && criteria.roles.length && !criteria.roles.includes(user.tipo_usuario)) exclusions.push('fora_do_perfil');

  let normalizedPhone = null;
  try {
    normalizedPhone = user.telefone ? normalizePhoneToE164(user.telefone) : null;
  } catch (_) {
    exclusions.push('telefone_invalido');
  }

  if (!user.email && !user.telefone) exclusions.push('sem_destino');

  return {
    usuario_id: user.id,
    nome: user.nome || 'Usuario',
    telefone: normalizedPhone || user.telefone || null,
    email: user.email || null,
    tipo_usuario: user.tipo_usuario,
    eligible: exclusions.length === 0,
    exclusions,
    stats: {},
    raw: user
  };
}

async function estimate(tenantId, campaignOrInput) {
  const criteria = campaignOrInput.criterios_segmentacao || campaignOrInput.publico_alvo || {};
  const origin = resolveCampaignOrigin(campaignOrInput);
  const audienceType = resolveAudienceType(campaignOrInput, origin);

  if (audienceType === 'usuarios_saas') {
    const base = await repository.listSaasUsers(criteria);
    const rows = base.map((row) => normalizeSaasAudienceRow(row, criteria));
    const excludedByReason = {};
    rows.forEach((row) => {
      row.exclusions.forEach((reason) => {
        excludedByReason[reason] = (excludedByReason[reason] || 0) + 1;
      });
    });

    return {
      found: rows.length,
      eligible: rows.filter((row) => row.eligible).length,
      excluded: rows.filter((row) => !row.eligible).length,
      excluded_by_reason: excludedByReason,
      sample: rows.slice(0, 12).map(({ raw, ...item }) => item),
      rows
    };
  }

  const base = await repository.listAudienceBase(tenantId);
  const rows = base.map((row) => normalizeAudienceRow(row, criteria));
  const excludedByReason = {};
  rows.forEach((row) => {
    row.exclusions.forEach((reason) => {
      excludedByReason[reason] = (excludedByReason[reason] || 0) + 1;
    });
  });

  return {
    found: rows.length,
    eligible: rows.filter((row) => row.eligible).length,
    excluded: rows.filter((row) => !row.eligible).length,
    excluded_by_reason: excludedByReason,
    sample: rows.slice(0, 12).map(({ raw, ...item }) => item),
    rows
  };
}

function resolveDynamicValue(variable, campaign, recipient, coupon) {
  const tenantName = campaign.tenant?.nome_fantasia || campaign.metadata?.tenant_name || APP_BRAND.appName;
  const couponValue = coupon?.codigo || '';
  const commercialFields = buildCampaignCommercialFields(campaign, coupon);
  const map = {
    nome_cliente: recipient.nome,
    telefone: recipient.telefone,
    nome_salao: tenantName,
    nome_empresa: tenantName,
    desconto: commercialFields.desconto,
    valor_promocional: commercialFields.valor_promocional,
    valor_especial: commercialFields.valor_promocional,
    brinde: commercialFields.brinde,
    beneficios_campanha: commercialFields.beneficios_campanha,
    vigencia_campanha: commercialFields.vigencia_campanha,
    codigo_cupom: couponValue,
    validade_cupom: coupon?.data_fim ? new Date(`${coupon.data_fim}T12:00:00Z`).toLocaleDateString('pt-BR') : '',
    validade_promocao: commercialFields.validade_promocao,
    link_agendamento: campaign.metadata?.booking_url || '',
    link_campanha: campaign.metadata?.booking_url || ''
  };
  return map[variable] || '';
}

function resolveParams(template, campaign, recipient, coupon, overrideParams = {}) {
  const definitions = {
    ...(campaign.parametros_template || {}),
    ...(overrideParams || {})
  };

  return (template.variaveis || []).reduce((params, variable) => {
    const definition = definitions[variable];
    if (definition && typeof definition === 'object') {
      if (definition.source === 'fixed') {
        params[variable] = definition.value ?? '';
        return params;
      }
      if (definition.source === 'dynamic' && definition.field) {
        params[variable] = resolveDynamicValue(definition.field, campaign, recipient, coupon);
        return params;
      }
    }

    if (definition !== undefined && typeof definition !== 'object') {
      params[variable] = definition;
      return params;
    }

    params[variable] = resolveDynamicValue(variable, campaign, recipient, coupon);
    return params;
  }, {});
}

function firstFilled(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== '');
}

function rawParamValue(params = {}, key) {
  const value = params[key];
  if (value && typeof value === 'object' && value.source === 'fixed') return value.value;
  if (value !== undefined && typeof value !== 'object') return value;
  return null;
}

function parseNumberValue(value) {
  const normalized = String(value || '')
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDatePtBr(value) {
  if (!value) return '';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR');
}

function formatCurrencyPtBr(value) {
  if (value === undefined || value === null || String(value).trim() === '') return '';
  const parsed = parseNumberValue(value);
  if (!parsed) return '';
  return parsed.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }).replace(/\u00a0/g, ' ');
}

function formatDiscount(value) {
  if (value === undefined || value === null || String(value).trim() === '') return '';
  const parsed = parseNumberValue(value);
  if (!parsed) return '';
  return `${parsed.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;
}

function buildCampaignCommercialFields(campaign = {}, coupon = null) {
  const metadata = campaign.metadata || {};
  const approval = metadata.strategy?.approval || {};
  const params = campaign.parametros_template || {};
  const nature = metadata.natureza_campanha || resolveCampaignNature(campaign);
  const isPromotional = nature === 'promocional';

  const discount = isPromotional
    ? firstFilled(rawParamValue(params, 'desconto'), campaign.desconto, approval.desconto, coupon?.percentual_desconto)
    : null;
  const promotionalValue = isPromotional
    ? firstFilled(rawParamValue(params, 'valor_promocional'), rawParamValue(params, 'valor_especial'), campaign.valor_promocional, approval.valor_promocional, coupon?.valor_desconto)
    : null;
  const gift = isPromotional
    ? firstFilled(rawParamValue(params, 'brinde'), campaign.brinde, approval.brinde)
    : null;

  const formattedDiscount = formatDiscount(discount);
  const formattedPromotionalValue = String(promotionalValue || '').trim().startsWith('R$')
    ? String(promotionalValue).trim()
    : formatCurrencyPtBr(promotionalValue);
  const formattedGift = gift ? String(gift).trim() : '';

  const benefitLines = [
    formattedDiscount ? `Desconto: ${formattedDiscount}` : '',
    formattedPromotionalValue ? `Valor promocional: ${formattedPromotionalValue}` : '',
    formattedGift ? `Brinde: ${formattedGift}` : ''
  ].filter(Boolean);

  const startDate = formatDatePtBr(campaign.data_inicio || metadata.data_inicio || approval.data_inicial || coupon?.data_inicio);
  const endDate = formatDatePtBr(campaign.data_fim || metadata.data_fim || approval.data_final || coupon?.data_fim);
  const validity = startDate && endDate
    ? `Oferta valida de ${startDate} ate ${endDate}.`
    : startDate
      ? `Oferta disponivel a partir de ${startDate}.`
      : endDate
        ? `Oferta valida ate ${endDate}.`
        : '';

  return {
    desconto: formattedDiscount,
    valor_promocional: formattedPromotionalValue,
    valor_especial: formattedPromotionalValue,
    brinde: formattedGift,
    beneficios_campanha: benefitLines.join('\n'),
    vigencia_campanha: validity,
    validade_promocao: endDate
  };
}

function isEmptyTemplateValue(value) {
  return value === null || value === undefined || String(value).trim() === '';
}

function removeEmptyOptionalBlocks(content, variables, params) {
  const optionalVariables = new Set([
    'desconto',
    'valor_promocional',
    'valor_especial',
    'brinde',
    'beneficios_campanha',
    'vigencia_campanha',
    'validade_promocao',
    'validade_cupom'
  ]);

  return (variables || []).reduce((text, variable, index) => {
    if (!optionalVariables.has(variable) || !isEmptyTemplateValue(params[variable])) return text;
    const placeholder = `\\{\\{\\s*${index + 1}\\s*\\}\\}`;
    const labelAndPlaceholder = new RegExp(`^\\s*[^\\r\\n{}]*:\\s*\\r?\\n\\s*${placeholder}\\s*(?:\\r?\\n)?`, 'gmi');
    const placeholderLine = new RegExp(`^\\s*${placeholder}\\s*(?:\\r?\\n)?`, 'gmi');
    return text.replace(labelAndPlaceholder, '').replace(placeholderLine, '');
  }, String(content || ''));
}

function renderTemplate(content, variables, params) {
  const preparedContent = removeEmptyOptionalBlocks(content, variables, params);
  return preparedContent.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, position) => {
    const variable = variables[Number(position) - 1];
    const value = variable ? params[variable] : '';
    return value === null || value === undefined ? '' : String(value);
  }).replace(/[ \t]+\r?\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function getTemplateProviderVariableOrder(template) {
  const metadataMapping = template?.metadata?.provider_variable_mapping;

  if (Array.isArray(metadataMapping)) {
    return metadataMapping.map((variable) => String(variable || '').trim()).filter(Boolean);
  }

  if (metadataMapping && typeof metadataMapping === 'object') {
    return Object.entries(metadataMapping)
      .sort(([, left], [, right]) => Number(left) - Number(right))
      .map(([variable]) => variable)
      .filter(Boolean);
  }

  return template?.variaveis || [];
}

function providerVariableMapping(template) {
  return getTemplateProviderVariableOrder(template).reduce((mapping, variable, index) => ({
    ...mapping,
    [variable]: index + 1
  }), {});
}

function providerParams(template, params) {
  return getTemplateProviderVariableOrder(template).map((variable) => {
    const value = params[variable];
    return value === undefined || value === null ? '' : String(value);
  });
}

async function preview(tenantId, id, input = {}) {
  const campaign = await get(tenantId, id);
  const campaignMessages = ['gerando_mensagens', 'em_processamento', 'concluida'].includes(campaign.status)
    || ['EM_PROCESSAMENTO', 'CONCLUIDO'].includes(campaign.metadata?.status_processamento || '')
    ? await repository.listCampaignMessages(tenantId, id)
    : [];
  const frozenMessage = campaignMessages.find((message) => message.conteudo);
  if (frozenMessage) {
    return {
      template: campaign.template || null,
      recipient: {
        cliente_id: frozenMessage.cliente_id || null,
        nome: frozenMessage.cliente?.nome || '[Nome do cliente]',
        telefone: maskPhone(frozenMessage.telefone_destino)
      },
      params: frozenMessage.payload?.params || {},
      provider_params: frozenMessage.payload?.provider_params || [],
      conteudo: frozenMessage.conteudo,
      creates_queue: false,
      preview_source: 'mensagens_whatsapp'
    };
  }

  const template = normalizeTemplate(await repository.getTemplate(tenantId, campaign.template_id));
  if (!template) throw notFound('Template de campanha nao encontrado.');
  const coupon = await repository.getCoupon(tenantId, campaign.metadata?.cupom_id);
  const previewCampaign = {
    ...campaign,
    data_inicio: input.data_inicio !== undefined ? input.data_inicio : campaign.data_inicio,
    data_fim: input.data_fim !== undefined ? input.data_fim : campaign.data_fim,
    parametros_template: {
      ...(campaign.parametros_template || {}),
      ...(input.parametros_template || {})
    },
    metadata: {
      ...(campaign.metadata || {}),
      strategy: {
        ...(campaign.metadata?.strategy || {}),
        approval: {
          ...(campaign.metadata?.strategy?.approval || {}),
          ...(input.metadata?.strategy?.approval || {})
        }
      }
    }
  };
  const audience = await estimate(tenantId, previewCampaign);
  const eligibleRows = audience.rows.filter((row) => row.eligible);
  const recipient = eligibleRows.find((row) => row.cliente_id === input.cliente_id)
    || eligibleRows[0]
    || { cliente_id: null, nome: '[Nome do cliente]', telefone: null, eligible: false, exclusions: ['sem_cliente_elegivel'] };
  const params = resolveParams(template, previewCampaign, recipient, coupon, input.parametros_template);

  return {
    template,
    recipient: {
      cliente_id: recipient.cliente_id || null,
      nome: recipient.nome,
      telefone: maskPhone(recipient.telefone)
    },
    params,
    provider_params: providerParams(template, params),
    conteudo: renderTemplate(template.conteudo, template.variaveis, params),
    creates_queue: false,
    preview_source: 'templates_mensagem',
    illustrative: eligibleRows.length === 0
  };
}

function assertCampaignReadyForGeneration(campaign, template, audience) {
  if (!campaign.nome) throw new AppError('Informe o nome da campanha.', 400, 'CAMPAIGN_NAME_REQUIRED');
  if (!template) throw new AppError('Selecione um template de campanha.', 400, 'CAMPAIGN_TEMPLATE_REQUIRED');
  if (template.canal !== 'whatsapp' || template.ativo !== true) throw new AppError('Template WhatsApp ativo e obrigatorio.', 400, 'CAMPAIGN_TEMPLATE_INVALID');
  if (!env.whatsappDryRun) {
    if (!template.aprovado_provider || !template.provider_template_name || !template.language) {
      throw new AppError('Envio real exige template aprovado na Meta.', 400, 'CAMPAIGN_TEMPLATE_NOT_APPROVED');
    }
  }
  if (audience.eligible < 1) throw new AppError('Nenhum cliente elegivel para a campanha.', 400, 'CAMPAIGN_AUDIENCE_EMPTY');
}

function cooldownSince(days) {
  const date = new Date();
  date.setDate(date.getDate() - Number(days || DEFAULT_COMMERCIAL_COOLDOWN_DAYS));
  return date.toISOString();
}

function applyCommercialCooldown(audience, recentMessages = []) {
  const recentByClient = new Map();
  recentMessages.forEach((message) => {
    if (message.cliente_id && !recentByClient.has(message.cliente_id)) {
      recentByClient.set(message.cliente_id, message);
    }
  });

  return {
    ...audience,
    rows: audience.rows.map((row) => {
      if (!row.eligible || !recentByClient.has(row.cliente_id)) return row;
      return {
        ...row,
        eligible: false,
        exclusions: [...row.exclusions, 'cooldown_comercial']
      };
    })
  };
}

function summarizeAudience(rows) {
  const excludedByReason = {};
  rows.forEach((row) => {
    row.exclusions.forEach((reason) => {
      excludedByReason[reason] = (excludedByReason[reason] || 0) + 1;
    });
  });
  return {
    found: rows.length,
    eligible: rows.filter((row) => row.eligible).length,
    excluded: rows.filter((row) => !row.eligible).length,
    excluded_by_reason: excludedByReason
  };
}

async function generateMessages(tenantId, id, { scheduledFor = null } = {}) {
  let campaign = await get(tenantId, id);
  if (TERMINAL_STATUSES.has(campaign.status)) {
    throw new AppError('Campanha em status terminal nao pode ser iniciada.', 409, 'CAMPAIGN_TERMINAL');
  }
  if (campaign.metadata?.requires_tenant_approval === true && campaign.metadata?.lifecycle_stage !== 'approved') {
    throw new AppError('Campanha sugerida exige aprovacao e parametrizacao do tenant antes da execucao.', 400, 'CAMPAIGN_APPROVAL_REQUIRED');
  }
  const coupon = await repository.getCoupon(tenantId, campaign.metadata?.cupom_id);
  assertActivationRules(campaign, coupon);

  if (campaign.metadata?.execution_mode === 'tenant_assisted') {
    return normalizeCampaign(await repository.updateCampaign(tenantId, id, {
      status: 'pronta',
      metadata: {
        ...(campaign.metadata || {}),
        status_processamento: 'CONCLUIDO',
        status_campanha: commercialStatusFor({
          lifecycleStage: campaign.metadata?.lifecycle_stage,
          dataInicio: campaign.data_inicio || campaign.metadata?.data_inicio,
          dataFim: campaign.data_fim || campaign.metadata?.data_fim,
          legacyStatus: 'pronta'
        }),
        lifecycle_stage: 'prepared_for_manual_delivery',
        prepared_for_manual_delivery_at: new Date().toISOString(),
        strategy: {
          ...(campaign.metadata?.strategy || {}),
          execution: {
            ...(campaign.metadata?.strategy?.execution || {}),
            mode: 'tenant_assisted',
            prepared_at: new Date().toISOString(),
            technical_delivery_status: 'not_applicable_manual_delivery'
          }
        }
      },
      updated_at: new Date().toISOString()
    }));
  }

  const template = normalizeTemplate(await repository.getTemplate(tenantId, campaign.template_id));
  if (campaign.metadata?.tipo_publico !== 'clientes') {
    throw new AppError('Campanhas para usuarios SaaS usam fluxo de plataforma separado.', 400, 'CAMPAIGN_PLATFORM_AUDIENCE_UNSUPPORTED');
  }

  let audience = await estimate(tenantId, campaign);
  if (['promocional', 'relacionamento'].includes(campaign.metadata?.natureza_campanha)) {
    const eligibleClientIds = audience.rows.filter((row) => row.eligible).map((row) => row.cliente_id).filter(Boolean);
    const recentMessages = await repository.listRecentCommercialMessages(
      tenantId,
      eligibleClientIds,
      cooldownSince(campaign.metadata?.cooldown_comercial_dias)
    );
    audience = applyCommercialCooldown(audience, recentMessages);
    const summary = summarizeAudience(audience.rows);
    audience = { ...audience, ...summary };
  }
  assertCampaignReadyForGeneration(campaign, template, audience);

  campaign = await repository.updateCampaign(tenantId, id, {
    status: 'gerando_mensagens',
    iniciada_em: new Date().toISOString(),
    total_destinatarios: audience.eligible,
    metadata: {
      ...(campaign.metadata || {}),
      status_processamento: 'EM_PROCESSAMENTO',
      status_campanha: commercialStatusFor({
        lifecycleStage: campaign.metadata?.lifecycle_stage,
        dataInicio: campaign.data_inicio || campaign.metadata?.data_inicio,
        dataFim: campaign.data_fim || campaign.metadata?.data_fim,
        legacyStatus: 'em_processamento'
      })
    },
    updated_at: new Date().toISOString()
  });

  let generated = 0;
  for (const recipient of audience.rows.filter((row) => row.eligible)) {
    const params = resolveParams(template, campaign, recipient, coupon);
    const content = renderTemplate(template.conteudo, template.variaveis, params);
    const idempotencyKey = `${tenantId}:${id}:${recipient.cliente_id}:${template.id}`;
    const send = await repository.createCampaignSend({
      tenant_id: tenantId,
      campanha_id: id,
      cliente_id: recipient.cliente_id,
      template_id: template.id,
      status: scheduledFor ? 'agendado' : 'pendente',
      agendado_para: scheduledFor,
      metadata: { idempotency_key: idempotencyKey, params }
    });

    const message = await repository.createWhatsAppCampaignMessage({
      tenant_id: tenantId,
      cliente_id: recipient.cliente_id,
      campanha_id: id,
      campanha_envio_id: send?.id || null,
      telefone_destino: recipient.telefone,
      direcao: 'saida',
      template_nome: template.nome,
      conteudo: content,
      tipo_evento: 'campaign.message',
      provider: 'whatsapp_mysaas',
      status_envio: scheduledFor ? 'agendado' : 'pendente',
      idempotency_key: idempotencyKey,
      agendado_para: scheduledFor,
      payload: {
        event_type: 'campaign.message',
        recipient_type: 'client',
        natureza_campanha: campaign.metadata?.natureza_campanha,
        estrategia_envio: campaign.metadata?.estrategia_envio,
        template_source: 'templates_mensagem',
        template_id: template.id,
        provider_template_name: template.provider_template_name || template.nome,
        language: template.language || 'pt_BR',
        provider_approved: template.aprovado_provider === true,
        provider_parameter_format: 'positional',
        provider_params: providerParams(template, params),
        provider_variable_mapping: providerVariableMapping(template),
        params,
        campaign_id: id,
        campaign_tracking_token: campaign.tracking_token,
        coupon_id: coupon?.id || null,
        priority: 'low',
        actions: [{
          id: 'schedule_campaign',
          label: 'Agendar agora',
          action_type: 'open_booking',
          target: campaign.metadata?.booking_url || null
        }]
      }
    });

    if (send || message) generated += 1;
  }

  return refreshMetrics(tenantId, id, {
    status: 'em_processamento',
    total_destinatarios: audience.eligible,
    total_geradas: generated,
    metadata: {
      ...(campaign.metadata || {}),
      status_processamento: 'CONCLUIDO',
      status_campanha: commercialStatusFor({
        lifecycleStage: campaign.metadata?.lifecycle_stage,
        dataInicio: campaign.data_inicio || campaign.metadata?.data_inicio,
        dataFim: campaign.data_fim || campaign.metadata?.data_fim,
        legacyStatus: 'em_processamento'
      })
    }
  });
}

async function start(tenantId, id) {
  return generateMessages(tenantId, id);
}

async function schedule(tenantId, id, input = {}) {
  const campaign = await get(tenantId, id);
  const scheduledFor = input.agendada_para || campaign.agendada_para;
  if (!scheduledFor || new Date(scheduledFor) <= new Date()) {
    throw new AppError('Informe uma data futura para agendar a campanha.', 400, 'CAMPAIGN_SCHEDULE_INVALID');
  }
  const coupon = await repository.getCoupon(tenantId, campaign.metadata?.cupom_id);
  assertActivationRules(campaign, coupon);
  return normalizeCampaign(await repository.updateCampaign(tenantId, id, {
    status: 'agendada',
    agendada_para: scheduledFor,
    metadata: {
      ...(campaign.metadata || {}),
      status_campanha: 'AGENDADA',
      status_processamento: campaign.metadata?.status_processamento || 'PENDENTE'
    },
    updated_at: new Date().toISOString()
  }));
}

async function cancel(tenantId, id) {
  const current = await get(tenantId, id);
  const cancelled = await repository.cancelQueuedMessages(tenantId, id);
  const campaign = await repository.updateCampaign(tenantId, id, {
    status: 'cancelada',
    cancelada_em: new Date().toISOString(),
    total_canceladas: cancelled.length,
    metadata: {
      ...(current.metadata || {}),
      status_campanha: 'ENCERRADA'
    },
    updated_at: new Date().toISOString()
  });
  return normalizeCampaign(campaign);
}

async function refreshMetrics(tenantId, id, patch = {}) {
  const messages = await repository.listCampaignMessages(tenantId, id);
  const totals = {
    total_processadas: messages.filter((item) => !['pendente', 'agendado', 'retry'].includes(item.status_envio)).length,
    total_enviadas: messages.filter((item) => ['enviado', 'entregue', 'lido'].includes(item.status_envio)).length,
    total_entregues: messages.filter((item) => ['entregue', 'lido'].includes(item.status_envio)).length,
    total_lidas: messages.filter((item) => item.status_envio === 'lido').length,
    total_falhas: messages.filter((item) => ['erro', 'falhou'].includes(item.status_envio)).length,
    total_canceladas: messages.filter((item) => item.status_envio === 'cancelado').length
  };

  const campaign = await repository.updateCampaign(tenantId, id, {
    ...totals,
    ...patch,
    updated_at: new Date().toISOString()
  });
  return normalizeCampaign(campaign);
}

async function metrics(tenantId, id) {
  const campaign = await refreshMetrics(tenantId, id);
  const messages = await repository.listCampaignMessages(tenantId, id);
  return {
    campaign,
    by_status: messages.reduce((acc, item) => {
      acc[item.status_envio] = (acc[item.status_envio] || 0) + 1;
      return acc;
    }, {})
  };
}

async function messages(tenantId, id) {
  const rows = await repository.listCampaignMessages(tenantId, id);
  return rows.map((row) => ({
    ...row,
    telefone_destino: maskPhone(row.telefone_destino),
    cliente: row.cliente ? {
      ...row.cliente,
      telefone: maskPhone(row.cliente.telefone)
    } : null
  }));
}

async function processScheduled({ limit = 25 } = {}) {
  const due = await repository.listDueScheduledCampaigns(limit);
  const results = [];
  for (const campaign of due) {
    try {
      results.push(await generateMessages(campaign.tenant_id, campaign.id));
    } catch (error) {
      await repository.updateCampaign(campaign.tenant_id, campaign.id, {
        metadata: {
          status_processamento: 'ERRO',
          scheduler_error: { message: error.message, code: error.code || null }
        },
        updated_at: new Date().toISOString()
      });
      results.push({ id: campaign.id, status_processamento: 'ERRO', error: error.message });
    }
  }
  return results;
}

function buildCampaignBookingUrl(slug, trackingToken, couponId = null) {
  if (!slug || !trackingToken) return null;
  const url = new URL(buildAppUrl(`/agendar/${slug}`));
  url.searchParams.set('campanha', trackingToken);
  if (couponId) url.searchParams.set('coupon', couponId);
  return url.toString();
}

function maskPhone(phone = '') {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length <= 4) return phone || null;
  return `${digits.slice(0, 4)}****${digits.slice(-4)}`;
}

async function createCoupon(context, input) {
  const coupon = await repository.createCoupon({
    tenant_id: context.tenantId,
    campanha_id: input.campanha_id || null,
    codigo: input.codigo.toUpperCase(),
    nome: input.nome || input.codigo.toUpperCase(),
    descricao: input.descricao || null,
    tipo_codigo: input.tipo_codigo,
    tipo_desconto: input.tipo_desconto,
    valor_desconto: input.valor_desconto ?? null,
    percentual_desconto: input.percentual_desconto ?? null,
    valor_minimo: input.valor_minimo ?? null,
    data_inicio: input.data_inicio || null,
    data_fim: input.data_fim || null,
    limite_uso: input.limite_uso ?? null,
    limite_usos_por_cliente: input.limite_usos_por_cliente ?? null,
    ativo: input.ativo !== false,
    metadata: input.metadata || {}
  }, input.servico_ids || []);
  return coupon;
}

module.exports = {
  list,
  get,
  create,
  suggestions,
  createFromSuggestion,
  update,
  approve,
  reject,
  meta,
  estimate,
  preview,
  start,
  schedule,
  cancel,
  metrics,
  messages,
  processScheduled,
  createCoupon,
  renderTemplate,
  resolveParams
};
