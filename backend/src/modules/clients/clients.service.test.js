const assert = require('node:assert/strict');
const { afterEach, describe, it, mock } = require('node:test');
const clientsRepository = require('./clients.repository');
const clientsService = require('./clients.service');

const tenantId = '11111111-1111-4111-8111-111111111111';
const clientId = '22222222-2222-4222-8222-222222222222';
const otherClientId = '33333333-3333-4333-8333-333333333333';

function tenantLink(overrides = {}) {
  return {
    id: '44444444-4444-4444-8444-444444444444',
    tenant_id: tenantId,
    cliente_id: clientId,
    nome_no_tenant: 'Ana Silva',
    observacoes: null,
    aceita_campanhas: true,
    status: 'ativo',
    qtd_atendimentos: 2,
    total_gasto: 120,
    ultimo_atendimento: null,
    created_at: '2026-08-01T12:00:00.000Z',
    cliente: {
      id: clientId,
      nome: 'Ana Silva',
      telefone: '+5516999999999',
      email: 'ana@example.com',
      observacoes: null,
      metadata: {}
    },
    ...overrides
  };
}

afterEach(() => mock.restoreAll());

describe('clients service maintenance', () => {
  it('updates a tenant-scoped client and preserves the current list shape', async () => {
    const writes = {};

    mock.method(clientsRepository, 'findTenantLink', async (receivedTenantId, receivedClientId) => {
      assert.equal(receivedTenantId, tenantId);
      assert.equal(receivedClientId, clientId);
      return tenantLink();
    });
    mock.method(clientsRepository, 'findClientByPhone', async () => ({ id: clientId }));
    mock.method(clientsRepository, 'updateClient', async (receivedClientId, payload) => {
      writes.client = { receivedClientId, payload };
      return {
        id: clientId,
        nome: payload.nome,
        telefone: payload.telefone,
        email: payload.email,
        observacoes: payload.observacoes,
        metadata: payload.metadata
      };
    });
    mock.method(clientsRepository, 'updateTenantLink', async (receivedTenantId, receivedClientId, payload) => {
      writes.link = { receivedTenantId, receivedClientId, payload };
      return tenantLink({
        nome_no_tenant: payload.nome_no_tenant,
        observacoes: payload.observacoes,
        aceita_campanhas: payload.aceita_campanhas,
        status: payload.status
      });
    });

    const result = await clientsService.update(tenantId, clientId, {
      nome: 'Ana Paula',
      telefone: '(16) 98888-7777',
      email: 'ana.paula@example.com',
      observacoes: 'Prefere contato pela manha.',
      endereco: {
        cep: '14000-000',
        uf: 'SP',
        cidade: 'Ribeirao Preto',
        logradouro: 'Rua Central',
        numero: '12'
      },
      aceita_campanhas: false,
      status: 'inativo'
    });

    assert.equal(writes.client.receivedClientId, clientId);
    assert.equal(writes.client.payload.telefone, '+5516988887777');
    assert.equal(writes.client.payload.metadata.endereco.cep, '14000000');
    assert.deepEqual(writes.link, {
      receivedTenantId: tenantId,
      receivedClientId: clientId,
      payload: {
        nome_no_tenant: 'Ana Paula',
        observacoes: 'Prefere contato pela manha.',
        aceita_campanhas: false,
        status: 'inativo',
        ativo: false
      }
    });
    assert.equal(result.id, clientId);
    assert.equal(result.nome, 'Ana Paula');
    assert.equal(result.status, 'inativo');
  });

  it('rejects updates when the client is not linked to the tenant', async () => {
    mock.method(clientsRepository, 'findTenantLink', async () => null);

    await assert.rejects(
      clientsService.update(tenantId, clientId, {
        nome: 'Ana',
        telefone: '+5516999999999'
      }),
      (error) => error.statusCode === 404
    );
  });

  it('rejects duplicated WhatsApp inside the same tenant', async () => {
    mock.method(clientsRepository, 'findTenantLink', async () => tenantLink());
    mock.method(clientsRepository, 'findClientByPhone', async () => ({ id: otherClientId }));

    await assert.rejects(
      clientsService.update(tenantId, clientId, {
        nome: 'Ana',
        telefone: '+5516999999999'
      }),
      (error) => error.code === 'CLIENT_PHONE_DUPLICATE'
    );
  });
});
