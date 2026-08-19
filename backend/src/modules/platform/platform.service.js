const platformRepository = require('./platform.repository');
const eventLogsService = require('../event-logs/eventLogs.service');
const { AppError } = require('../../utils/errors');
const env = require('../../config/env');

const APPOINTMENT_CONFIRMED_ACTIONS = [
  {
    id: 'reschedule',
    title: 'Reagendar',
    action_type: 'reschedule',
    route: '/reagendar',
    token_param: 'tk',
    source: 'bellory_operational_rule'
  },
  {
    id: 'cancel',
    title: 'Cancelar',
    action_type: 'cancel',
    route: '/acao_agendamento',
    command: 'cancelar',
    token_param: 'tk',
    source: 'bellory_operational_rule'
  }
];

const SUBSCRIPTION_TRANSITIONS = {
  trial: ['ativa', 'ativo', 'expirada', 'inadimplente', 'cancelada', 'suspensa'],
  ativo: ['inadimplente', 'suspensa', 'cancelada', 'pendente_pagamento', 'ativa'],
  ativa: ['inadimplente', 'suspensa', 'cancelada', 'pendente_pagamento', 'ativo'],
  expirada: ['ativa', 'ativo', 'trial', 'cancelada'],
  vencida: ['ativa', 'ativo', 'trial', 'cancelada'],
  inadimplente: ['ativa', 'ativo', 'suspensa', 'cancelada', 'pendente_pagamento'],
  suspensa: ['ativa', 'ativo', 'cancelada', 'inadimplente'],
  cancelada: ['ativa', 'ativo', 'trial'],
  pendente_pagamento: ['ativa', 'ativo', 'inadimplente', 'cancelada']
};

function toCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value || 0));
}

function normalizeTenant(row) {
  const assinatura = Array.isArray(row.assinaturas) ? row.assinaturas[0] : null;

  return {
    id: row.id,
    nome_fantasia: row.nome_fantasia,
    slug: row.slug,
    status: row.status,
    email: row.email,
    telefone: row.telefone,
    timezone: row.timezone,
    created_at: row.created_at,
    subscription: assinatura ? {
      id: assinatura.id,
      status: assinatura.status,
      valor_mensal: assinatura.valor_mensal,
      trial_ate: assinatura.trial_ate,
      plano: assinatura.plano?.nome || null
    } : null
  };
}

function mapSubscriptionStatusToTenant(status) {
  if (status === 'trial') return 'trial';
  if (status === 'ativo' || status === 'ativa') return 'ativo';
  if (status === 'suspensa') return 'suspenso';
  if (status === 'cancelada') return 'cancelado';
  return 'inadimplente';
}

function normalizeSubscription(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    tenant: row.tenant || null,
    plano_id: row.plano_id,
    plano: row.plano || null,
    status: row.status,
    data_inicio: row.data_inicio,
    data_fim: row.data_fim,
    trial_ate: row.trial_ate,
    proxima_renovacao: row.proxima_renovacao || null,
    expira_em: row.expira_em || null,
    bloqueio_motivo: row.bloqueio_motivo || null,
    status_pagamento: row.status_pagamento || 'pendente',
    valor_mensal: Number(row.valor_mensal || 0),
    origem_ultima_alteracao: row.origem_ultima_alteracao || null,
    ultima_alteracao_observacao: row.ultima_alteracao_observacao || null,
    alterado_por: row.alterado_por || null,
    metadata: row.metadata || {},
    ativo: row.ativo,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function assertTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) return;
  const allowed = SUBSCRIPTION_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw new AppError(
      'Transicao de assinatura invalida.',
      400,
      'SUBSCRIPTION_STATUS_TRANSITION_INVALID',
      { current_status: currentStatus, next_status: nextStatus, allowed }
    );
  }
}

