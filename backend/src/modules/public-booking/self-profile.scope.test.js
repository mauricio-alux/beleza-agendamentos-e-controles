const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const repo = require('./client-identity.repository');
const service = require('./client-identity.service');
const validators = require('./public-booking.validators');
afterEach(() => mock.restoreAll());

test('profile HTTP schemas reject missing TC for read and update', () => {
  assert.equal(validators.publicClientMeQuerySchema.safeParse({}).success, false);
  assert.equal(validators.publicClientMeUpdateSchema.safeParse({ nome: 'Synthetic' }).success, false);
});

for (const mode of ['unknown', 'other-tenant', 'expired']) {
  test(`profile read and write reject ${mode} TC before accessing client data`, async () => {
    mock.method(repo, 'findToken', async () => mode === 'unknown' ? null : {
      id: 'synthetic-token-row', tenant_id: mode === 'other-tenant' ? 'tenant-b' : 'tenant-a',
      cliente_id: 'client-a', expira_em: new Date(Date.now() + (mode === 'expired' ? -60000 : 60000)).toISOString()
    });
    mock.method(repo, 'findClientContext', async () => assert.fail('unauthorized profile read'));
    mock.method(repo, 'updateSelfProfile', async () => assert.fail('unauthorized profile write'));
    const code = mode === 'expired' ? 'CLIENT_TOKEN_EXPIRED' : 'CLIENT_TOKEN_INVALID';
    await assert.rejects(service.getSelfProfile('tenant-a', 'synthetic-token'), { code });
    await assert.rejects(service.updateSelfProfile('tenant-a', 'synthetic-token', { nome: 'Synthetic' }), { code });
  });
}

test('profile read uses only TC tenant/client and never expands identity by phone', async () => {
  const calls = [];
  mock.method(repo, 'findToken', async () => ({ id: 'synthetic-token-row', tenant_id: 'tenant-a',
    cliente_id: 'client-a', expira_em: new Date(Date.now() + 60000).toISOString() }));
  mock.method(repo, 'findClientContext', async (tenant, client) => {
    calls.push([tenant, client]);
    assert.deepEqual([tenant, client], ['tenant-a', 'client-a']);
    return { tenant_id: tenant, cliente_id: client, ativo: true, status: 'ativo', aceita_campanhas: false,
      cliente: { id: client, ativo: true, nome: 'Synthetic', telefone: '+5516999999999', email: null } };
  });
  mock.method(repo, 'touchIdentity', async (tenant, client, id) => {
    assert.deepEqual([tenant, client, id], ['tenant-a', 'client-a', 'synthetic-token-row']);
  });
  mock.method(repo, 'listRecentAppointments', async (tenant, client) => {
    assert.deepEqual([tenant, client], ['tenant-a', 'client-a']); return [];
  });
  mock.method(repo, 'findClientByPhone', async () => assert.fail('phone must not authorize profile reads'));
  const profile = await service.getSelfProfile('tenant-a', 'synthetic-token');
  assert.equal(profile.nome, 'Synthetic');
  assert.equal(profile.aceita_campanhas, false);
  assert.ok(calls.length > 0);
});
