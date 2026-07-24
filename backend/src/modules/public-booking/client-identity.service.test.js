const assert = require('node:assert/strict');
const { afterEach, describe, it, mock } = require('node:test');
const repository = require('./client-identity.repository');
const service = require('./client-identity.service');

const tenant = { id: '11111111-1111-4111-8111-111111111111' };
const otherTenantId = '22222222-2222-4222-8222-222222222222';
const clientId = '33333333-3333-4333-8333-333333333333';
const tokenId = '44444444-4444-4444-8444-444444444444';
const link = { id: '55555555-5555-4555-8555-555555555555' };

function clientContext() {
  return {
    tenant_id: tenant.id,
    cliente_id: clientId,
    nome_no_tenant: 'Ana',
    status: 'ativo',
    metadata: {},
    cliente: {
      id: clientId,
      nome: 'Ana',
      telefone: '+5516999999999',
      email: null
    }
  };
}

afterEach(() => mock.restoreAll());

describe('public booking client identity', () => {
  it('creates an identity without requiring email', async () => {
    mock.method(repository, 'findClientByPhone', async () => null);
    mock.method(repository, 'identifyClient', async (payload) => {
      assert.equal(payload.email, null);
      assert.equal(payload.telefone, '+5516999999999');
      return clientId;
    });
    mock.method(repository, 'findClientContext', async () => clientContext());
    mock.method(repository, 'listRecentAppointments', async () => []);

    const result = await service.identify(tenant, link, {
      cliente: {
        nome: 'Ana',
        telefone: '(16) 99999-9999'
      }
    });

    assert.equal(result.recognized, false);
    assert.equal(result.client.nome, 'Ana');
    assert.ok(result.token.length >= 40);
  });

  it('requires a phone when creating a manual public identity', async () => {
    await assert.rejects(
      service.identify(tenant, link, {
        cliente: {
          nome: 'Ana',
          telefone: ''
        }
      }),
      (error) => error.code === 'PUBLIC_CLIENT_PHONE_REQUIRED'
    );
  });

  it('rejects an invalid phone when creating a manual public identity', async () => {
    await assert.rejects(
      service.identify(tenant, link, {
        cliente: {
          nome: 'Ana',
          telefone: '123'
        }
      }),
      (error) => error.code === 'INVALID_PHONE'
    );
  });

  it('requires a phone for lookup-only recovery without a token', async () => {
    await assert.rejects(
      service.identify(tenant, link, {
        lookup_only: true,
        cliente: {
          nome: 'Ana',
          telefone: ''
        }
      }),
      (error) => error.code === 'PUBLIC_CLIENT_PHONE_REQUIRED'
    );
  });

  it('recognizes an existing tenant client by phone', async () => {
    let lookup;
    let identification;
    mock.method(repository, 'findClientByPhone', async (tenantId, telefone) => {
      lookup = { tenantId, telefone };
      return { id: clientId };
    });
    mock.method(repository, 'identifyClient', async (payload) => {
      identification = payload;
      return clientId;
    });
    mock.method(repository, 'findClientContext', async () => clientContext());
    mock.method(repository, 'listRecentAppointments', async () => []);

    const result = await service.identify(tenant, link, {
      cliente: {
        nome: 'Ana',
        telefone: '+5516999999999'
      }
    });

    assert.equal(result.recognized, true);
    assert.equal(result.clientId, clientId);
    assert.deepEqual(lookup, {
      tenantId: tenant.id,
      telefone: '+5516999999999'
    });
    assert.equal(identification.tenantId, tenant.id);
    assert.equal(identification.telefone, '+5516999999999');
    assert.ok(identification.tokenHash);
  });

  it('issues a new token when the same tenant client returns without one', async () => {
    const tokenHashes = [];
    mock.method(repository, 'findClientByPhone', async () => ({ id: clientId }));
    mock.method(repository, 'identifyClient', async (payload) => {
      tokenHashes.push(payload.tokenHash);
      return clientId;
    });
    mock.method(repository, 'findClientContext', async () => clientContext());
    mock.method(repository, 'listRecentAppointments', async () => []);

    const input = {
      cliente: {
        nome: 'Ana',
        telefone: '+5516999999999'
      }
    };
    const first = await service.identify(tenant, link, input);
    const second = await service.identify(tenant, link, input);

    assert.equal(first.clientId, clientId);
    assert.equal(second.clientId, clientId);
    assert.notEqual(first.token, second.token);
    assert.notEqual(tokenHashes[0], tokenHashes[1]);
  });

  it('keeps phone recovery scoped to the current tenant', async () => {
    const tenantLookups = [];
    mock.method(repository, 'findClientByPhone', async (tenantId) => {
      tenantLookups.push(tenantId);
      return null;
    });
    mock.method(repository, 'identifyClient', async (payload) => (
      payload.tenantId === tenant.id ? clientId : otherTenantId
    ));
    mock.method(repository, 'findClientContext', async (tenantId, resolvedClientId) => ({
      ...clientContext(),
      tenant_id: tenantId,
      cliente_id: resolvedClientId,
      cliente: {
        ...clientContext().cliente,
        id: resolvedClientId
      }
    }));
    mock.method(repository, 'listRecentAppointments', async () => []);

    await service.identify(tenant, link, {
      cliente: { nome: 'Ana', telefone: '+5516999999999' }
    });
    await service.identify({ id: otherTenantId }, link, {
      cliente: { nome: 'Ana', telefone: '+5516999999999' }
    });

    assert.deepEqual(tenantLookups, [tenant.id, otherTenantId]);
  });

  it('does not reactivate a client blocked by the tenant', async () => {
    mock.method(repository, 'findClientByPhone', async () => ({
      id: clientId,
      vinculos: [{ status: 'bloqueado' }]
    }));

    await assert.rejects(
      service.identify(tenant, link, {
        cliente: {
          nome: 'Ana',
          telefone: '+5516999999999'
        }
      }),
      (error) => error.code === 'CLIENT_IDENTITY_UNAVAILABLE'
    );
  });

  it('accepts a valid tenant-scoped token', async () => {
    mock.method(repository, 'findToken', async () => ({
      id: tokenId,
      tenant_id: tenant.id,
      cliente_id: clientId,
      expira_em: new Date(Date.now() + 60000).toISOString()
    }));
    mock.method(repository, 'findClientContext', async () => clientContext());
    mock.method(repository, 'touchIdentity', async () => undefined);
    mock.method(repository, 'listRecentAppointments', async () => []);

    const resolvedClientId = await service.resolveClientForAppointment(tenant.id, 'valid-token');
    assert.equal(resolvedClientId, clientId);
  });

  it('rejects a token issued for another tenant', async () => {
    mock.method(repository, 'findToken', async () => ({
      id: tokenId,
      tenant_id: otherTenantId,
      cliente_id: clientId,
      expira_em: new Date(Date.now() + 60000).toISOString()
    }));

    await assert.rejects(
      service.resolveClientForAppointment(tenant.id, 'other-tenant-token'),
      (error) => error.code === 'CLIENT_TOKEN_INVALID'
    );
  });

  it('rejects an expired token', async () => {
    mock.method(repository, 'findToken', async () => ({
      id: tokenId,
      tenant_id: tenant.id,
      cliente_id: clientId,
      expira_em: new Date(Date.now() - 60000).toISOString()
    }));

    await assert.rejects(
      service.resolveClientForAppointment(tenant.id, 'expired-token'),
      (error) => error.code === 'CLIENT_TOKEN_EXPIRED'
    );
  });
});