async function writeSubscriptionHistory(context, before, after, { tipo, origem, observacao, metadata = {} }) {
  return platformRepository.createSubscriptionHistory({
    assinatura_id: before.id,
    tenant_id: before.tenant_id,
    status_anterior: before.status,
    status_novo: after.status,
    plano_anterior: before.plano_id,
    plano_novo: after.plano_id,
    trial_ate_anterior: before.trial_ate,
    trial_ate_novo: after.trial_ate,
    data_fim_anterior: before.data_fim,
    data_fim_novo: after.data_fim,
    proxima_renovacao_anterior: before.proxima_renovacao || null,
    proxima_renovacao_novo: after.proxima_renovacao || null,
    expira_em_anterior: before.expira_em || null,
    expira_em_novo: after.expira_em || null,
    origem,
    tipo_alteracao: tipo,
    usuario_id: context.userId,
    observacao,
    metadata
  });
}

async function updateTenantLifecycleStatus(subscription) {
  await platformRepository.updateTenantStatus(
    subscription.tenant_id,
    mapSubscriptionStatusToTenant(subscription.status)
  );
}

function extractTemplateVariables(content = '') {
  const variables = new Set();
  const regex = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;
  let match = regex.exec(content);

  while (match) {
    variables.add(match[1]);
    match = regex.exec(content);
  }

  return Array.from(variables).sort();
}

function extractTemplatePlaceholders(content = '') {
  return Array.from(String(content || '').matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g))
    .map((match) => match[1].trim())
    .filter(Boolean);
}

function normalizeVariables(variables = []) {
  return Array.from(new Set(
    (variables || [])
      .map((variable) => String(variable || '').trim())
      .filter(Boolean)
  ));
}

function validateProviderVariableMapping(metadata = {}, variables = []) {
  const mapping = metadata.provider_variable_mapping;
  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) {
    return;
  }

  const declaredVariables = variables || [];
  const expected = Object.fromEntries(declaredVariables.map((variable, index) => [variable, index + 1]));
  const invalidMapping = Object.entries(mapping).filter(([variable, position]) => (
    expected[variable] !== Number(position)
  ));

  if (invalidMapping.length || Object.keys(mapping).length !== declaredVariables.length) {
    throw new AppError(
      'Mapeamento de variaveis do provider inconsistente.',
      400,
      'COMMUNICATION_TEMPLATE_PROVIDER_MAPPING_INVALID',
      {
        expected,
        received: mapping
      }
    );
  }
}

function validateWhatsAppTemplateVariables(content, variables, metadata = {}) {
  const placeholders = extractTemplatePlaceholders(content);
  const namedPlaceholders = placeholders.filter((placeholder) => !/^\d+$/.test(placeholder));
  const positions = placeholders
    .filter((placeholder) => /^\d+$/.test(placeholder))
    .map((placeholder) => Number(placeholder));
  const uniquePositions = Array.from(new Set(positions)).sort((left, right) => left - right);
  const duplicatePositions = uniquePositions.filter((position) => (
    positions.filter((item) => item === position).length > 1
  ));
  const declaredVariables = normalizeVariables(variables);
  const expectedPositions = Array.from({ length: declaredVariables.length }, (_, index) => index + 1);
  const missingPositions = expectedPositions.filter((position) => !uniquePositions.includes(position));
  const positionsWithoutVariables = uniquePositions.filter((position) => position < 1 || position > declaredVariables.length);

  if (
    namedPlaceholders.length
    || duplicatePositions.length
    || missingPositions.length
    || positionsWithoutVariables.length
    || uniquePositions.length !== declaredVariables.length
  ) {
    throw new AppError(
      'Variaveis do template WhatsApp inconsistentes.',
      400,
      'COMMUNICATION_TEMPLATE_WHATSAPP_VARIABLES_INVALID',
      {
        named_placeholders: namedPlaceholders,
        duplicate_positions: duplicatePositions,
        missing_positions: missingPositions,
        positions_without_variables: positionsWithoutVariables,
        declared_variables: declaredVariables
      }
    );
  }

  validateProviderVariableMapping(metadata, declaredVariables);

  return declaredVariables;
}

