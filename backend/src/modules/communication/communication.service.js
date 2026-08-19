const { onlyDigits, normalizePhoneToE164 } = require('../../utils/normalize');
const communicationRepository = require('./communication.repository');
const { buildWhatsAppMessage } = require('./whatsapp-templates');
const whatsappMySaaSProvider = require('./providers/whatsapp-mysaas.provider');
const { applyInstitutionalSignature } = require('./institutional-signature');
const env = require('../../config/env');
const { AppError } = require('../../utils/errors');

const SUPPORTED_APPOINTMENT_EVENTS = new Set([
  'appointment.created',
  'appointment.pending_attendant',
  'appointment.pending_client',
  'appointment.confirmed',
  'appointment.cancelled',
  'appointment.rescheduled',
  'appointment.reminder_24h',
  'appointment.reminder_2h',
  'appointment.pending_attendant_reminder_30m',
  'appointment.pending_attendant_reminder_60m',
  'appointment.pending_attendant_reminder_2h',
  'appointment.completed',
  'appointment.no_show'
]);

const CLIENT_EVENTS = new Set([
  'appointment.created',
  'appointment.pending_client',
  'appointment.confirmed',
  'appointment.cancelled',
  'appointment.rescheduled',
  'appointment.reminder_24h',
  'appointment.reminder_2h',
  'appointment.completed',
  'appointment.no_show'
]);

const SALON_EVENTS = new Set([
  'appointment.pending_attendant',
  'appointment.pending_attendant_reminder_30m',
  'appointment.pending_attendant_reminder_60m',
  'appointment.pending_attendant_reminder_2h'
]);

const ESTABLISHMENT_REQUIRED_TEMPLATES = new Set([
  'appointment_created',
  'appointment_pending_client',
  'appointment_confirmed',
  'appointment_rescheduled',
  'appointment_cancelled',
  'appointment_cancelled_by_attendant',
  'appointment_cancelled_by_client',
  'appointment_reminder_24h',
  'appointment_reminder_2h',
  'appointment_completed',
  'appointment_no_show_client',
  'appointment_cancelled_salon',
  'appointment_rescheduled_salon',
  'appointment_pending_attendant_reminder_2h'
]);

function isClientInitiated(payload = {}) {
  return payload?.metadata?.origem_status === 'link_operacional'
    || payload?.origem_status === 'link_operacional'
    || payload?.metadata?.confirmado_por === 'cliente_link';
}

function getRecipients(eventType, payload = {}) {
  const recipients = [];

  if (CLIENT_EVENTS.has(eventType)) {
    recipients.push('client');
  }

  if (SALON_EVENTS.has(eventType)) {
    recipients.push('salon');
  }

  if (['appointment.cancelled', 'appointment.rescheduled'].includes(eventType) && isClientInitiated(payload)) {
    recipients.push('salon');
  }

  return recipients;
}

async function getRecipientPhone(appointment, recipientType) {
  if (recipientType === 'client') {
    return appointment?.cliente?.telefone || null;
  }

  const directPhone = appointment?.profissional?.telefone
    || appointment?.profissional?.usuario?.telefone
    || null;

  if (directPhone) {
    return directPhone;
  }

  const operationalRecipient = await communicationRepository.findOperationalRecipientForAppointment(appointment);

  return operationalRecipient?.telefone || appointment?.tenant?.telefone || null;
}

function normalizeDestinationPhone(phone) {
  if (!phone) return null;

  try {
    return normalizePhoneToE164(phone);
  } catch (_) {
    const digits = onlyDigits(phone);
    return digits ? `+${digits}` : null;
  }
}

function resolveAttempt(eventType, payload = {}) {
  if (payload.attempt) return payload.attempt;
  if (eventType === 'appointment.pending_attendant') return 1;
  return null;
}

function resolvePriority(eventType, payload = {}) {
  if (payload.priority) return payload.priority;
  if (eventType === 'appointment.pending_attendant_reminder_2h') return 'high';
  return 'normal';
}

function resolveScheduledAt(eventPayload = {}) {
  return eventPayload.dispatch_at
    || eventPayload.agendado_para
    || eventPayload.queue_for
    || null;
}

