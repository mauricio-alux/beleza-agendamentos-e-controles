const repository = require('./usuario-cliente.repository');
const { normalizePhoneToE164 } = require('../../utils/normalize');
const policy = require('../public-booking/identity-policy');
const identityRepository = require('../public-booking/client-identity.repository');
const bookingRepository = require('../public-booking/public-booking.repository');
function phone(value) { try { return normalizePhoneToE164(value); } catch { return null; } }
function active(row) { return row.ativo === true && !row.deleted_at; }
function plan({ users, clients, links }, scope) {
  const source = scope.usuarioId ? users.find(row => row.id === scope.usuarioId) : clients.find(row => row.id === scope.clienteId);
  const normalized = source && active(source) && phone(source.telefone);
  if (!normalized) return [];
  const candidates = users.filter(row => active(row) && phone(row.telefone) === normalized);
  if (candidates.length !== 1) return [];
  const matching = clients.filter(row => active(row) && phone(row.telefone) === normalized);
  const validLinks = links.filter(row => active(row) && row.status === 'ativo' && matching.some(c => c.id === row.cliente_id));
  if (validLinks.some(row => new Set(validLinks.filter(l => l.tenant_id === row.tenant_id).map(l => l.cliente_id)).size > 1)) return [];
  return validLinks.filter(row => !scope.clienteId || row.cliente_id === scope.clienteId).map(row => ({
    usuario_id: candidates[0].id, cliente_id: row.cliente_id, tenant_id: row.tenant_id,
    status_verificacao: 'pendente', origem_vinculo: 'telefone_coincidente'
  }));
}
async function reconcileUsuarioClienteByPhone(scope) {
  try {
    const rows = plan(await repository.candidates(), scope);
    await repository.insertPending(rows);
    return { status: rows.length ? 'candidatos_processados' : 'sem_candidato_seguro', count: rows.length };
  } catch (error) {
    console.warn('[usuario-cliente]', { result: 'reconciliation_unavailable', code: error.code || 'UNKNOWN' });
    return { status: 'indisponivel', count: 0 };
  }
}
async function list(userId) {
  const rows = await repository.associations(userId);
  const result = [];
  for (const row of rows) {
    const context = await identityRepository.findClientContext(row.tenant_id, row.cliente_id);
    const tenant = await bookingRepository.findTenant(row.tenant_id);
    if (!policy.eligibleClient(context) || !policy.eligibleTenant(tenant)) continue;
    const links = (await identityRepository.listPublicLinks([row.tenant_id])).filter(policy.eligibleLink);
    if (!links.length) continue;
    const link = links.sort((a,b) => a.id.localeCompare(b.id))[0];
    result.push({ ...row, slug: link.slug, displayName: tenant.nome_fantasia, telefone: context.cliente.telefone });
  }
  return result;
}
async function locate(userId, associationId, input) {
  const row = (await list(userId)).find(item => item.id === associationId);
  if (!row) throw policy.denied();
  const identity = require('../public-booking/client-identity.service');
  const tenant = await bookingRepository.findTenant(row.tenant_id);
  const link = await bookingRepository.findActiveLink(row.slug);
  if (link?.tenant_id !== row.tenant_id || !policy.eligibleLink(link)) throw policy.denied();
  if (input.token) {
    const stored = await identityRepository.findToken(identity.hashToken(input.token));
    if (!stored || stored.cliente_id !== row.cliente_id || stored.tenant_id !== row.tenant_id) throw policy.denied();
  } else {
    const pair = policy.normalizePair(input);
    if (pair.telefone !== phone(row.telefone)) throw policy.denied();
    const matches = (await identityRepository.discoverRelationships(pair)).filter(context =>
      context.tenant_id === row.tenant_id && policy.eligibleClient(context));
    if (matches.length !== 1 || matches[0].cliente_id !== row.cliente_id
      || matches[0].cliente.data_nascimento !== pair.data_nascimento) throw policy.denied();
  }
  const result = await identity.lookupExistingClient(tenant, link, input.token
    ? { token: input.token } : { cliente: input, request_id: input.request_id });
  if (result.clientId !== row.cliente_id) throw policy.denied();
  return { slug: row.slug, identity: result };
}
module.exports = { plan, reconcileUsuarioClienteByPhone, list, locate };