function validateTemplateVariables(content, variables, channel = null, metadata = {}) {
  if (channel === 'whatsapp') {
    return validateWhatsAppTemplateVariables(content, variables, metadata);
  }

  const contentVariables = extractTemplateVariables(content);
  const declaredVariables = normalizeVariables(variables);
  const missingInDeclaration = contentVariables.filter((variable) => !declaredVariables.includes(variable));
  const unusedInContent = declaredVariables.filter((variable) => !contentVariables.includes(variable));

  if (missingInDeclaration.length || unusedInContent.length) {
    throw new AppError(
      'Variaveis do template inconsistentes.',
      400,
      'COMMUNICATION_TEMPLATE_VARIABLES_INVALID',
      {
        missing_in_variaveis: missingInDeclaration,
        unused_in_conteudo: unusedInContent
      }
    );
  }

  return declaredVariables;
}

function assertAppointmentConfirmedOperationalTemplate({ name, content, metadata = {} }) {
  if (name !== 'appointment_confirmed') return;

  const missingLabels = [
    /reagendar/i.test(content || '') ? '' : 'Reagendar',
    /cancelar/i.test(content || '') ? '' : 'Cancelar'
  ].filter(Boolean);
  const actions = Array.isArray(metadata.actions) ? metadata.actions : [];
  const missingActions = ['reschedule', 'cancel'].filter((required) => (
    !actions.some((action) => action?.id === required || action?.action_type === required)
  ));

  if (missingLabels.length || missingActions.length) {
    throw new AppError(
      'Template appointment_confirmed deve conter as acoes Reagendar e Cancelar.',
      400,
      'APPOINTMENT_CONFIRMED_TEMPLATE_ACTIONS_REQUIRED',
      {
        missing_labels: missingLabels,
        missing_actions: missingActions
      }
    );
  }
}

function normalizeCommunicationTemplate(row) {
  const metadata = row.metadata || {};

  return {
    ...row,
    provider_template_name: metadata.provider_template_name || null,
    language: metadata.language || null,
    categoria_provider: metadata.categoria_provider || null,
    provider_parameter_format: metadata.provider_parameter_format || null,
    provider_variable_mapping: metadata.provider_variable_mapping || null,
    actions: metadata.actions || [],
    required_actions: metadata.required_actions || [],
    ultima_sincronizacao_provider: metadata.ultima_sincronizacao_provider || null,
    observacoes: metadata.observacoes || null,
    variaveis_detectadas: extractTemplateVariables(row.conteudo)
  };
}

function maskPhone(phone = '') {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length <= 4) return phone || null;
  return `${digits.slice(0, 4)}****${digits.slice(-4)}`;
}