function assertTemplateRequestsEstablishment(template, appointment) {
  if (!ESTABLISHMENT_REQUIRED_TEMPLATES.has(template?.nome)) return;

  const variables = Array.isArray(template.variaveis) ? template.variaveis : [];
  const requestsEstablishment = variables.includes('nome_estabelecimento') || variables.includes('nome_salao');
  if (requestsEstablishment) return;

  throw new AppError(
    'Template WhatsApp operacional elegivel nao solicita identificacao do estabelecimento.',
    422,
    'WHATSAPP_ESTABLISHMENT_NAME_REQUIRED',
    {
      template_id: template.id || null,
      template_name: template.nome || null,
      tenant_id: appointment?.tenant_id || null,
      appointment_id: appointment?.id || null,
      reason: 'eligible_template_missing_establishment_variable'
    }
  );
}

function buildIdempotencyKey({ appointment, eventType, recipientType, eventPayload = {} }) {
  const reminderType = eventPayload.reminder_type || '';
  const scheduledAt = resolveScheduledAt(eventPayload) || '';
  const attempt = resolveAttempt(eventType, eventPayload) || '';

  return [
    appointment.tenant_id,
    eventType,
    appointment.id,
    recipientType,
    reminderType,
    attempt,
    scheduledAt
  ].map((part) => String(part || '-')).join(':');
}

function getRetryDelayMs(attempts = 1) {
  const schedule = [60_000, 5 * 60_000, 15 * 60_000, 60 * 60_000];
  return schedule[Math.min(Math.max(Number(attempts || 1) - 1, 0), schedule.length - 1)];
}

function isRetryableProviderError(error = {}) {
  const code = String(error.code || '');
  const numericCode = Number(code);

  return [
    'ETIMEDOUT',
    'ECONNRESET',
    'ECONNREFUSED',
    'EAI_AGAIN',
    'FETCH_ERROR',
    'WHATSAPP_PROVIDER_TIMEOUT'
  ].includes(code)
    || numericCode === 408
    || numericCode === 429
    || numericCode >= 500;
}

function renderTemplateContent(template, params = {}) {
  return String(template || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const value = params[key];
    return value === null || value === undefined ? '' : String(value);
  });
}

function renderWhatsAppTemplateContent(template, params = {}, variables = []) {
  const orderedVariables = normalizeTemplateVariables(variables);

  return String(template || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const variableName = /^\d+$/.test(key)
      ? orderedVariables[Number(key) - 1]
      : key;
    const value = variableName ? params[variableName] : '';
    return value === null || value === undefined ? '' : String(value);
  });
}

function getTemplateProviderName(template) {
  return template?.metadata?.provider_template_name
    || template?.metadata?.providerTemplateName
    || template?.metadata?.whatsapp_template_name
    || template?.nome
    || null;
}

function getTemplateLanguage(template) {
  return template?.metadata?.language
    || template?.metadata?.language_code
    || template?.metadata?.locale
    || 'pt_BR';
}

function normalizeTemplateVariables(variables = []) {
  return Array.from(new Set(
    (Array.isArray(variables) ? variables : [])
      .map((variable) => String(variable || '').trim())
      .filter(Boolean)
  ));
}

function getTemplateProviderVariableOrder(template) {
  const metadataMapping = template?.metadata?.provider_variable_mapping;

  if (Array.isArray(metadataMapping)) {
    return normalizeTemplateVariables(metadataMapping);
  }

  if (metadataMapping && typeof metadataMapping === 'object') {
    return Object.entries(metadataMapping)
      .sort(([, left], [, right]) => Number(left) - Number(right))
      .map(([variable]) => variable)
      .filter(Boolean);
  }

  return normalizeTemplateVariables(template?.variaveis);
}

function buildProviderTemplateParams(template, params = {}) {
  return getTemplateProviderVariableOrder(template)
    .map((variable) => params[variable])
    .filter((value) => value !== null && value !== undefined && String(value) !== '');
}

function normalizeTemplateActions(actions = []) {
  if (!Array.isArray(actions)) return [];

  return actions
    .map((action) => ({
      id: String(action?.id || action?.action_type || '').trim(),
      title: String(action?.title || action?.label || '').trim(),
      action_type: String(action?.action_type || action?.id || '').trim(),
      route: action?.route ? String(action.route).trim() : null
    }))
    .filter((action) => action.id && action.action_type);
}

function actionMatches(required, action) {
  return action.id === required || action.action_type === required;
}

