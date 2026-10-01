const crypto = require('crypto');
const repository = require('./client-identity.repository');
const { AppError, notFound } = require('../../utils/errors');
const { normalizeEmail, normalizePhoneToE164 } = require('../../utils/normalize');
const { bookingBaseUrl, supabaseServiceRoleKey } = require('../../config/env');

const policy = require('./identity-policy');

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

function sanitizeClientProfile(context) {
  const client = context.cliente || {};
  return {
    nome: context.nome_no_tenant || client.nome,
    telefone: client.telefone,
    email: client.email || null,
    endereco: client.metadata?.endereco || null,
    aceita_campanhas: context.aceita_campanhas !== false,
    status: context.status || 'ativo'
  };
}

async function validateToken(tenantId, token) {
  if (!token) return null;

  const storedToken = await repository.findToken(hashToken(token));
  if (!storedToken || storedToken.tenant_id !== tenantId) {
    throw new AppError('Token de cliente invalido.', 401, 'CLIENT_TOKEN_INVALID');
  }

  if (new Date(storedToken.expira_em) <= new Date()) {
    throw new AppError('Token de cliente expirado.', 410, 'CLIENT_TOKEN_EXPIRED');
  }

  const context = await repository.findClientContext(tenantId, storedToken.cliente_id);
  if (!policy.eligibleClient(context)) {
    throw new AppError('Cliente indisponivel para este salao.', 403, 'CLIENT_IDENTITY_UNAVAILABLE');
  }

  return storedToken;
}

async function probeClientContext(tenantId, token) {
  const validated = await validateToken(tenantId, token);
  return { available: Boolean(validated) };
}

