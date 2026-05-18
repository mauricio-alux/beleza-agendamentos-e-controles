const env = require('../../config/env');
const { AppError } = require('../../utils/errors');
const planosService = require('../planos/planos.service');
const usuariosRepository = require('../usuarios/usuarios.repository');
const eventLogsService = require('../event-logs/eventLogs.service');
const subscriptionRepository = require('./subscription.repository');

const ACTIVE_STATUSES = ['trial', 'ativo', 'ativa'];

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().slice(0, 10);
}

function toDateOnly(value) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString().slice(0, 10);
}

function getMonthRange(reference = new Date()) {
  const start = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1));
  const end = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 1));

  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}

function getTrialDaysRemaining(assinatura) {
  if (!assinatura?.trial_ate) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const trialEnd = new Date(assinatura.trial_ate);
  trialEnd.setHours(0, 0, 0, 0);

  return Math.max(0, Math.ceil((trialEnd - today) / 86400000));
}

function isTrialExpired(assinatura) {
  return assinatura?.status === 'trial' && getTrialDaysRemaining(assinatura) === 0;
}

function normalizePlan(plan) {
  return {
    id: plan.id,
    nome: plan.nome,
    descricao: plan.descricao,
    preco_mensal: plan.preco_mensal,
    limite_profissionais: plan.limite_profissionais,
    limite_clientes: plan.limite_clientes,
    limite_agendamentos_mes: plan.limite_agendamentos_mes,
    limite_whatsapp: plan.limite_whatsapp,
    fl_crm: plan.fl_crm ?? true,
    fl_ia: plan.fl_ia ?? plan.permite_ia ?? false,
    fl_whatsapp: plan.fl_whatsapp ?? plan.permite_whatsapp_cloud ?? false
  };
}

async function assertNoExistingTrial(tenantId, email) {
  const existing = await subscriptionRepository.findCurrentByTenant(tenantId);
  if (existing && ACTIVE_STATUSES.includes(existing.status)) {
    throw new AppError('Tenant ja possui assinatura ativa ou trial', 409, 'SUBSCRIPTION_ALREADY_EXISTS');
  }

  if (!email) {
    return;
  }

  const usuario = await usuariosRepository.findByEmail(email);
  if (usuario?.tenant_id && usuario.tenant_id !== tenantId) {
    const otherSubscription = await subscriptionRepository.findCurrentByTenant(usuario.tenant_id);
    if (otherSubscription?.status === 'trial') {
      throw new AppError('Email ja utilizou trial em outro tenant', 409, 'TRIAL_ALREADY_USED');
    }
  }
}

async function createSubscription({ tenantId, planoId, status = 'trial', trialDays = env.trialDays, email = null }) {
  await assertNoExistingTrial(tenantId, email);

  const plano = await planosService.validatePlan(planoId);
  const today = toDateOnly(new Date());
  const trialEnd = status === 'trial' ? addDays(new Date(), trialDays) : null;

  const assinatura = await subscriptionRepository.create({
    tenant_id: tenantId,
    plano_id: plano.id,
    status,
    data_inicio: today,
    trial_ate: trialEnd,
    valor_mensal: plano.preco_mensal,
    metadata: {
      data_inicio_trial: status === 'trial' ? today : null,
      data_fim_trial: trialEnd,
      gateway_ready: false
    }
  });

  await subscriptionRepository.updateTenantStatus(tenantId, status === 'trial' ? 'trial' : status);

  return assinatura;
}

async function createTrial({ tenantId, planoId, email = null, trialDays = env.trialDays }) {
  const assinatura = await createSubscription({
    tenantId,
    planoId,
    status: 'trial',
    trialDays,
    email
  });

  await eventLogsService.logEvent('trial_created', {
    tenantId,
    payload: {
      assinatura_id: assinatura.id,
      plano_id: planoId,
      trial_days: trialDays,
      trial_ate: assinatura.trial_ate
    }
  });

  return assinatura;
}

async function expireTrial(tenantId, assinatura = null) {
  const current = assinatura || await subscriptionRepository.findCurrentByTenant(tenantId);

  if (!current || current.status !== 'trial') {
    return current;
  }

  const expired = await subscriptionRepository.update(current.id, {
    status: 'inadimplente',
    ativo: true,
    metadata: {
      ...(current.metadata || {}),
      trial_expired_at: new Date().toISOString()
    }
  });

  await subscriptionRepository.updateTenantStatus(tenantId, 'inadimplente');
  await eventLogsService.logEvent('trial_expired', {
    tenantId,
    payload: {
      assinatura_id: current.id
    }
  });

  return expired;
}

