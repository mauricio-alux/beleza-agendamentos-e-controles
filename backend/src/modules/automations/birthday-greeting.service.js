const { normalizePhoneToE164 } = require('../../utils/normalize');
const env = require('../../config/env');
const campaignsRepository = require('../campaigns/campaigns.repository');
const { renderTemplate } = require('../campaigns/campaigns.service');
const communicationRepository = require('../communication/communication.repository');
const whatsappProvider = require('../communication/providers/whatsapp-mysaas.provider');
const repository = require('./birthday-greeting.repository');

const AUTOMATION_TYPE = 'birthday_greeting';
const EVENT_TYPE = 'birthday.greeting';
const DEFAULT_SEND_TIME = '09:00';
const DEFAULT_TIMEZONE = 'America/Sao_Paulo';
const INTERNAL_TENANT_ROLES = new Set(['Administrador', 'Funcionario', 'Autonomo', 'Terceiro']);

function normalizeTemplate(template) {
  if (!template) return null;
  const metadata = template.metadata || {};
  return {
    ...template,
    variaveis: Array.isArray(template.variaveis) ? template.variaveis : [],
    provider_template_name: metadata.provider_template_name
      || metadata.providerTemplateName
      || metadata.whatsapp_template_name
      || template.nome
      || null,
    language: metadata.language || metadata.language_code || metadata.locale || 'pt_BR'
  };
}

function localDateParts(now = new Date(), timezone = DEFAULT_TIMEZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone || DEFAULT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(now);

  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(byType.year),
    month: Number(byType.month),
    day: Number(byType.day),
    hour: Number(byType.hour),
    minute: Number(byType.minute)
  };
}

function birthDateParts(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { month, day };
}

function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function birthdayMatchesLocalDate(dataNascimento, localDate) {
  const birth = birthDateParts(dataNascimento);
  if (!birth) return false;
  if (birth.month === localDate.month && birth.day === localDate.day) return true;

  return birth.month === 2
    && birth.day === 29
    && !isLeapYear(localDate.year)
    && localDate.month === 2
    && localDate.day === 28;
}

function minuteOfDayFromTime(value = DEFAULT_SEND_TIME) {
  const match = String(value || DEFAULT_SEND_TIME).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return 9 * 60;

  const hour = Math.min(23, Math.max(0, Number(match[1])));
  const minute = Math.min(59, Math.max(0, Number(match[2])));
  return hour * 60 + minute;
}

function isDueForLocalTime(automation, now = new Date()) {
  const timezone = automation.timezone || DEFAULT_TIMEZONE;
  const localDate = localDateParts(now, timezone);
  const configuredMinute = minuteOfDayFromTime(automation.horario_envio || DEFAULT_SEND_TIME);
  const currentMinute = localDate.hour * 60 + localDate.minute;

  return {
    due: currentMinute >= configuredMinute,
    timezone,
    localDate,
    send_time: automation.horario_envio || DEFAULT_SEND_TIME
  };
}

function hasInternalAudienceMarker(row = {}) {
  const client = row.cliente || {};
  const values = [
    ...(Array.isArray(row.internal_user_roles) ? row.internal_user_roles : []),
    row.metadata?.tipo_usuario,
    row.metadata?.tipo_usuario_operacional,
    row.metadata?.role,
    row.metadata?.user_role,
    client.metadata?.tipo_usuario,
    client.metadata?.tipo_usuario_operacional,
    client.metadata?.role,
    client.metadata?.user_role
  ].filter(Boolean);

  return values.some((role) => INTERNAL_TENANT_ROLES.has(String(role)));
}

