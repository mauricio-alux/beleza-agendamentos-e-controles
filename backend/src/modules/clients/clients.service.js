const { AppError, notFound } = require('../../utils/errors');
const { normalizeEmail, normalizePhoneToE164, onlyDigits } = require('../../utils/normalize');
const clientsRepository = require('./clients.repository');
const clientIdentityService = require('../public-booking/client-identity.service');

function sanitize(row) {
  const client = row.cliente || row;

  return {
    id: client.id,
    tenant_link_id: row.cliente_id ? row.id : null,
    nome: row.nome_no_tenant || client.nome,
    telefone: client.telefone,
    email: client.email,
    observacoes: row.observacoes ?? client.observacoes ?? null,
    endereco: client.metadata?.endereco || null,
    aceita_campanhas: row.aceita_campanhas ?? true,
    status: row.status || 'ativo',
    qtd_atendimentos: row.qtd_atendimentos || 0,
    total_gasto: Number(row.total_gasto || 0),
    ultimo_atendimento: row.ultimo_atendimento || null,
    created_at: row.created_at || client.created_at
  };
}

async function list(tenantId) {
  const rows = await clientsRepository.listByTenant(tenantId);
  return rows.map(sanitize);
}

async function create(tenantId, input) {
  const telefone = normalizePhoneToE164(input.telefone);
  const email = input.email ? normalizeEmail(input.email) : null;
  const endereco = normalizeAddress(input.endereco);

  const existing = await clientsRepository.findClientByPhone(tenantId, telefone);

  if (existing) {
    const updatedClient = await clientsRepository.updateClient(existing.id, {
      nome: input.nome,
      email,
      observacoes: input.observacoes || null,
      metadata: endereco ? { ...(existing.metadata || {}), endereco } : existing.metadata || {}
    });

    const updatedLink = await clientsRepository.updateTenantLink(tenantId, existing.id, {
      nome_no_tenant: input.nome,
      observacoes: input.observacoes || null,
      aceita_campanhas: input.aceita_campanhas !== false,
      status: 'ativo',
      ativo: true
    });

    return sanitize({ ...updatedLink, cliente: updatedClient });
  }

  const client = await clientsRepository.createClient({
    nome: input.nome,
    telefone,
    email,
    observacoes: input.observacoes || null,
    metadata: endereco ? { endereco } : {}
  });

  try {
    const link = await clientsRepository.createTenantLink(tenantId, client.id, {
      nome_no_tenant: input.nome,
      origem: 'dashboard',
      observacoes: input.observacoes || null,
      aceita_campanhas: input.aceita_campanhas !== false,
      status: 'ativo'
    });

    return sanitize(link);
  } catch (error) {
    throw new AppError('Nao foi possivel vincular o cliente ao salao', 400, 'CLIENT_LINK_FAILED', error.message);
  }
}

async function issueBookingToken(tenantId, clientId, input) {
  const link = await clientsRepository.findActiveBookingLink(tenantId, input.slug);
  if (!link) throw notFound('Link publico de agendamento nao encontrado.');

  return clientIdentityService.issueClientLink(tenantId, clientId, link.slug);
}

function normalizeAddress(endereco) {
  if (!endereco?.cep) return null;

  return {
    cep: onlyDigits(endereco.cep),
    uf: endereco.uf || null,
    cidade: endereco.cidade || null,
    logradouro: endereco.logradouro || null,
    numero: endereco.numero || null
  };
}

module.exports = {
  list,
  create,
  issueBookingToken
};