async function getUsage(tenantId) {
  const monthRange = getMonthRange();

  const [
    profissionais,
    clientes,
    agendamentosMes,
    whatsappMes
  ] = await Promise.all([
    subscriptionRepository.countTableByTenant('profissionais', tenantId),
    subscriptionRepository.countTableByTenant('cliente_tenants', tenantId),
    subscriptionRepository.countMonthlyAppointments(tenantId, monthRange.start, monthRange.end),
    subscriptionRepository.countMonthlyWhatsApp(tenantId, monthRange.start, monthRange.end)
  ]);

  return {
    profissionais,
    clientes,
    agendamentos_mes: agendamentosMes,
    whatsapp_mes: whatsappMes
  };
}

async function getTenantPlan(tenantId) {
  const assinatura = await subscriptionRepository.findCurrentByTenant(tenantId);

  if (!assinatura) {
    throw new AppError('Tenant sem assinatura', 402, 'SUBSCRIPTION_NOT_FOUND');
  }

  const plano = assinatura.plano ? normalizePlan(assinatura.plano) : null;
  const usage = await getUsage(tenantId);
  const trialDaysRemaining = getTrialDaysRemaining(assinatura);

  return {
    assinatura: {
      id: assinatura.id,
      tenant_id: assinatura.tenant_id,
      plano_id: assinatura.plano_id,
      status: assinatura.status,
      data_inicio: assinatura.data_inicio,
      data_inicio_trial: assinatura.metadata?.data_inicio_trial || assinatura.data_inicio,
      data_fim_trial: assinatura.metadata?.data_fim_trial || assinatura.trial_ate,
      trial_ate: assinatura.trial_ate,
      valor_mensal: assinatura.valor_mensal
    },
    plano,
    trial: {
      active: assinatura.status === 'trial' && !isTrialExpired(assinatura),
      expired: isTrialExpired(assinatura),
      days_remaining: trialDaysRemaining
    },
    usage,
    limits: {
      profissionais: {
        used: usage.profissionais,
        limit: plano?.limite_profissionais ?? null
      },
      clientes: {
        used: usage.clientes,
        limit: plano?.limite_clientes ?? null
      },
      agendamentos_mes: {
        used: usage.agendamentos_mes,
        limit: plano?.limite_agendamentos_mes ?? null
      },
      whatsapp_mes: {
        used: usage.whatsapp_mes,
        limit: plano?.limite_whatsapp ?? null
      }
    }
  };
}

async function validateSubscription(tenantId) {
  const current = await subscriptionRepository.findCurrentByTenant(tenantId);

  if (!current) {
    throw new AppError('Tenant sem assinatura ativa', 402, 'SUBSCRIPTION_NOT_FOUND');
  }

  if (!ACTIVE_STATUSES.includes(current.status)) {
    throw new AppError('Assinatura inativa ou bloqueada', 402, 'SUBSCRIPTION_INACTIVE', {
      status: current.status
    });
  }

  if (isTrialExpired(current)) {
    await expireTrial(tenantId, current);
    throw new AppError('Trial expirado. Atualize o plano para continuar.', 402, 'TRIAL_EXPIRED');
  }

  return getTenantPlan(tenantId);
}

async function validatePlanLimits(tenantId, requirements = {}) {
  const current = await validateSubscription(tenantId);
  const plan = current.plano;

  if (requirements.feature) {
    const featureMap = {
      crm: 'fl_crm',
      ia: 'fl_ia',
      whatsapp: 'fl_whatsapp'
    };
    const featureFlag = featureMap[requirements.feature];

    if (featureFlag && !plan?.[featureFlag]) {
      throw new AppError('Funcionalidade nao disponivel no plano atual', 403, 'PLAN_FEATURE_NOT_ALLOWED', {
        feature: requirements.feature
      });
    }
  }

  if (requirements.limit) {
    const limit = current.limits[requirements.limit];

    if (limit && limit.limit !== null && limit.used >= limit.limit) {
      throw new AppError('Limite do plano atingido', 403, 'PLAN_LIMIT_REACHED', {
        limit: requirements.limit,
        used: limit.used,
        max: limit.limit
      });
    }
  }

  return current;
}

module.exports = {
  createTrial,
  createSubscription,
  validateSubscription,
  validatePlanLimits,
  expireTrial,
  getTenantPlan
};