function normalizeAudienceRow(row, localDate) {
  const exclusions = [];
  const client = row.cliente || {};
  const rawPhone = client.telefone || '';

  let normalizedPhone = null;
  try {
    normalizedPhone = rawPhone ? normalizePhoneToE164(rawPhone) : null;
  } catch (_) {
    exclusions.push('telefone_invalido');
  }

  if (!client.id) exclusions.push('cliente_invalido');
  if (!client.data_nascimento) exclusions.push('sem_data_nascimento');
  if (client.data_nascimento && !birthdayMatchesLocalDate(client.data_nascimento, localDate)) {
    exclusions.push('fora_do_dia_aniversario');
  }
  if (hasInternalAudienceMarker(row)) exclusions.push('usuario_interno_tenant');
  if (!client.ativo || client.deleted_at || row.status !== 'ativo' || row.ativo === false) exclusions.push('cliente_inativo');
  if (!rawPhone) exclusions.push('sem_telefone');
  if (row.aceita_campanhas === false || row.metadata?.opt_out_whatsapp === true || row.metadata?.permite_marketing === false) {
    exclusions.push('sem_consentimento');
  }
  if (row.status === 'bloqueado' || row.metadata?.bloqueado_comunicacao === true) exclusions.push('bloqueado');

  return {
    cliente_id: client.id,
    nome: row.nome_no_tenant || client.nome || 'Cliente',
    telefone: normalizedPhone || rawPhone,
    eligible: exclusions.length === 0,
    exclusions,
    raw: row
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
    excluded_by_reason: excludedByReason,
    rows
  };
}

function providerVariableOrder(template) {
  const mapping = template?.metadata?.provider_variable_mapping;
  if (Array.isArray(mapping)) return mapping.map((item) => String(item || '').trim()).filter(Boolean);
  if (mapping && typeof mapping === 'object') {
    return Object.entries(mapping)
      .sort(([, left], [, right]) => Number(left) - Number(right))
      .map(([variable]) => variable)
      .filter(Boolean);
  }
  return template?.variaveis || [];
}

function providerVariableMapping(template) {
  return providerVariableOrder(template).reduce((mapping, variable, index) => ({
    ...mapping,
    [variable]: index + 1
  }), {});
}

function providerParams(template, params = {}) {
  return providerVariableOrder(template).map((variable) => {
    const value = params[variable];
    return value === undefined || value === null ? '' : String(value);
  });
}

function resolveParams(template, automation, recipient) {
  const tenantName = automation.tenant?.nome_fantasia || automation.metadata?.tenant_name || 'Bellory';
  return (template.variaveis || []).reduce((params, variable) => {
    const configured = automation.metadata?.parametros_template?.[variable];
    if (configured !== undefined && configured !== null && typeof configured !== 'object') {
      params[variable] = configured;
      return params;
    }

    const dynamicField = typeof configured === 'object' ? configured.field : variable;
    const dynamicValues = {
      nome_cliente: recipient.nome,
      nome_salao: tenantName,
      nome_empresa: tenantName,
      nome_responsavel: tenantName
    };
    params[variable] = dynamicValues[dynamicField] || '';
    return params;
  }, {});
}

async function resolveTemplate(tenantId, automation) {
  const configuredTemplate = normalizeTemplate(automation.template);
  if (configuredTemplate) return configuredTemplate;

  return normalizeTemplate(await communicationRepository.findActiveMessageTemplate({
    tenantId,
    names: [AUTOMATION_TYPE],
    requireProviderApproval: false
  }));
}

function assertTemplateCanBeQueued(template) {
  if (!template) {
    const error = new Error('Template birthday_greeting ativo nao encontrado.');
    error.code = 'BIRTHDAY_GREETING_TEMPLATE_REQUIRED';
    throw error;
  }
  if (template.canal !== 'whatsapp' || template.ativo !== true) {
    const error = new Error('Template birthday_greeting precisa ser WhatsApp e estar ativo.');
    error.code = 'BIRTHDAY_GREETING_TEMPLATE_INVALID';
    throw error;
  }
  if (!env.whatsappDryRun && (!template.aprovado_provider || !template.provider_template_name || !template.language)) {
    const error = new Error('Envio real exige template birthday_greeting aprovado na Meta.');
    error.code = 'BIRTHDAY_GREETING_TEMPLATE_NOT_APPROVED';
    throw error;
  }
}

async function estimateAudience(tenantId, localDate) {
  const base = await campaignsRepository.listAudienceBase(tenantId);
  return summarizeAudience(base.map((row) => normalizeAudienceRow(row, localDate)));
}

