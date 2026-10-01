const { AppError, notFound } = require('../../utils/errors');
const { normalizeEmail, normalizePhoneToE164, onlyDigits } = require('../../utils/normalize');
const { createClientSchema, updateClientSchema } = require('./clients.validators');
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
    data_nascimento: client.data_nascimento ?? null,
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
  input = createClientSchema.parse(input);
  const telefone = normalizePhoneToE164(input.telefone);
  const email = input.email ? normalizeEmail(input.email) : null;
  const endereco = normalizeAddress(input.endereco);

  const existing = await clientsRepository.findClientByPhone(tenantId, telefone);

  if (existing) {
    await assertBirthChangeAllowed(tenantId, existing, input.data_nascimento);
    const updatedClient = await clientsRepository.updateClient(existing.id, {
      nome: input.nome,
      data_nascimento: input.data_nascimento,
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
    data_nascimento: input.data_nascimento,
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

async function assertBirthChangeAllowed(tenantId, client, birth) {
  if (birth !== undefined && birth !== (client.data_nascimento ?? null)
    && await clientsRepository.hasOtherTenantLinks(tenantId, client.id)) {
    throw new AppError('Este cadastro está vinculado a mais de um estabelecimento. A data de nascimento não pode ser alterada por este fluxo.', 403, 'SHARED_CLIENT_BIRTH_DATE');
  }
}

async function update(tenantId, clientId, input) {
  input = updateClientSchema.parse(input);
  const currentLink = await clientsRepository.findTenantLink(tenantId, clientId);
  if (!currentLink || !currentLink.cliente || currentLink.cliente.deleted_at) throw notFound('Cliente nao encontrado.');
  await assertBirthChangeAllowed(tenantId, currentLink.cliente, input.data_nascimento);
  const clientPayload = {};
  const linkPayload = {};
  if (input.telefone !== undefined) {
    const telefone = normalizePhoneToE164(input.telefone);
    const existing = await clientsRepository.findClientByPhone(tenantId, telefone);
    if (existing && existing.id !== clientId) throw new AppError('Este WhatsApp ja esta cadastrado para outro cliente.', 409, 'CLIENT_PHONE_DUPLICATE');
    clientPayload.telefone = telefone;
  }
  if (input.nome !== undefined) { clientPayload.nome = input.nome; linkPayload.nome_no_tenant = input.nome; }
  if (input.email !== undefined) clientPayload.email = input.email ? normalizeEmail(input.email) : null;
  if (input.observacoes !== undefined) { clientPayload.observacoes = input.observacoes; linkPayload.observacoes = input.observacoes; }
  if (input.data_nascimento !== undefined && input.data_nascimento !== currentLink.cliente.data_nascimento) clientPayload.data_nascimento = input.data_nascimento;
  if (input.endereco !== undefined) {
    const currentMetadata = currentLink.cliente.metadata || {};
    const endereco = { ...(currentMetadata.endereco || {}), ...input.endereco };
    if (input.endereco.cep !== undefined) endereco.cep = onlyDigits(input.endereco.cep);
    clientPayload.metadata = { ...currentMetadata, endereco };
  }
  if (input.aceita_campanhas !== undefined) linkPayload.aceita_campanhas = input.aceita_campanhas;
  if (input.status !== undefined) { linkPayload.status = input.status; linkPayload.ativo = input.status === 'ativo'; }
  const updatedClient = Object.keys(clientPayload).length
    ? await clientsRepository.updateClient(clientId, clientPayload) : currentLink.cliente;
  const updatedLink = Object.keys(linkPayload).length
    ? await clientsRepository.updateTenantLink(tenantId, clientId, linkPayload) : currentLink;
  return sanitize({ ...updatedLink, cliente: updatedClient });
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
  update,
  issueBookingToken
};