function buildCommunicationTemplatePayload(input, current = null) {
  const content = Object.prototype.hasOwnProperty.call(input, 'conteudo')
    ? input.conteudo
    : current?.conteudo;
  const variables = Object.prototype.hasOwnProperty.call(input, 'variaveis')
    ? input.variaveis
    : current?.variaveis;
  const currentMetadata = current?.metadata || {};
  const templateName = Object.prototype.hasOwnProperty.call(input, 'nome')
    ? input.nome
    : current?.nome;

  const metadata = {
    ...currentMetadata
  };

  [
    'provider_template_name',
    'language',
    'categoria_provider',
    'provider_parameter_format',
    'provider_variable_mapping',
    'ultima_sincronizacao_provider',
    'observacoes'
  ].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      if (input[field] === null || input[field] === undefined || input[field] === '') {
        delete metadata[field];
      } else {
        metadata[field] = input[field];
      }
    }
  });

  const channel = Object.prototype.hasOwnProperty.call(input, 'canal')
    ? input.canal
    : current?.canal;
  const normalizedVariables = validateTemplateVariables(content || '', variables || [], channel, metadata);

  if (channel === 'whatsapp') {
    metadata.provider_parameter_format = 'positional';
    metadata.provider_variable_mapping = Object.fromEntries(
      normalizedVariables.map((variable, index) => [variable, index + 1])
    );
  }

  if (templateName === 'appointment_confirmed') {
    metadata.actions = APPOINTMENT_CONFIRMED_ACTIONS;
    metadata.required_actions = ['reschedule', 'cancel'];
    metadata.operational_rule = {
      ...(metadata.operational_rule || {}),
      event: 'appointment.confirmed',
      status_after_professional_confirmation: 'pendente_cliente',
      token_source: 'agendamentos.token_confirmacao',
      updated_by: '1.2.1.1_appointment_confirmed_actions'
    };
    assertAppointmentConfirmedOperationalTemplate({
      name: templateName,
      content: content || '',
      metadata
    });
  }

  const payload = {
    metadata,
    variaveis: normalizedVariables,
    updated_at: new Date().toISOString()
  };

  [
    'tenant_id',
    'nome',
    'canal',
    'tipo',
    'assunto',
    'conteudo',
    'aprovado_provider',
    'ativo'
  ].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      payload[field] = input[field];
    }
  });

  return payload;
}

async function getSummary(context) {
  const [metrics, tenants, campaigns, auditLogs] = await Promise.all([
    platformRepository.getSaasMetrics(),
    platformRepository.listTenants(8),
    platformRepository.listPlatformCampaigns(6),
    platformRepository.listAuditLogs(8)
  ]);

  return {
    context: {
      type: 'platform',
      role: 'MasterAdmin',
      userId: context.userId
    },
    kpis: {
      mrr: metrics.mrr,
      churnRate: metrics.churnRate,
      growthRate: metrics.growthRate,
      tenantsActive: metrics.tenants.active,
      tenantsTrial: metrics.tenants.trial,
      display: {
        mrr: toCurrency(metrics.mrr),
        churn: `${metrics.churnRate}%`,
        growth: `${metrics.growthRate}%`,
        tenantsActive: String(metrics.tenants.active),
        tenantsTrial: String(metrics.tenants.trial)
      }
    },
    metrics,
    tenants: tenants.map(normalizeTenant),
    campaigns,
    auditLogs,
    permissions: {
      platform: ['dashboard', 'tenants', 'subscriptions', 'global_campaigns', 'support', 'audit'],
      tenantOperational: 'support_mode_required',
      supportHeaders: ['x-support-mode', 'x-tenant-id', 'x-support-reason']
    }
  };
}

async function listTenants() {
  const tenants = await platformRepository.listTenants(50);
  return tenants.map(normalizeTenant);
}

async function listPlans() {
  return platformRepository.listPlans();
}

async function listSubscriptions(_context, filters = {}) {
  const subscriptions = await platformRepository.listSubscriptions(filters);
  return subscriptions.map(normalizeSubscription);
}

async function getSubscription(_context, id) {
  const subscription = await platformRepository.getSubscription(id);
  if (!subscription) {
    throw new AppError('Assinatura nao encontrada.', 404, 'SUBSCRIPTION_NOT_FOUND');
  }
  return normalizeSubscription(subscription);
}

async function listSubscriptionHistory(_context, id) {
  const subscription = await platformRepository.getSubscription(id);
  if (!subscription) {
    throw new AppError('Assinatura nao encontrada.', 404, 'SUBSCRIPTION_NOT_FOUND');
  }
  return platformRepository.listSubscriptionHistory(id);
}