async function resolveToken(tenantId, token, options = {}) {
  const storedToken = await validateToken(tenantId, token);
  if (!storedToken) return null;
  await repository.touchIdentity(tenantId, storedToken.cliente_id, storedToken.id);
  const updatedContext = await repository.findClientContext(tenantId, storedToken.cliente_id);
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

async function getSelfProfile(tenantId, token) {
  const identity = await resolveToken(tenantId, token, { track: false });
  const context = await repository.findClientContext(tenantId, identity.clientId);
  if (!context) {
    throw new AppError('Cliente indisponivel para este salao.', 403, 'CLIENT_IDENTITY_UNAVAILABLE');
  }

  return sanitizeClientProfile(context);
}

async function updateSelfProfile(tenantId, token, input) {
  const identity = await resolveToken(tenantId, token, { track: false });
  const context = await repository.findClientContext(tenantId, identity.clientId);
  if (!context) {
    throw new AppError('Cliente indisponivel para este salao.', 403, 'CLIENT_IDENTITY_UNAVAILABLE');
  }

  const payload = {};
  if (input.nome !== undefined) payload.nome = input.nome.trim();
  if (input.email !== undefined) payload.email = input.email ? normalizeEmail(input.email) : null;
  if (input.aceita_campanhas !== undefined) payload.aceita_campanhas = input.aceita_campanhas;
  if (input.endereco !== undefined) payload.endereco = normalizeAddress(input.endereco);

  if (input.telefone !== undefined) {
    const telefone = normalizeRequiredClientPhone(input.telefone);
    const existing = await repository.findClientByPhone(tenantId, telefone);
    if (existing && existing.id !== identity.clientId) {
      throw new AppError(
        'Este WhatsApp ja esta cadastrado para outro cliente neste salao.',
        409,
        'CLIENT_PHONE_DUPLICATE'
      );
    }
    payload.telefone = telefone;
  }

  if (['nome', 'email', 'telefone', 'endereco'].some(key => payload[key] !== undefined)
    && await repository.hasOtherTenantLinks(tenantId, identity.clientId)) {
    const current = {
      nome: context.nome_no_tenant || context.cliente.nome,
      email: context.cliente.email ? normalizeEmail(context.cliente.email) : null,
      telefone: context.cliente.telefone,
      endereco: normalizeAddress(context.cliente.metadata?.endereco || null)
    };
    for (const key of ['nome', 'email', 'telefone', 'endereco']) {
      if (payload[key] === undefined) continue;
      if (JSON.stringify(payload[key]) !== JSON.stringify(current[key])) {
        throw new AppError('Solicite a alteração destes dados ao estabelecimento.', 403, 'SHARED_CLIENT_PROFILE');
      }
      // A full profile form may resend unchanged fields with tenant consent.
      // Do not write those fields into the shared client row.
      delete payload[key];
    }
  }
  const updated = await repository.updateSelfProfile(tenantId, identity.clientId, payload);
  if (!updated) {
    throw new AppError('Cliente indisponivel para este salao.', 403, 'CLIENT_IDENTITY_UNAVAILABLE');
  }

  return sanitizeClientProfile(updated);
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

  return identifyByPair(tenant, link, input, false);
}

async function identifyByPair(tenant, link, input, lookupOnly) {
  const pair = policy.normalizePair(input.cliente);
  if (!policy.eligibleTenant(tenant) || !policy.eligibleLink(link)) throw policy.denied();
  // Domain-separated server HMAC makes retries stable without storing raw credentials.
  const token = input.request_id ? crypto.createHmac('sha256', supabaseServiceRoleKey)
    .update(JSON.stringify(['public-identity-retry-v1',tenant.id,link.id,input.request_id])).digest('base64url')
    : generateToken();
  const metadata = Object.fromEntries(['referrer','user_agent','timezone','locale']
    .filter(key => input.contexto?.[key] !== undefined).map(key => [key,input.contexto[key]]));
  const requestFingerprint = hashToken(JSON.stringify([pair,lookupOnly,input.cliente?.nome?.trim() || null,
    input.cliente?.email ? normalizeEmail(input.cliente.email) : null,
    input.campanha || null,input.origem || 'link_agendamento',input.sessao_id || null,metadata]));
  const tokenExpiresAt = expiresAt();
  const result = await repository.identifyWithBirth({
    tenantId: tenant.id, linkId: link.id, ...pair,
    nome: input.cliente?.nome?.trim(),
    email: input.cliente?.email ? normalizeEmail(input.cliente.email) : null,
    tokenHash: hashToken(token), expiresAt: tokenExpiresAt, lookupOnly,
    campaignKey: input.campanha, origin: input.origem, sessionId: input.sessao_id, metadata, requestFingerprint
  });
  if (!result?.client_id) throw policy.denied();
  const context = await repository.findClientContext(tenant.id, result.client_id);
  if (!policy.eligibleClient(context)) throw policy.denied();
  const history = await repository.listRecentAppointments(tenant.id, result.client_id);
  console.info('[public-identity]', { result: 'success' });
  return { token, clientId: result.client_id, client: sanitizeClient(context, history),
    expiresAt: result.expires_at || tokenExpiresAt, recognized: result.recognized === true };
}

async function lookupExistingClient(tenant, link, input) {
  if (input.token) return resolveToken(tenant.id, input.token, { track: false });
  return identifyByPair(tenant, link, input, true);
}

async function discoverAccess(input) {
  const pair = policy.normalizePair(input);
  const rows = (await repository.discoverRelationships(pair)).filter(row =>
    policy.eligibleClient(row) && policy.eligibleTenant(row.tenant));
  const links = (await repository.listPublicLinks([...new Set(rows.map(row => row.tenant_id))]))
    .filter(policy.eligibleLink);
  const candidates = [];
  for (const tenantId of new Set(rows.map(row => row.tenant_id))) {
    const link = links.find(item => item.tenant_id === tenantId);
    if (!link) continue;
    const matches = rows.filter(row => row.tenant_id === tenantId);
    if (new Set(matches.map(row => row.cliente_id)).size !== 1) throw policy.denied('AMBIGUOUS_CLIENT_MATCH');
    if (!matches[0].cliente.data_nascimento) {
      policy.denied('PHONE_EXISTS_BIRTHDATE_MISSING');
      continue;
    }
    if (matches[0].cliente.data_nascimento !== pair.data_nascimento) {
      policy.denied('PHONE_EXISTS_BIRTHDATE_MISMATCH');
      continue;
    }
    candidates.push({ slug: link.slug, displayName: matches[0].tenant.nome_fantasia });
  }
  if (!candidates.length) throw policy.denied();
  return { tenants: candidates };
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
  return clientId ? [clientId] : [];
}

function normalizeAddress(endereco) {
  if (endereco === null) return null;
  if (!endereco?.cep && !endereco?.uf && !endereco?.cidade && !endereco?.logradouro && !endereco?.numero) {
    return null;
  }

  return {
    cep: endereco.cep ? endereco.cep.replace(/\D/g, '') : null,
    uf: endereco.uf || null,
    cidade: endereco.cidade || null,
    logradouro: endereco.logradouro || null,
    numero: endereco.numero || null
  };
}

module.exports = {
  probeClientContext,
  identify,
  discoverAccess,
  getSelfProfile,
  updateSelfProfile,
  issueClientLink,
  resolveClientForAppointment,
  resolveClientIdentityForAppointment,
  listRelatedClientIdsForAppointment,
  lookupExistingClient,
  hashToken
};
