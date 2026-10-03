const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'synthetic';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'synthetic';
const repo = require('./usuario-cliente.repository');
const service = require('./usuario-cliente.service');
const ir = require('../public-booking/client-identity.repository');
const br = require('../public-booking/public-booking.repository');
const identity = require('../public-booking/client-identity.service');
// Fixtures sinteticas, sem origem em DEV/STAGING: assinante iniciado em zero,
// aceito pelo normalizador BR do projeto; nunca usar para contato ou envio.
const TEST_PHONE_A = '+5511000000001';
const TEST_PHONE_B = '+5511000000002';
const TEST_BIRTH_DATE = '2000-02-29'; // Data arbitraria de fixture, nao de pessoa.
const TEST_PHONE_A_FORMATTED = '(11) 00000-0001';
const TEST_OTHER_BIRTH_DATE = '2000-03-01';
const phone = TEST_PHONE_A;
const row = { ativo: true, deleted_at: null };
function fixture() { return { users: [{ ...row, id: 'u', telefone: TEST_PHONE_A_FORMATTED }],
  clients: [{ ...row, id: 'c', telefone: phone }],
  links: [{ ...row, id: 'l', cliente_id: 'c', tenant_id: 'client-tenant', status: 'ativo' }] }; }
afterEach(() => mock.restoreAll());
test('normalized match creates pending candidate', () => {
  assert.deepEqual(service.plan(fixture(), { usuarioId: 'u' }), [{ usuario_id: 'u', cliente_id: 'c', tenant_id: 'client-tenant', status_verificacao: 'pendente', origem_vinculo: 'telefone_coincidente' }]);
});
test('different, null and invalid phones create nothing', () => {
  for (const value of [TEST_PHONE_B, null, 'bad']) {
    const data = fixture(); data.users[0].telefone = value;
    assert.deepEqual(service.plan(data, { usuarioId: 'u' }), []);
  }
});
test('missing or inactive tenant relationship creates nothing', () => {
  for (const links of [[], [{ ...fixture().links[0], ativo: false }]]) {
    assert.deepEqual(service.plan({ ...fixture(), links }, { clienteId: 'c' }), []);
  }
});
test('ambiguous users or clients never choose arbitrarily', () => {
  const data = fixture(); data.users.push({ ...data.users[0], id: 'u2' });
  assert.deepEqual(service.plan(data, { clienteId: 'c' }), []);
  data.users.pop(); data.clients.push({ ...data.clients[0], id: 'c2' });
  data.links.push({ ...data.links[0], cliente_id: 'c2' });
  assert.deepEqual(service.plan(data, { usuarioId: 'u' }), []);
});
test('multiple legitimate tenants produce independent pending associations', () => {
  const data = fixture(); data.links.push({ ...data.links[0], tenant_id: 'other-client-tenant' });
  assert.equal(service.plan(data, { usuarioId: 'u' }).length, 2);
});
test('repository ignores duplicates instead of updating existing status', async () => {
  const { supabaseAdmin } = require('../../config/supabase'); let options;
  mock.method(supabaseAdmin, 'from', () => ({ upsert: async (rows, opts) => { options = opts; return {}; } }));
  await repo.insertPending(service.plan(fixture(), { usuarioId: 'u' }));
  assert.equal(options.ignoreDuplicates, true);
  assert.equal(options.onConflict, 'usuario_id,cliente_id,tenant_id');
});
function accessFixture() {
  const association = { id: 'a', usuario_id: 'u', cliente_id: 'c', tenant_id: 'client-tenant', status_verificacao: 'pendente' };
  const context = { ...fixture().links[0], cliente: { ...fixture().clients[0], data_nascimento: TEST_BIRTH_DATE } };
  const link = { ...row, id: 'link', tenant_id: 'client-tenant', slug: 'salon', acesso_publico: true };
  mock.method(repo, 'associations', async id => id === 'u' ? [association] : []);
  mock.method(ir, 'findClientContext', async () => context);
  mock.method(ir, 'listPublicLinks', async () => [link]);
  mock.method(br, 'findTenant', async id => ({ ...row, id, status: 'ativo', nome_fantasia: 'Salon' }));
  mock.method(br, 'findActiveLink', async () => link);
  mock.method(ir, 'discoverRelationships', async () => [context]);
  let issued = 0;
  mock.method(identity, 'lookupExistingClient', async (tenant, selected, input) => {
    assert.equal(tenant.id, 'client-tenant'); assert.equal(selected.tenant_id, 'client-tenant');
    assert.equal(input.cliente.data_nascimento, TEST_BIRTH_DATE); issued++;
    return { clientId: 'c', token: 'synthetic' };
  });
  return { context, issued: () => issued };
}
test('pending association can be listed without issuing identity', async () => {
  const f = accessFixture(); assert.equal((await service.list('u')).length, 1); assert.equal(f.issued(), 0);
});
test('pending association alone denies direct access', async () => {
  const f = accessFixture(); await assert.rejects(service.locate('u', 'a', {})); assert.equal(f.issued(), 0);
});
test('correct pair delegates existing identity in selected client tenant', async () => {
  const f = accessFixture(); const result = await service.locate('u', 'a', { telefone: phone, data_nascimento: TEST_BIRTH_DATE, tenant_id: 'professional-tenant' });
  assert.equal(result.identity.clientId, 'c'); assert.equal(f.issued(), 1);
});
test('wrong birth denies before issuing token', async () => {
  const f = accessFixture(); await assert.rejects(service.locate('u', 'a', { telefone: phone, data_nascimento: TEST_OTHER_BIRTH_DATE })); assert.equal(f.issued(), 0);
});
test('other client or other authenticated user cannot use association', async () => {
  const f = accessFixture(); f.context.cliente_id = 'other';
  await assert.rejects(service.locate('u', 'a', { telefone: phone, data_nascimento: TEST_BIRTH_DATE }));
  await assert.rejects(service.locate('other-user', 'a', {})); assert.equal(f.issued(), 0);
});
test('TC of a different client is denied before existing identity flow', async () => {
  const f = accessFixture(); mock.method(ir, 'findToken', async () => ({ cliente_id: 'other', tenant_id: 'client-tenant' }));
  await assert.rejects(service.locate('u', 'a', { token: 'synthetic' })); assert.equal(f.issued(), 0);
});
test('reconciliation failure does not undo successful primary operation', async () => {
  mock.method(repo, 'candidates', async () => { throw Object.assign(Error(), { code: '42P01' }); });
  assert.equal((await service.reconcileUsuarioClienteByPhone({ usuarioId: 'u' })).status, 'indisponivel');
});