async function updateSubscriptionStatus(context, id, input) {
  const current = await platformRepository.getSubscription(id);
  if (!current) {
    throw new AppError('Assinatura nao encontrada.', 404, 'SUBSCRIPTION_NOT_FOUND');
  }

  assertTransition(current.status, input.status);

  const updated = await platformRepository.updateSubscription(id, {
    status: input.status,
    data_fim: input.data_fim ?? current.data_fim,
    expira_em: input.expira_em ?? current.expira_em,
    proxima_renovacao: input.proxima_renovacao ?? current.proxima_renovacao,
    bloqueio_motivo: input.motivo_bloqueio ?? null,
    origem_ultima_alteracao: input.origem,
    alterado_por_usuario_id: context.userId,
    ultima_alteracao_observacao: input.observacao,
    ativo: input.status !== 'cancelada',
    metadata: {
      ...(current.metadata || {}),
      last_admin_change: {
        at: new Date().toISOString(),
        by: context.userId,
        origin: input.origem,
        type: 'status'
      }
    },
    updated_at: new Date().toISOString()
  });

  await updateTenantLifecycleStatus(updated);
  await writeSubscriptionHistory(context, current, updated, {
    tipo: 'status',
    origem: input.origem,
    observacao: input.observacao
  });

  return normalizeSubscription(updated);
}

async function updateSubscriptionPlan(context, id, input) {
  const current = await platformRepository.getSubscription(id);
  if (!current) {
    throw new AppError('Assinatura nao encontrada.', 404, 'SUBSCRIPTION_NOT_FOUND');
  }

  const plans = await platformRepository.listPlans();
  const plan = plans.find((item) => item.id === input.plano_id);
  if (!plan) {
    throw new AppError('Plano nao encontrado.', 404, 'PLAN_NOT_FOUND');
  }

  const origem = input.tipo_alteracao === 'upgrade'
    ? 'upgrade'
    : input.tipo_alteracao === 'downgrade' ? 'downgrade' : input.origem;
  const updated = await platformRepository.updateSubscription(id, {
    plano_id: plan.id,
    valor_mensal: plan.preco_mensal,
    origem_ultima_alteracao: origem,
    alterado_por_usuario_id: context.userId,
    ultima_alteracao_observacao: input.observacao,
    metadata: {
      ...(current.metadata || {}),
      last_plan_change: {
        at: new Date().toISOString(),
        by: context.userId,
        origin: origem,
        previous_plan_id: current.plano_id,
        new_plan_id: plan.id,
        change_type: input.tipo_alteracao
      }
    },
    updated_at: new Date().toISOString()
  });

  await writeSubscriptionHistory(context, current, updated, {
    tipo: input.tipo_alteracao,
    origem,
    observacao: input.observacao
  });

  return normalizeSubscription(updated);
}

async function extendSubscriptionTrial(context, id, input) {
  const current = await platformRepository.getSubscription(id);
  if (!current) {
    throw new AppError('Assinatura nao encontrada.', 404, 'SUBSCRIPTION_NOT_FOUND');
  }

  await platformRepository.extendSubscriptionTrial({
    subscriptionId: id,
    days: input.dias || null,
    trialUntil: input.trial_ate || null,
    userId: context.userId,
    observation: input.observacao
  });

  const updated = await platformRepository.getSubscription(id);
  if (!updated) {
    throw new AppError('Assinatura nao encontrada apos extensao de trial.', 500, 'SUBSCRIPTION_UPDATE_FAILED');
  }
  return normalizeSubscription(updated);
}

async function reactivateSubscription(context, id, input) {
  const current = await platformRepository.getSubscription(id);
  if (!current) {
    throw new AppError('Assinatura nao encontrada.', 404, 'SUBSCRIPTION_NOT_FOUND');
  }

  assertTransition(current.status, 'ativa');

  const payload = {
    status: 'ativa',
    bloqueio_motivo: null,
    expira_em: input.expira_em ?? current.expira_em,
    proxima_renovacao: input.proxima_renovacao ?? current.proxima_renovacao,
    origem_ultima_alteracao: 'masteradmin',
    alterado_por_usuario_id: context.userId,
    ultima_alteracao_observacao: input.observacao,
    ativo: true,
    metadata: {
      ...(current.metadata || {}),
      reactivated_at: new Date().toISOString(),
      reactivated_by: context.userId
    },
    updated_at: new Date().toISOString()
  };

  if (input.plano_id) {
    const plans = await platformRepository.listPlans();
    const plan = plans.find((item) => item.id === input.plano_id);
    if (!plan) throw new AppError('Plano nao encontrado.', 404, 'PLAN_NOT_FOUND');
    payload.plano_id = plan.id;
    payload.valor_mensal = plan.preco_mensal;
  }

  const updated = await platformRepository.updateSubscription(id, payload);

  await updateTenantLifecycleStatus(updated);
  await writeSubscriptionHistory(context, current, updated, {
    tipo: 'reactivation',
    origem: 'masteradmin',
    observacao: input.observacao
  });

  return normalizeSubscription(updated);
}