function assertAppointmentConfirmedTemplateIsOperational(template, renderedText = '') {
  if (template?.nome !== 'appointment_confirmed') return;

  const actions = normalizeTemplateActions(template.metadata?.actions);
  const missingActions = ['reschedule', 'cancel'].filter((required) => (
    !actions.some((action) => actionMatches(required, action))
  ));

  if (missingActions.length) {
    throw new AppError(
      'Template appointment_confirmed operacionalmente incompleto.',
      422,
      'APPOINTMENT_CONFIRMED_TEMPLATE_ACTIONS_REQUIRED',
      {
        template_id: template.id || null,
        missing_actions: missingActions
      }
    );
  }
}

function maskOperationalToken(token = '') {
  const value = String(token || '');
  if (value.length <= 10) return value ? '***' : '';
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function getAppointmentOperationalToken(appointment = {}) {
  return typeof appointment.token_confirmacao === 'string'
    ? appointment.token_confirmacao.trim()
    : '';
}

function buildAppointmentConfirmedProviderButtons(appointment, actions = []) {
  const token = getAppointmentOperationalToken(appointment);

  if (!token) {
    throw new AppError(
      'Agendamento confirmado sem token operacional para botoes WhatsApp.',
      422,
      'APPOINTMENT_OPERATIONAL_TOKEN_MISSING',
      {
        appointment_id: appointment.id || null,
        template_name: 'appointment_confirmed'
      }
    );
  }

  const definitions = [
    { id: 'reschedule', title: 'Reagendar', index: 0 },
    { id: 'cancel', title: 'Cancelar', index: 1 }
  ];

  return definitions.map((definition) => {
    const action = actions.find((item) => actionMatches(definition.id, item)) || {};
    return {
      id: action.id || definition.id,
      title: action.title || definition.title,
      action_type: action.action_type || definition.id,
      component_type: 'button',
      sub_type: 'url',
      index: definition.index,
      parameter_format: 'positional',
      parameter_value: token,
      parameter_masked: maskOperationalToken(token),
      has_dynamic_parameter: true
    };
  });
}

function buildProviderTemplateComponents(template, appointment, providerParams = [], actions = []) {
  if (template?.nome !== 'appointment_confirmed') {
    return null;
  }

  const buttons = buildAppointmentConfirmedProviderButtons(appointment, actions);

  return [
    {
      type: 'body',
      parameters: providerParams
    },
    ...buttons.map((button) => ({
      type: 'button',
      sub_type: button.sub_type,
      index: button.index,
      parameters: [button.parameter_value]
    }))
  ];
}

function buildActionsFromTemplateDefinitions(template, fallbackActions = []) {
  if (template?.nome !== 'appointment_confirmed') return fallbackActions;

  const definitions = normalizeTemplateActions(template.metadata?.actions);
  if (!definitions.length) return fallbackActions;

  return fallbackActions.map((fallbackAction) => {
    const definition = definitions.find((item) => (
      actionMatches(item.id, fallbackAction)
      || actionMatches(item.action_type, fallbackAction)
    ));

    return definition
      ? {
          ...fallbackAction,
          id: definition.id || fallbackAction.id,
          title: definition.title || fallbackAction.title,
          action_type: definition.action_type || fallbackAction.action_type,
          route: definition.route || fallbackAction.route || null,
          source: 'templates_mensagem'
        }
      : fallbackAction;
  });
}

function getProviderVariableMapping(template) {
  return getTemplateProviderVariableOrder(template).reduce((mapping, variable, index) => ({
    ...mapping,
    [variable]: index + 1
  }), {});
}

function hasForbiddenVisibleContent(text = '') {
  return [
    /http:\/\/127\.0\.0\.1/i,
    /cmd=/i,
    /tk=/i,
    /token=/i,
    /link_confirmar/i,
    /link_cancelar/i,
    /link_reagendar/i
  ].some((pattern) => pattern.test(text));
}

function withFallbackTemplateMetadata(message) {
  return {
    ...message,
    source: 'code_fallback',
    template_id: null,
    provider_template_name: message.template_name,
    language: 'pt_BR'
  };
}

function withClientInstitutionalSignature(message, recipientType) {
  if (!message || recipientType !== 'client') {
    return message;
  }

  return {
    ...message,
    text: applyInstitutionalSignature(message.text, 'whatsapp')
  };
}

function canSendRealProviderTemplate(log = {}) {
  return log.payload?.template_source === 'templates_mensagem'
    && log.payload?.provider_approved === true
    && Boolean(log.payload?.provider_template_name)
    && Boolean(log.payload?.language);
}

async function blockUnapprovedRealTemplate(log) {
  console.warn('[whatsapp-operational-debug] real WhatsApp send blocked: template not approved', {
    tenant_id: log.tenant_id || null,
    agendamento_id: log.agendamento_id || null,
    cliente_id: log.cliente_id || null,
    tipo_evento: log.tipo_evento || log.payload?.event_type || null,
    template_nome: log.template_nome || null,
    template_id: log.payload?.template_id || null,
    template_source: log.payload?.template_source || null,
    provider_template_name: log.payload?.provider_template_name || null,
    language: log.payload?.language || null,
    reason: whatsappMySaaSProvider.TEMPLATE_NOT_APPROVED_ERROR
  });

  return communicationRepository.updateWhatsAppMessageLog(log.id, {
    status_envio: 'erro',
    erro_envio: whatsappMySaaSProvider.TEMPLATE_NOT_APPROVED_ERROR,
    ultimo_erro_codigo: 'WHATSAPP_TEMPLATE_NOT_APPROVED',
    ultimo_erro_mensagem: whatsappMySaaSProvider.TEMPLATE_NOT_APPROVED_ERROR,
    updated_at: new Date().toISOString(),
    payload: {
      ...(log.payload || {}),
      provider_error: {
        code: 'WHATSAPP_TEMPLATE_NOT_APPROVED',
        message: whatsappMySaaSProvider.TEMPLATE_NOT_APPROVED_ERROR,
        blocked_before_provider: true
      }
    }
  });
}

async function resolveConfiguredTemplateMessage({ eventType, appointment, recipientType, fallbackMessage }) {
  const requireProviderApproval = false;
  const template = await communicationRepository.findActiveMessageTemplate({
    tenantId: appointment.tenant_id,
    names: [fallbackMessage.template_name, eventType],
    requireProviderApproval
  });

  if (!template) {
    console.warn('[whatsapp-operational-debug] templates_mensagem fallback to code template', {
      tenant_id: appointment.tenant_id,
      eventType,
      recipientType,
      template_name: fallbackMessage.template_name,
      requireProviderApproval
    });
    if (fallbackMessage.template_name === 'appointment_confirmed') {
      throw new AppError(
        'Template appointment_confirmed nao configurado para botoes WhatsApp.',
        422,
        'APPOINTMENT_CONFIRMED_TEMPLATE_ACTIONS_REQUIRED',
        {
          template_name: fallbackMessage.template_name,
          missing_template: true
        }
      );
    }
    return withFallbackTemplateMetadata(fallbackMessage);
  }

  assertTemplateRequestsEstablishment(template, appointment);

  const renderedText = renderWhatsAppTemplateContent(template.conteudo, fallbackMessage.params, template.variaveis);
  if (hasForbiddenVisibleContent(renderedText)) {
    console.warn('[whatsapp-operational-debug] templates_mensagem ignored due forbidden visible content', {
      tenant_id: appointment.tenant_id,
      eventType,
      recipientType,
      template_id: template.id,
      template_name: template.nome
    });
    if (template.nome === 'appointment_confirmed') {
      throw new AppError(
        'Template appointment_confirmed contem conteudo visivel incompativel com botoes dinamicos.',
        422,
        'APPOINTMENT_CONFIRMED_TEMPLATE_VISIBLE_CONTENT_INVALID',
        {
          template_id: template.id || null,
          template_name: template.nome
        }
      );
    }
    return withFallbackTemplateMetadata(fallbackMessage);
  }
  assertAppointmentConfirmedTemplateIsOperational(template, renderedText);
  const actions = buildActionsFromTemplateDefinitions(template, fallbackMessage.actions || []);
  const providerParams = buildProviderTemplateParams(template, fallbackMessage.params);
  const providerButtons = template.nome === 'appointment_confirmed'
    ? buildAppointmentConfirmedProviderButtons(appointment, actions)
    : [];

  return {
    ...fallbackMessage,
    source: 'templates_mensagem',
    template_id: template.id,
    template_name: template.nome,
    template: template.conteudo,
    text: renderedText,
    actions,
    provider_template_name: getTemplateProviderName(template),
    language: getTemplateLanguage(template),
    provider_approved: template.aprovado_provider === true,
    provider_parameter_format: 'positional',
    provider_variable_mapping: getProviderVariableMapping(template),
    provider_params: providerParams,
    provider_buttons: providerButtons,
    provider_components: buildProviderTemplateComponents(template, appointment, providerParams, actions)
  };
}

async function writeErroredLog({ eventType, appointment, recipientType, message, rawPhone, errorMessage, eventPayload = {} }) {
  const idempotencyKey = buildIdempotencyKey({
    appointment,
    eventType,
    recipientType,
    eventPayload
  });

  return communicationRepository.createWhatsAppMessageLog({
    tenant_id: appointment.tenant_id,
    cliente_id: appointment.cliente_id || null,
    profissional_id: appointment.profissional_id || null,
    agendamento_id: appointment.id,
    telefone_destino: rawPhone || 'indisponivel',
    direcao: 'saida',
    template_nome: message?.template_name || eventType,
    conteudo: message?.text || null,
    tipo_evento: eventType,
    provider: whatsappMySaaSProvider.PROVIDER_NAME,
    status_envio: 'erro',
    erro_envio: errorMessage,
    idempotency_key: idempotencyKey,
    agendado_para: resolveScheduledAt(eventPayload),
    ultimo_erro_codigo: 'WHATSAPP_RECIPIENT_PHONE_INVALID',
    ultimo_erro_mensagem: errorMessage,
    payload: {
      event_type: eventType,
      recipient_type: recipientType,
      idempotency_key: idempotencyKey,
      message,
      template_id: message?.template_id || null,
      template_source: message?.source || 'code_fallback',
      provider_template_name: message?.provider_template_name || message?.template_name || null,
      language: message?.language || 'pt_BR',
      provider_approved: message?.provider_approved === true,
      provider_parameter_format: message?.provider_parameter_format || null,
      provider_variable_mapping: message?.provider_variable_mapping || null,
      provider_params: message?.provider_params || null,
      provider_buttons: message?.provider_buttons || [],
      provider_components: message?.provider_components || null,
      error: errorMessage,
      attempt: resolveAttempt(eventType, eventPayload),
      priority: resolvePriority(eventType, eventPayload)
    }
  });
}

async function dispatchWhatsAppMessageLog(log) {
  if (!whatsappMySaaSProvider.shouldDryRun() && !canSendRealProviderTemplate(log)) {
    return blockUnapprovedRealTemplate(log);
  }

  const content = log.payload?.recipient_type === 'client'
    ? applyInstitutionalSignature(log.conteudo, 'whatsapp')
    : log.conteudo;

  try {
    const providerResult = await whatsappMySaaSProvider.sendOperationalMessage({
      to: log.telefone_destino,
      text: content,
      templateName: log.template_nome,
      providerTemplateName: log.payload?.provider_template_name || log.template_nome,
      language: log.payload?.language || 'pt_BR',
      params: log.payload?.params || {},
      providerParams: log.payload?.provider_params || null,
      providerComponents: log.payload?.provider_components || null,
      metadata: {
        event_type: log.tipo_evento || log.payload?.event_type || null,
        appointment_id: log.agendamento_id || null,
        recipient_type: log.payload?.recipient_type || null,
        attempt: log.payload?.attempt || null,
        priority: log.payload?.priority || 'normal',
        reminder_type: log.payload?.reminder_type || null,
        actions: log.payload?.actions || []
      },
      actions: log.payload?.actions || [],
      useTemplate: Boolean(log.payload?.template_source === 'templates_mensagem' && log.payload?.provider_template_name)
    });

    return communicationRepository.updateWhatsAppMessageLog(log.id, {
      conteudo: content,
      status_envio: 'enviado',
      provider_message_id: providerResult.provider_message_id,
      enviado_em: new Date().toISOString(),
      proxima_tentativa_em: null,
      ultimo_erro_codigo: null,
      ultimo_erro_mensagem: null,
      payload_provider: providerResult.provider_payload || {},
      updated_at: new Date().toISOString(),
      payload: {
        ...(log.payload || {}),
        provider_result: providerResult
      }
    });
  } catch (error) {
    const attempts = Number(log.tentativas || 1);
    const shouldRetry = isRetryableProviderError(error) && attempts < Math.max(1, env.whatsappMaxAttempts || 5);
    const nextRetryAt = shouldRetry
      ? new Date(Date.now() + getRetryDelayMs(attempts)).toISOString()
      : null;

    return communicationRepository.updateWhatsAppMessageLog(log.id, {
      conteudo: content,
      status_envio: shouldRetry ? 'retry' : 'erro',
      erro_envio: error.message,
      proxima_tentativa_em: nextRetryAt,
      ultimo_erro_codigo: error.code || 'WHATSAPP_PROVIDER_ERROR',
      ultimo_erro_mensagem: error.message,
      payload_provider: error.providerPayload || {},
      updated_at: new Date().toISOString(),
      payload: {
        ...(log.payload || {}),
        provider_error: {
          code: error.code || null,
          message: error.message,
          payload: error.providerPayload || null,
          retryable: shouldRetry,
          next_retry_at: nextRetryAt,
          attempts
        }
      }
    });
  }
}

async function sendPreparedWhatsAppMessage({ eventType, appointment, recipientType, message, phone, eventPayload = {} }) {
  console.log('[whatsapp-operational-debug] preparing WhatsApp queue log', {
    eventType,
    tenant_id: appointment.tenant_id,
    agendamento_id: appointment.id,
    recipientType,
    phone,
    template: message.template_name
  });

  const idempotencyKey = buildIdempotencyKey({
    appointment,
    eventType,
    recipientType,
    eventPayload
  });

  const existingLog = await communicationRepository.findExistingWhatsAppMessageLog({
    tenantId: appointment.tenant_id,
    appointmentId: appointment.id,
    eventType,
    recipientType,
    idempotencyKey
  });

  if (existingLog) {
    console.log('[whatsapp-operational-debug] duplicated WhatsApp event skipped', {
      eventType,
      agendamento_id: appointment.id,
      recipientType,
      existing_log_id: existingLog.id
    });
    return existingLog;
  }

  const log = await communicationRepository.createWhatsAppMessageLog({
    tenant_id: appointment.tenant_id,
    cliente_id: appointment.cliente_id || null,
    profissional_id: appointment.profissional_id || null,
    agendamento_id: appointment.id,
    telefone_destino: phone,
    direcao: 'saida',
    template_nome: message.template_name,
    conteudo: message.text,
    tipo_evento: eventType,
    provider: whatsappMySaaSProvider.PROVIDER_NAME,
    status_envio: resolveScheduledAt(eventPayload) ? 'agendado' : 'pendente',
    idempotency_key: idempotencyKey,
    agendado_para: resolveScheduledAt(eventPayload),
    payload: {
      event_type: eventType,
      recipient_type: recipientType,
      idempotency_key: idempotencyKey,
      params: message.params,
      links: message.links,
      actions: message.actions || [],
      template_id: message.template_id || null,
      template_source: message.source || 'code_fallback',
      provider_template_name: message.provider_template_name || message.template_name,
      language: message.language || 'pt_BR',
      provider_approved: message.provider_approved === true,
      provider_parameter_format: message.provider_parameter_format || null,
      provider_variable_mapping: message.provider_variable_mapping || null,
      provider_params: message.provider_params || null,
      provider_buttons: message.provider_buttons || [],
      provider_components: message.provider_components || null,
      operational_context: message.operational_context || null,
      attempt: resolveAttempt(eventType, eventPayload),
      priority: resolvePriority(eventType, eventPayload),
      reminder_type: eventPayload.reminder_type || null,
      provider: whatsappMySaaSProvider.PROVIDER_NAME
    }
  });

  console.log('[whatsapp-operational-debug] WhatsApp message queued', {
    eventType,
    agendamento_id: appointment.id,
    recipientType,
    log_id: log.id,
    status_envio: log.status_envio,
    idempotency_key: idempotencyKey
  });
  return log;
}

async function sendAppointmentEvent(eventType, context = {}) {
  console.log('[whatsapp-operational-debug] communication service received event', {
    eventType,
    tenantId: context.tenantId,
    appointment_id: context.payload?.appointment_id || context.payload?.agendamento_id || null
  });

  if (!SUPPORTED_APPOINTMENT_EVENTS.has(eventType)) {
    console.log('[whatsapp-operational-debug] unsupported appointment event ignored', { eventType });
    return [];
  }

  const payload = context.payload || {};
  const appointmentId = payload.appointment_id || payload.agendamento_id;
  if (!appointmentId) {
    console.warn('[whatsapp-operational-debug] appointment event without appointment_id ignored', {
      eventType,
      tenantId: context.tenantId
    });
    return [];
  }

  const appointment = payload.appointment
    || await communicationRepository.findAppointmentForCommunication(context.tenantId, appointmentId);

  if (!appointment) {
    console.warn('[whatsapp-operational-debug] appointment not found for communication', {
      eventType,
      tenantId: context.tenantId,
      appointmentId
    });
    return [];
  }

  const recipients = getRecipients(eventType, payload);
  console.log('[whatsapp-operational-debug] communication recipients resolved', {
    eventType,
    tenant_id: appointment.tenant_id,
    agendamento_id: appointment.id,
    recipients
  });

  const results = [];

  for (const recipientType of recipients) {
    const fallbackMessage = buildWhatsAppMessage(eventType, appointment, recipientType, payload);
    if (!fallbackMessage) continue;
    const resolvedMessage = await resolveConfiguredTemplateMessage({
      eventType,
      appointment,
      recipientType,
      fallbackMessage
    });
    const message = withClientInstitutionalSignature(resolvedMessage, recipientType);

    const rawPhone = await getRecipientPhone(appointment, recipientType);
    const phone = normalizeDestinationPhone(rawPhone);

    if (!phone) {
      console.warn('[whatsapp-operational-debug] recipient phone missing or invalid', {
        eventType,
        agendamento_id: appointment.id,
        recipientType,
        rawPhone
      });

      results.push(await writeErroredLog({
        eventType,
        appointment,
        recipientType,
        message,
        rawPhone,
        errorMessage: 'Destinatario sem telefone valido para WhatsApp.',
        eventPayload: payload
      }));
      continue;
    }

    results.push(await sendPreparedWhatsAppMessage({
      eventType,
      appointment,
      recipientType,
      message,
      phone,
      eventPayload: payload
    }));
  }

  return results;
}

async function processPendingWhatsAppMessages({ limit = 25 } = {}) {
  const pendingMessages = await communicationRepository.claimPendingWhatsAppMessages(limit);
  const results = [];

  for (const log of pendingMessages) {
    results.push(await dispatchWhatsAppMessageLog(log));
  }

  return results;
}

function mapMetaStatus(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'sent') return 'enviado';
  if (normalized === 'delivered') return 'entregue';
  if (normalized === 'read') return 'lido';
  if (normalized === 'failed') return 'erro';
  return null;
}