async function queueForAutomation(automation, options = {}) {
  const now = options.now || new Date();
  const timeGate = isDueForLocalTime(automation, now);
  if (!timeGate.due) {
    return {
      automation_id: automation.id,
      tenant_id: automation.tenant_id,
      status: 'not_due',
      reason: 'antes_do_horario_configurado',
      timezone: timeGate.timezone,
      send_time: timeGate.send_time,
      generated: 0
    };
  }

  const template = await resolveTemplate(automation.tenant_id, automation);
  assertTemplateCanBeQueued(template);

  const audience = await estimateAudience(automation.tenant_id, timeGate.localDate);
  let generated = 0;
  let duplicates = 0;
  const messages = [];

  for (const recipient of audience.rows.filter((row) => row.eligible)) {
    const idempotencyKey = `${automation.tenant_id}:${recipient.cliente_id}:${AUTOMATION_TYPE}:${timeGate.localDate.year}`;
    const existing = await communicationRepository.findWhatsAppMessageByIdempotencyKey(idempotencyKey);
    if (existing) {
      duplicates += 1;
      messages.push(existing);
      continue;
    }

    const params = resolveParams(template, automation, recipient);
    const content = renderTemplate(template.conteudo, template.variaveis, params);
    const message = await communicationRepository.createWhatsAppMessageLog({
      tenant_id: automation.tenant_id,
      cliente_id: recipient.cliente_id,
      telefone_destino: recipient.telefone,
      direcao: 'saida',
      template_nome: template.nome,
      conteudo: content,
      tipo_evento: EVENT_TYPE,
      provider: whatsappProvider.PROVIDER_NAME,
      status_envio: 'pendente',
      idempotency_key: idempotencyKey,
      agendado_para: null,
      payload: {
        event_type: EVENT_TYPE,
        recipient_type: 'client',
        automation_type: AUTOMATION_TYPE,
        automation_id: automation.id,
        birthday_year: timeGate.localDate.year,
        idempotency_key: idempotencyKey,
        natureza_campanha: 'relacionamento',
        template_source: 'templates_mensagem',
        template_id: template.id,
        provider_template_name: template.provider_template_name || template.nome,
        language: template.language || 'pt_BR',
        provider_approved: template.aprovado_provider === true,
        provider_parameter_format: 'positional',
        provider_variable_mapping: providerVariableMapping(template),
        provider_params: providerParams(template, params),
        params,
        timezone: timeGate.timezone,
        send_time: timeGate.send_time,
        priority: 'low',
        future_coupon_ready: true
      }
    });

    generated += 1;
    messages.push(message);
  }

  return {
    automation_id: automation.id,
    tenant_id: automation.tenant_id,
    status: 'processed',
    timezone: timeGate.timezone,
    send_time: timeGate.send_time,
    generated,
    duplicates,
    audience: {
      found: audience.found,
      eligible: audience.eligible,
      excluded: audience.excluded,
      excluded_by_reason: audience.excluded_by_reason
    },
    messages
  };
}

async function processDueBirthdayGreetings(options = {}) {
  const now = options.now || new Date();
  const limit = Number(options.limit || 100);
  const automations = options.automations || await repository.listActiveBirthdayGreetingAutomations(limit);
  const results = [];

  for (const automation of automations) {
    try {
      const result = await queueForAutomation(automation, { now });
      results.push(result);
      await repository.updateAutomationRun(automation.id, {
        ultima_execucao_em: now.toISOString(),
        metadata: {
          ...(automation.metadata || {}),
          last_result: {
            status: result.status,
            generated: result.generated || 0,
            duplicates: result.duplicates || 0,
            processed_at: now.toISOString()
          }
        }
      });
    } catch (error) {
      results.push({
        automation_id: automation.id,
        tenant_id: automation.tenant_id,
        status: 'error',
        error: error.message,
        code: error.code || null
      });
      await repository.updateAutomationRun(automation.id, {
        ultima_execucao_em: now.toISOString(),
        metadata: {
          ...(automation.metadata || {}),
          last_error: {
            message: error.message,
            code: error.code || null,
            processed_at: now.toISOString()
          }
        }
      });
    }
  }

  return results;
}

module.exports = {
  AUTOMATION_TYPE,
  EVENT_TYPE,
  DEFAULT_SEND_TIME,
  DEFAULT_TIMEZONE,
  birthDateParts,
  birthdayMatchesLocalDate,
  estimateAudience,
  isDueForLocalTime,
  localDateParts,
  processDueBirthdayGreetings,
  queueForAutomation
};