async function listAuditLogs() {
  return platformRepository.listAuditLogs(100);
}

async function listCampaigns() {
  return platformRepository.listPlatformCampaigns(100);
}

async function listCommunicationTemplates() {
  const templates = await platformRepository.listCommunicationTemplates(200);
  return templates.map(normalizeCommunicationTemplate);
}

function normalizeWhatsAppMessage(row) {
  return {
    id: row.id,
    tenant_id: row.tenant_id || null,
    cliente_id: row.cliente_id || null,
    profissional_id: row.profissional_id || null,
    agendamento_id: row.agendamento_id || null,
    telefone_destino: maskPhone(row.telefone_destino),
    direcao: row.direcao,
    template_nome: row.template_nome || null,
    tipo_evento: row.tipo_evento || row.payload?.event_type || null,
    provider: row.provider || row.payload?.provider || null,
    status_envio: row.status_envio,
    erro_envio: row.erro_envio || null,
    provider_message_id: row.provider_message_id || null,
    enviado_em: row.enviado_em || null,
    agendado_para: row.agendado_para || null,
    processado_em: row.processado_em || null,
    tentativas: row.tentativas || 0,
    proxima_tentativa_em: row.proxima_tentativa_em || null,
    ultimo_erro_codigo: row.ultimo_erro_codigo || null,
    ultimo_erro_mensagem: row.ultimo_erro_mensagem || null,
    idempotency_key: row.idempotency_key || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    payload: row.payload || {}
  };
}

async function listWhatsAppMessages() {
  const messages = await platformRepository.listWhatsAppMessages({ limit: 100 });
  return messages.map(normalizeWhatsAppMessage);
}

async function listWhatsAppQueue() {
  const messages = await platformRepository.listWhatsAppMessages({
    statuses: ['pendente', 'agendado', 'processando', 'retry', 'erro', 'falhou'],
    limit: 100
  });
  return messages.map(normalizeWhatsAppMessage);
}

function getCommunicationProviderStatus() {
  const hasAccessToken = Boolean(env.whatsappCloudAccessToken);
  const hasPhoneNumberId = Boolean(env.whatsappCloudPhoneNumberId);
  const dryRun = env.whatsappDryRun || !env.whatsappCloudApiEnabled || !hasAccessToken || !hasPhoneNumberId;

  return {
    provider: env.whatsappProvider,
    channel: 'whatsapp',
    mode: dryRun ? 'dry_run' : 'cloud_api',
    cloud_api_enabled: env.whatsappCloudApiEnabled,
    dry_run: dryRun,
    api_version: env.whatsappCloudApiVersion,
    credentials: {
      access_token_configured: hasAccessToken,
      phone_number_id_configured: hasPhoneNumberId,
      phone_number_id_masked: maskPhone(env.whatsappCloudPhoneNumberId)
    },
    required_env: [
      'WHATSAPP_PROVIDER',
      'WHATSAPP_CLOUD_API_ENABLED',
      'WHATSAPP_CLOUD_API_VERSION',
      'WHATSAPP_CLOUD_PHONE_NUMBER_ID',
      'WHATSAPP_CLOUD_ACCESS_TOKEN',
      'WHATSAPP_DRY_RUN',
      'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
      'WHATSAPP_QUEUE_ENABLED',
      'WHATSAPP_QUEUE_INTERVAL_MS',
      'WHATSAPP_MAX_ATTEMPTS'
    ],
    secrets_exposed: false,
    maintenance: 'read_only',
    notes: [
      'Credenciais completas nao sao expostas na interface.',
      'Com WHATSAPP_DRY_RUN=true, a exibicao da fila e mensagens continua disponivel.',
      'Envio real exige Cloud API habilitada, token e phone_number_id configurados.'
    ]
  };
}