async function handleWhatsAppProviderWebhook(payload = {}) {
  const entries = Array.isArray(payload.entry) ? payload.entry : [];
  const results = [];

  for (const entry of entries) {
    const changes = Array.isArray(entry.changes) ? entry.changes : [];
    for (const change of changes) {
      const statuses = Array.isArray(change.value?.statuses) ? change.value.statuses : [];
      for (const statusEvent of statuses) {
        const providerMessageId = statusEvent.id || null;
        const statusEnvio = mapMetaStatus(statusEvent.status);
        if (!providerMessageId || !statusEnvio) continue;

        const error = Array.isArray(statusEvent.errors) ? statusEvent.errors[0] : null;
        const updatePayload = {
          status_envio: statusEnvio,
          erro_envio: error?.message || error?.title || null,
          ultimo_erro_codigo: error?.code ? String(error.code) : null,
          ultimo_erro_mensagem: error?.message || error?.title || null,
          updated_at: new Date().toISOString(),
          payload: {
            webhook_provider: 'meta',
            webhook_status: statusEvent
          }
        };
        if (statusEnvio === 'entregue' || statusEnvio === 'lido') {
          updatePayload.recebido_em = new Date().toISOString();
        }

        const updated = await communicationRepository.updateWhatsAppMessageByProviderMessageId(providerMessageId, updatePayload);

        results.push({
          provider_message_id: providerMessageId,
          status_envio: statusEnvio,
          updated: Boolean(updated)
        });
      }
    }
  }

  return results;
}

module.exports = {
  sendAppointmentEvent,
  processPendingWhatsAppMessages,
  handleWhatsAppProviderWebhook
};
