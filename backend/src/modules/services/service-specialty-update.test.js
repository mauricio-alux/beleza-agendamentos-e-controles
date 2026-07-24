const assert = require('node:assert/strict');
const { afterEach, describe, it, mock } = require('node:test');
const servicesRepository = require('./services.repository');
const teamRepository = require('../team/team.repository');
const servicesService = require('./services.service');
const { updateServiceSchema } = require('./services.validators');
const { SERVICE_CATEGORIES } = require('../../constants/service-categories');

const tenantId = '11111111-1111-4111-8111-111111111111';
const serviceId = '22222222-2222-4222-8222-222222222222';
const legacyId = '33333333-3333-4333-8333-333333333333';
const canonicalId = '44444444-4444-4444-8444-444444444444';

function specialty(id, cargoActive = true) {
  return {
    id,
    cargo_id: '55555555-5555-4555-8555-555555555555',
    nome: 'Corte Feminino',
    ativo: true,
    taxonomy_category_key: 'cabelo',
    cargo: {
      id: '55555555-5555-4555-8555-555555555555',
      nome: cargoActive ? 'Cabeleireira' : 'Cabeleireira/o',
      categoria_profissional: 'operacional',
      ativo: cargoActive,
      deleted_at: cargoActive ? null : '2026-06-01T00:00:00.000Z'
    }
  };
}

function serviceRow(linkedSpecialty) {
  return {
    id: serviceId,
    tenant_id: tenantId,
    nome: 'Corte de Cabelo',
    duracao_minutos: 45,
    preco: 60,
    categoria: 'cabelo',
    metadata: {},
    ativo: true,
    servico_especialidades: [{
      id: '66666666-6666-4666-8666-666666666666',
      especialidade_id: linkedSpecialty.id,
      ativo: true,
      deleted_at: null,
      especialidade: linkedSpecialty
    }]
  };
}

afterEach(() => mock.restoreAll());

describe('service specialty maintenance', () => {
  it('accepts every official category key used by service updates', () => {
    SERVICE_CATEGORIES.forEach((categoria) => {
      const result = updateServiceSchema.safeParse({ categoria });
      assert.equal(result.success, true, `Expected official category "${categoria}" to be valid`);
    });
  });

  it('identifies the category field when a non-official key is submitted', () => {
    const result = updateServiceSchema.safeParse({ categoria: 'categoria_inexistente' });

    assert.equal(result.success, false);
    assert.deepEqual(result.error.issues[0].path, ['categoria']);
    assert.match(result.error.issues[0].message, /invalid enum value/i);
  });

  it('does not expose a relationship whose specialty cargo is inactive', async () => {
    mock.method(servicesRepository, 'listByTenant', async () => [
      serviceRow(specialty(legacyId, false))
    ]);

    const result = await servicesService.list(tenantId);

    assert.deepEqual(result[0].especialidade_ids, []);
    assert.deepEqual(result[0].especialidades, []);
  });

  it('normalizes a submitted legacy specialty id before replacing links', async () => {
    const canonical = specialty(canonicalId, true);
    let linked = specialty(legacyId, false);
    let replacedIds = [];

    mock.method(servicesRepository, 'findById', async () => serviceRow(linked));
    mock.method(servicesRepository, 'listActiveByCategory', async () => []);
    mock.method(servicesRepository, 'update', async () => ({ id: serviceId }));
    mock.method(servicesRepository, 'replaceSpecialties', async (_tenantId, _serviceId, ids) => {
      replacedIds = ids;
      linked = canonical;
      return [];
    });
    mock.method(teamRepository, 'listSpecialtiesByIds', async () => []);
    mock.method(teamRepository, 'listSpecialtyReferencesByIds', async () => [
      specialty(legacyId, false)
    ]);
    mock.method(teamRepository, 'listSpecialties', async () => [canonical]);

    const result = await servicesService.update(tenantId, serviceId, {
      nome: 'Corte de Cabelo',
      duracao_minutos: 45,
      preco: 60,
      categoria: 'cabelo',
      permite_online: true,
      especialidade_ids: [legacyId]
    });

    assert.deepEqual(replacedIds, [canonicalId]);
    assert.deepEqual(result.especialidade_ids, [canonicalId]);
  });

  it('uses the persisted taxonomy category when the legacy category column is empty', async () => {
    const canonical = specialty(canonicalId, true);
    let linked = canonical;
    let replacedIds = [];
    const current = {
      ...serviceRow(linked),
      categoria: null,
      taxonomy_category_key: 'cabelo',
      metadata: {
        taxonomy_category_key: 'cabelo'
      }
    };

    mock.method(servicesRepository, 'findById', async () => ({
      ...current,
      servico_especialidades: [{
        id: '66666666-6666-4666-8666-666666666666',
        especialidade_id: linked.id,
        ativo: true,
        deleted_at: null,
        especialidade: linked
      }]
    }));
    mock.method(servicesRepository, 'listActiveByCategory', async () => []);
    mock.method(servicesRepository, 'update', async () => ({ id: serviceId }));
    mock.method(servicesRepository, 'replaceSpecialties', async (_tenantId, _serviceId, ids) => {
      replacedIds = ids;
      return [];
    });
    mock.method(teamRepository, 'listSpecialtiesByIds', async () => [canonical]);

    const result = await servicesService.update(tenantId, serviceId, {
      preco: 80,
      especialidade_ids: [canonicalId]
    });

    assert.deepEqual(replacedIds, [canonicalId]);
    assert.equal(result.taxonomy_category_key, 'cabelo');
    assert.deepEqual(result.especialidade_ids, [canonicalId]);
  });
});