async function createCampaign(context, input) {
  const campaign = await platformRepository.createPlatformCampaign({
    ...input,
    created_by_usuario_id: context.userId,
    status: 'rascunho'
  });

  await eventLogsService.logEvent('platform_campaign_created', {
    usuarioId: context.userId,
    origem: 'platform_admin',
    payload: {
      campaign_id: campaign.id,
      escopo: campaign.escopo,
      status: campaign.status
    }
  });

  return campaign;
}

async function updateCampaign(context, id, input) {
  const payload = { ...input };

  if (payload.status === 'publicada') {
    payload.published_at = new Date().toISOString();
  }

  const campaign = await platformRepository.updatePlatformCampaign(id, payload);

  await eventLogsService.logEvent('platform_campaign_updated', {
    usuarioId: context.userId,
    origem: 'platform_admin',
    payload: {
      campaign_id: campaign.id,
      escopo: campaign.escopo,
      status: campaign.status
    }
  });

  return campaign;
}

async function createCommunicationTemplate(context, input) {
  const template = await platformRepository.createCommunicationTemplate({
    ...buildCommunicationTemplatePayload(input),
    tenant_id: input.tenant_id || null,
    nome: input.nome,
    canal: input.canal || 'whatsapp',
    tipo: input.tipo,
    assunto: input.assunto || null,
    conteudo: input.conteudo,
    aprovado_provider: input.aprovado_provider === true,
    ativo: input.ativo !== false
  });

  await eventLogsService.logEvent('platform_communication_template_created', {
    usuarioId: context.userId,
    origem: 'platform_admin',
    payload: {
      template_id: template.id,
      tenant_id: template.tenant_id,
      nome: template.nome,
      canal: template.canal,
      tipo: template.tipo
    }
  });

  return normalizeCommunicationTemplate(template);
}

async function updateCommunicationTemplate(context, id, input) {
  const current = (await platformRepository.listCommunicationTemplates(500))
    .find((template) => template.id === id);

  if (!current) {
    throw new AppError('Template de comunicacao nao encontrado.', 404, 'COMMUNICATION_TEMPLATE_NOT_FOUND');
  }

  const template = await platformRepository.updateCommunicationTemplate(
    id,
    buildCommunicationTemplatePayload(input, current)
  );

  await eventLogsService.logEvent('platform_communication_template_updated', {
    usuarioId: context.userId,
    origem: 'platform_admin',
    payload: {
      template_id: template.id,
      tenant_id: template.tenant_id,
      nome: template.nome,
      canal: template.canal,
      tipo: template.tipo,
      ativo: template.ativo,
      aprovado_provider: template.aprovado_provider
    }
  });

  return normalizeCommunicationTemplate(template);
}

module.exports = {
  getSummary,
  listTenants,
  listPlans,
  listSubscriptions,
  getSubscription,
  listSubscriptionHistory,
  updateSubscriptionStatus,
  updateSubscriptionPlan,
  extendSubscriptionTrial,
  reactivateSubscription,
  listAuditLogs,
  listCampaigns,
  createCampaign,
  updateCampaign,
  listCommunicationTemplates,
  listWhatsAppMessages,
  listWhatsAppQueue,
  getCommunicationProviderStatus,
  createCommunicationTemplate,
  updateCommunicationTemplate
};
