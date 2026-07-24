const crypto = require('crypto');
const repository = require('./client-identity.repository');
const { AppError, notFound } = require('../../utils/errors');
const { normalizeEmail, normalizePhoneToE164 } = require('../../utils/normalize');
const { bookingBaseUrl } = require('../../config/env');

const TOKEN_TTL_DAYS = Math.max(1, Number(process.env.CLIENT_TOKEN_TTL_DAYS || 180));

function generateToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function expiresAt() {
  return new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function normalizeRequiredClientPhone(value) {
  if (!value) {
    throw new AppError('Informe seu celular/WhatsApp para continuar.', 422, 'PUBLIC_CLIENT_PHONE_REQUIRED');
  }

  try {
    return normalizePhoneToE164(value);
  } catch (error) {
    if (error.code === 'INVALID_PHONE') {
      throw new AppError('Informe um celular/WhatsApp valido para continuar.', 422, 'INVALID_PHONE');
    }

    throw error;
  }
}

function summarizeHistory(appointments = []) {
  const serviceCount = new Map();
  const professionalCount = new Map();

  appointments.forEach((appointment) => {
    (appointment.servicos || []).forEach((service) => {
      const key = service.servico_id || service.nome_servico;
      const current = serviceCount.get(key) || { ...service, count: 0 };
      current.count += 1;
      serviceCount.set(key, current);
    });

    if (appointment.profissional?.id) {
      const current = professionalCount.get(appointment.profissional.id) || {
        id: appointment.profissional.id,
        nome_publico: appointment.profissional.nome_publico,
        count: 0
      };
      current.count += 1;
      professionalCount.set(current.id, current);
    }
  });

  return {
    ultimos_servicos: [...serviceCount.values()]
      .sort((left, right) => right.count - left.count)
      .slice(0, 5)
      .map(({ count, ...service }) => service),
    profissional_favorito: [...professionalCount.values()]
      .sort((left, right) => right.count - left.count)[0] || null,
    historico: appointments.slice(0, 5).map((appointment) => ({
      id: appointment.id,
      data_inicio: appointment.data_inicio,
      status: appointment.status,
      profissional: appointment.profissional,
      servicos: appointment.servicos
    }))
  };
}

function sanitizeClient(context, history = []) {
  const client = context.cliente;
  return {
    nome: context.nome_no_tenant || client.nome,
    telefone: client.telefone,
    email: client.email,
    data_primeiro_acesso: context.data_primeiro_acesso,
    data_ultimo_acesso: context.data_ultimo_acesso,
    preferencias: context.metadata?.preferencias || {},
    ...summarizeHistory(history)
  };
}

async function resolveToken(tenantId, token, options = {}) {
  if (!token) return null;

  const storedToken = await repository.findToken(hashToken(token));
  if (!storedToken || storedToken.tenant_id !== tenantId) {
    throw new AppError('Token de cliente invalido.', 401, 'CLIENT_TOKEN_INVALID');
  }

  if (new Date(storedToken.expira_em) <= new Date()) {
    throw new AppError('Token de cliente expirado.', 410, 'CLIENT_TOKEN_EXPIRED');
  }

  const context = await repository.findClientContext(tenantId, storedToken.cliente_id);
  if (!context || context.status === 'bloqueado') {
    throw new AppError('Cliente indisponivel para este salao.', 403, 'CLIENT_IDENTITY_UNAVAILABLE');
  }

  await repository.touchIdentity(tenantId, storedToken.cliente_id, storedToken.id);
  const updatedContext = options.client
    ? await repository.updateIdentifiedClient(tenantId, storedToken.cliente_id, {
      nome: options.client.nome?.trim(),
      email: options.client.email ? normalizeEmail(options.client.email) : null
    })
    : await repository.findClientContext(tenantId, storedToken.cliente_id);
  const history = await repository.listRecentAppointments(tenantId, storedToken.cliente_id);

  if (options.track !== false) {
    await repository.recordAccess({
      tenantId,
      linkId: options.linkId,
      clientId: storedToken.cliente_id,
      campaignKey: options.campaignKey,
      origin: options.origin,
      sessionId: options.sessionId,
      event: 'retorno',
      metadata: options.metadata
    });
  }

  return {
    token,
    clientId: storedToken.cliente_id,
    client: sanitizeClient(updatedContext, history),
    expiresAt: storedToken.expira_em,
    recognized: true
  };
}

async function identify(tenant, link, input) {
  if (input.lookup_only) {
    return lookupExistingClient(tenant, link, input);
  }

  if (input.token) {
    return resolveToken(tenant.id, input.token, {
      client: input.cliente,
      linkId: link.id,
      campaignKey: input.campanha,
      origin: input.origem,
      sessionId: input.sessao_id,
      metadata: input.contexto
    });
  }

  if (!input.cliente) {
    await repository.recordAccess({
      tenantId: tenant.id,
      linkId: link.id,
      campaignKey: input.campanha,
      origin: input.origem,
      sessionId: input.sessao_id,
      event: 'acesso',
      metadata: input.contexto
    });
    return { recognized: false };
  }

  const telefone = normalizeRequiredClientPhone(input.cliente.telefone);
  const existingClient = await repository.findClientByPhone(tenant.id, telefone);
  if (existingClient?.vinculos?.some((linkItem) => linkItem.status === 'bloqueado')) {
    throw new AppError('Cliente indisponivel para este salao.', 403, 'CLIENT_IDENTITY_UNAVAILABLE');
  }
  const token = generateToken();
  const tokenExpiresAt = expiresAt();
  const clientId = await repository.identifyClient({
    tenantId: tenant.id,
    linkId: link.id,
    nome: input.cliente.nome.trim(),
    telefone,
    email: input.cliente.email ? normalizeEmail(input.cliente.email) : null,
    tokenHash: hashToken(token),
    expiresAt: tokenExpiresAt,
    campaignKey: input.campanha,
    origin: input.origem,
    sessionId: input.sessao_id,
    metadata: input.contexto
  });
  const context = await repository.findClientContext(tenant.id, clientId);
  const history = await repository.listRecentAppointments(tenant.id, clientId);

  return {
    token,
    clientId,
    client: sanitizeClient(context, history),
    expiresAt: tokenExpiresAt,
    recognized: Boolean(existingClient)
  };
}

async function lookupExistingClient(tenant, link, input) {
  if (input.token) {
    return resolveToken(tenant.id, input.token, {
      linkId: link.id,
      campaignKey: input.campanha,
      origin: input.origem,
      sessionId: input.sessao_id,
      metadata: input.contexto
    });
  }

  if (!input.cliente?.telefone) {
    throw new AppError('Informe seu celular/WhatsApp para continuar.', 422, 'PUBLIC_CLIENT_PHONE_REQUIRED');
  }

  const telefone = normalizeRequiredClientPhone(input.cliente.telefone);
  const existingClient = await repository.findClientByPhone(tenant.id, telefone);

  if (!existingClient) {
    return { recognized: false };
  }

  if (existingClient.vinculos?.some((linkItem) => linkItem.status === 'bloqueado')) {
    throw new AppError('Cliente indisponivel para este salao.', 403, 'CLIENT_IDENTITY_UNAVAILABLE');
  }

  const token = generateToken();
  const tokenExpiresAt = expiresAt();
  await repository.createToken({
    tenantId: tenant.id,
    clientId: existingClient.id,
    tokenHash: hashToken(token),
    expiresAt: tokenExpiresAt,
    origin: input.origem || 'link_agendamento',
    metadata: {
      ...(input.contexto || {}),
      lookup_only: true,
      link_agendamento_id: link.id || null,
      campanha: input.campanha || null,
      sessao_id: input.sessao_id || null
    }
  });

  await repository.recordAccess({
    tenantId: tenant.id,
    linkId: link.id,
    clientId: existingClient.id,
    campaignKey: input.campanha,
    origin: input.origem,
    sessionId: input.sessao_id,
    event: 'retorno',
    metadata: {
      ...(input.contexto || {}),
      lookup_only: true
    }
  });

  const context = await repository.findClientContext(tenant.id, existingClient.id);
  const history = await repository.listRecentAppointments(tenant.id, existingClient.id);

  return {
    token,
    clientId: existingClient.id,
    client: sanitizeClient(context, history),
    expiresAt: tokenExpiresAt,
    recognized: true
  };
}

async function issueClientLink(tenantId, clientId, slug) {
  const context = await repository.findTenantClient(tenantId, clientId);
  if (!context) throw notFound('Cliente nao encontrado neste salao.');

  const token = generateToken();
  const tokenExpiresAt = expiresAt();
  await repository.revokeActiveTokens(tenantId, clientId);
  await repository.createToken({
    tenantId,
    clientId,
    tokenHash: hashToken(token),
    expiresAt: tokenExpiresAt,
    origin: 'campanha_individual',
    metadata: { slug }
  });

  const base = `${bookingBaseUrl.replace(/\/+$/, '')}/${encodeURIComponent(slug)}`;
  return {
    token,
    expires_at: tokenExpiresAt,
    url: `${base}?tk=${encodeURIComponent(token)}`
  };
}

async function resolveClientForAppointment(tenantId, token) {
  const identity = await resolveToken(tenantId, token, { track: false });
  return identity?.clientId || null;
}

async function resolveClientIdentityForAppointment(tenantId, token) {
  return resolveToken(tenantId, token, { track: false });
}

async function listRelatedClientIdsForAppointment(tenantId, clientId) {
  const client = await repository.findClientById(clientId);
  const relatedClientIds = client?.telefone
    ? await repository.listClientIdsByPhone(tenantId, client.telefone)
    : [];

  return [...new Set([clientId, ...relatedClientIds].filter(Boolean))];
}

module.exports = {
  identify,
  issueClientLink,
  resolveClientForAppointment,
  resolveClientIdentityForAppointment,
  listRelatedClientIdsForAppointment,
  lookupExistingClient,
  hashToken
};
