const assert = require('node:assert/strict');
const { afterEach, beforeEach, describe, it, mock } = require('node:test');
const servicesRepository = require('./services.repository');
const teamRepository = require('../team/team.repository');
const businessTypesService = require('../business-types/business-types.service');
const tenantServiceCatalogSync = require('./tenant-service-catalog-sync.service');
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

function merSpecialty(id = canonicalId, nome = 'Corte Feminino') {
  return {
    id,
    cargo_id: '55555555-5555-4555-8555-555555555555',
    nome,
    descricao: null,
    ativo: true,
    tenant_id: null,
    taxonomy_category_key: 'cabelo',
    is_official: true,
    is_custom: false,
    cargo: {
      id: '55555555-5555-4555-8555-555555555555',
      nome: 'Cabeleireira',
      descricao: null,
      categoria_profissional: 'operacional',
      ativo: true,
      deleted_at: null
    }
  };
}

function tenantCustomSpecialty(id = '99999999-9999-4999-8999-999999999999', categoryKey = 'cabelo') {
  return {
    ...merSpecialty(id, 'Trancista'),
    tenant_id: tenantId,
    taxonomy_category_key: categoryKey,
    is_official: false,
    is_custom: true
  };
}

function merCatalog(overrides = {}) {
  return {
    id: serviceId,
    codigo_canonico: 'HAIR_CUT',
    nome: 'Corte de Cabelo',
    categoria_key: 'cabelo',
    descricao: null,
    natureza: 'recorrente',
    ativo: true,
    metadata: {},
    compatibilidades: [{
      id: '77777777-7777-4777-8777-777777777777',
      especialidade_id: canonicalId,
      ativo: true,
      metadata: {},
      especialidade: merSpecialty()
    }],
    ...overrides
  };
}

function merOffer(overrides = {}) {
  return {
    id: legacyId,
    tenant_id: tenantId,
    servico_catalogo_id: serviceId,
    ativo: true,
    metadata: {},
    created_at: '2026-07-29T12:00:00.000Z',
    servico_catalogo: merCatalog(),
    configuracoes: [{
      id: '88888888-8888-4888-8888-888888888888',
      servico_tenant_id: legacyId,
      especialidade_id: canonicalId,
      preco: null,
      duracao_minutos: 45,
      dias_retorno_recomendado: null,
      aceita_agendamento_online: true,
      ativo: true,
      metadata: {},
      especialidade: merSpecialty()
    }],
    ...overrides
  };
}

afterEach(() => mock.restoreAll());

beforeEach(() => {
  mock.method(tenantServiceCatalogSync, 'syncTenant', async () => null);
});

function allowCatalog() {
  mock.method(businessTypesService, 'ensureCatalogAllowedForTenant', async () => merCatalog());
}

describe('services MER phase 3', () => {
  it('accepts every official category key used by service updates', () => {
    SERVICE_CATEGORIES.forEach((categoria) => {
      const result = updateServiceSchema.safeParse({ categoria });
      assert.equal(result.success, true, `Expected official category "${categoria}" to be valid`);
    });
  });

  it('lists tenant offers from the new MER and preserves nullable price and return fields', async () => {
    let listOptions = null;
    mock.method(servicesRepository, 'listByTenant', async (_tenantId, options) => {
      listOptions = options;
      return [merOffer()];
    });

    const result = await servicesService.list(tenantId);

    assert.equal(result[0].id, legacyId);
    assert.equal(result[0].servico_tenant_id, legacyId);
    assert.equal(result[0].servico_catalogo_id, serviceId);
    assert.equal(result[0].codigo_canonico, 'HAIR_CUT');
    assert.equal(result[0].natureza, 'recorrente');
    assert.equal(result[0].preco, null);
    assert.equal(result[0].dias_retorno_recomendado, null);
    assert.equal(result[0].disponivel_ao_tenant, true);
    assert.equal(listOptions.activeOnly, false);
    assert.deepEqual(result[0].especialidade_ids, [canonicalId]);
  });

  it('creates an offer and writes operational configuration to servico_tenant_especialidades', async () => {
    const persisted = [];

    allowCatalog();
    mock.method(servicesRepository, 'findCatalogById', async () => merCatalog());
    mock.method(servicesRepository, 'findOfferByCatalogId', async () => null);
    mock.method(servicesRepository, 'upsertOffer', async () => merOffer({ configuracoes: [] }));
    mock.method(servicesRepository, 'replaceConfigurations', async (_offerId, configs) => {
      persisted.push(...configs);
      return [];
    });
    mock.method(servicesRepository, 'findOfferById', async () => merOffer({
      configuracoes: persisted.map((config) => ({
        id: 'config-created',
        servico_tenant_id: legacyId,
        metadata: {},
        especialidade: merSpecialty(config.especialidade_id),
        ...config
      }))
    }));

    const result = await servicesService.create(tenantId, {
      servico_catalogo_id: serviceId,
      especialidades_config: [{
        especialidade_id: canonicalId,
        preco: 90,
        duracao_minutos: 50,
        dias_retorno_recomendado: null,
        aceita_agendamento_online: true
      }]
    });

    assert.deepEqual(persisted, [{
      especialidade_id: canonicalId,
      preco: 90,
      duracao_minutos: 50,
      dias_retorno_recomendado: null,
      aceita_agendamento_online: true,
      ativo: true
    }]);
    assert.equal(result.especialidades_config[0].preco, 90);
  });

  it('rejects incompatible specialties using service catalog compatibility', async () => {
    allowCatalog();
    mock.method(servicesRepository, 'findCatalogById', async () => merCatalog());
    mock.method(servicesRepository, 'findOfferByCatalogId', async () => null);
    mock.method(teamRepository, 'listSpecialtiesByIds', async () => []);

    await assert.rejects(
      servicesService.create(tenantId, {
        servico_catalogo_id: serviceId,
        especialidades_config: [{
          especialidade_id: '99999999-9999-4999-8999-999999999999',
          duracao_minutos: 45,
          preco: null
        }]
      }),
      (error) => error.code === 'INCOMPATIBLE_SERVICE_SPECIALTY'
    );
  });

  it('requires positive duration for online bookable combinations', async () => {
    allowCatalog();
    mock.method(servicesRepository, 'findCatalogById', async () => merCatalog());
    mock.method(servicesRepository, 'findOfferByCatalogId', async () => null);

    await assert.rejects(
      servicesService.create(tenantId, {
        servico_catalogo_id: serviceId,
        especialidades_config: [{
          especialidade_id: canonicalId,
          duracao_minutos: null,
          preco: null,
          aceita_agendamento_online: true
        }]
      }),
      (error) => error.code === 'SERVICE_SPECIALTY_DURATION_REQUIRED'
    );
  });

  it('blocks tenant attempts to alter global catalog concepts in updates', async () => {
    mock.method(servicesRepository, 'findOfferById', async () => merOffer());

    await assert.rejects(
      servicesService.update(tenantId, legacyId, { nome: 'Outro nome' }),
      (error) => error.code === 'SERVICE_CATALOG_UPDATE_FORBIDDEN'
    );
  });

  it('updates only tenant offer status and service-specialty configs', async () => {
    const replaced = [];
    let offerActive = true;

    allowCatalog();
    mock.method(servicesRepository, 'findOfferById', async () => merOffer({ ativo: offerActive }));
    mock.method(servicesRepository, 'updateOffer', async (_tenantId, _offerId, payload) => {
      offerActive = payload.ativo;
      return merOffer({ ativo: offerActive });
    });
    mock.method(servicesRepository, 'replaceConfigurations', async (_offerId, configs) => {
      replaced.push(...configs);
      return [];
    });
    mock.method(servicesRepository, 'deactivateConfigurations', async () => {});

    const result = await servicesService.update(tenantId, legacyId, {
      ativo: false,
      especialidades_config: [{
        especialidade_id: canonicalId,
        preco: 120,
        duracao_minutos: 60,
        aceita_agendamento_online: true
      }]
    });

    assert.equal(result.ativo, false);
    assert.equal(replaced[0].preco, 120);
    assert.equal(replaced[0].duracao_minutos, 60);
  });

  it('validates updates against the official catalog-specialty relationship when offer details omit compatibilities', async () => {
    const replaced = [];
    const offerWithoutCompatibilityRows = merOffer({
      servico_catalogo: {
        ...merCatalog(),
        compatibilidades: undefined
      }
    });

    allowCatalog();
    mock.method(servicesRepository, 'findOfferById', async () => offerWithoutCompatibilityRows);
    mock.method(servicesRepository, 'findCatalogById', async () => merCatalog());
    mock.method(servicesRepository, 'replaceConfigurations', async (_offerId, configs) => {
      replaced.push(...configs);
      return [];
    });
    mock.method(servicesRepository, 'deactivateConfigurations', async () => {});

    await servicesService.update(tenantId, legacyId, {
      especialidades_config: [{
        especialidade_id: canonicalId,
        preco: 120,
        duracao_minutos: 60,
        aceita_agendamento_online: true
      }]
    });

    assert.equal(replaced[0].especialidade_id, canonicalId);
    assert.equal(replaced[0].preco, 120);
  });

  it('updates tenant service configs with tenant-scoped custom specialties in the same catalog category', async () => {
    const customId = '99999999-9999-4999-8999-999999999999';
    let replaced = [];

    allowCatalog();
    mock.method(servicesRepository, 'findOfferById', async () => merOffer());
    mock.method(teamRepository, 'listSpecialtiesByIds', async (ids) => ids.includes(customId) ? [tenantCustomSpecialty(customId)] : []);
    mock.method(servicesRepository, 'replaceConfigurations', async (_offerId, configs) => {
      replaced = configs;
      return [];
    });
    mock.method(servicesRepository, 'deactivateConfigurations', async () => {});

    await servicesService.update(tenantId, legacyId, {
      especialidades_config: [{
        especialidade_id: customId,
        preco: 120,
        duracao_minutos: 60,
        aceita_agendamento_online: true
      }]
    });

    assert.equal(replaced[0].especialidade_id, customId);
    assert.equal(replaced[0].preco, 120);
  });

  it('rejects tenant-scoped custom specialties from a different catalog category', async () => {
    const customId = '99999999-9999-4999-8999-999999999999';

    allowCatalog();
    mock.method(servicesRepository, 'findOfferById', async () => merOffer());
    mock.method(teamRepository, 'listSpecialtiesByIds', async () => [tenantCustomSpecialty(customId, 'unhas')]);

    await assert.rejects(
      servicesService.update(tenantId, legacyId, {
        especialidades_config: [{
          especialidade_id: customId,
          preco: 120,
          duracao_minutos: 60,
          aceita_agendamento_online: true
        }]
      }),
      (error) => error.code === 'INCOMPATIBLE_SERVICE_SPECIALTY'
    );
  });

  it('forces online scheduling off when a service-specialty config is inactive', async () => {
    let replaced = [];

    allowCatalog();
    mock.method(servicesRepository, 'findOfferById', async () => merOffer());
    mock.method(servicesRepository, 'replaceConfigurations', async (_offerId, configs) => {
      replaced = configs;
      return [];
    });
    mock.method(servicesRepository, 'deactivateConfigurations', async () => {});

    await servicesService.update(tenantId, legacyId, {
      especialidades_config: [{
        especialidade_id: canonicalId,
        preco: 120,
        duracao_minutos: 60,
        aceita_agendamento_online: true,
        ativo: false
      }]
    });

    assert.equal(replaced[0].ativo, false);
    assert.equal(replaced[0].aceita_agendamento_online, false);
  });

  it('blocks tenant creation of custom global catalog services', async () => {
    mock.method(servicesRepository, 'findCatalogByNameAndCategory', async () => null);

    await assert.rejects(
      servicesService.create(tenantId, {
        nome: 'Tratamento Autoridade Local',
        categoria: 'cabelo',
        servico_ocasional: true,
        especialidade_ids: [canonicalId],
        duracao_minutos: 30,
        preco: null
      }),
      (error) => error.code === 'SERVICE_CATALOG_CREATE_FORBIDDEN'
    );
  });

  it('resolves compatible specialties from servico_catalogo_especialidades and tenant status', async () => {
    allowCatalog();
    mock.method(servicesRepository, 'findCatalogByCode', async () => merCatalog());
    mock.method(servicesRepository, 'listCompatibleSpecialties', async () => [
      { especialidade_id: canonicalId, ativo: true, especialidade: merSpecialty(canonicalId, 'Corte Feminino') },
      { especialidade_id: '99999999-9999-4999-8999-999999999999', ativo: true, especialidade: merSpecialty('99999999-9999-4999-8999-999999999999', 'Coloracao') }
    ]);
    mock.method(teamRepository, 'listSpecialties', async () => []);
    mock.method(teamRepository, 'listTenantSpecialtyStatuses', async () => [
      { especialidade_id: '99999999-9999-4999-8999-999999999999', ativo: false }
    ]);

    const result = await servicesService.resolveCompatibleSpecialties(tenantId, {
      codigo_canonico: 'HAIR_CUT'
    });

    assert.deepEqual(result.map((item) => item.id), [canonicalId]);
  });

  it('includes tenant-scoped custom specialties when resolving compatible specialties by catalog id', async () => {
    const customId = '99999999-9999-4999-8999-999999999999';

    allowCatalog();
    mock.method(servicesRepository, 'findCatalogById', async () => merCatalog());
    mock.method(servicesRepository, 'listCompatibleSpecialties', async () => [
      { especialidade_id: canonicalId, ativo: true, especialidade: merSpecialty(canonicalId, 'Corte Feminino') }
    ]);
    mock.method(teamRepository, 'listSpecialties', async () => [tenantCustomSpecialty(customId)]);
    mock.method(teamRepository, 'listTenantSpecialtyStatuses', async () => []);

    const result = await servicesService.resolveCompatibleSpecialties(tenantId, {
      servico_catalogo_id: serviceId
    });

    assert.deepEqual(result.map((item) => item.id).sort(), [canonicalId, customId].sort());
  });
});

describe.skip('legacy service specialty maintenance before MER phase 3', () => {
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

    assert.deepEqual(replacedIds, [{
      especialidade_id: canonicalId,
      duracao_minutos: 45,
      preco: 60,
      dias_retorno_recomendado: null,
      aceita_agendamento_online: true
    }]);
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

    assert.deepEqual(replacedIds, [{
      especialidade_id: canonicalId,
      duracao_minutos: null,
      preco: 80,
      dias_retorno_recomendado: null,
      aceita_agendamento_online: true
    }]);
    assert.equal(result.taxonomy_category_key, 'cabelo');
    assert.deepEqual(result.especialidade_ids, [canonicalId]);
  });

  it('persists operational pricing per service-specialty link', async () => {
    const canonical = specialty(canonicalId, true);
    let persistedLinks = [];

    mock.method(servicesRepository, 'findById', async () => ({
      ...serviceRow(canonical),
      servico_especialidades: persistedLinks.length ? persistedLinks.map((link) => ({
        id: 'link-config',
        ...link,
        ativo: true,
        deleted_at: null,
        especialidade: canonical
      })) : serviceRow(canonical).servico_especialidades
    }));
    mock.method(servicesRepository, 'listActiveByCategory', async () => []);
    mock.method(servicesRepository, 'update', async () => ({ id: serviceId }));
    mock.method(teamRepository, 'listSpecialtiesByIds', async () => [canonical]);
    mock.method(servicesRepository, 'replaceSpecialties', async (_tenantId, _serviceId, links) => {
      persistedLinks = links;
      return [];
    });

    const result = await servicesService.update(tenantId, serviceId, {
      especialidades_config: [{
        especialidade_id: canonicalId,
        duracao_minutos: 60,
        preco: 90,
        dias_retorno_recomendado: 70,
        aceita_agendamento_online: true
      }]
    });

    assert.deepEqual(persistedLinks, [{
      especialidade_id: canonicalId,
      duracao_minutos: 60,
      preco: 90,
      dias_retorno_recomendado: 70,
      aceita_agendamento_online: true
    }]);
    assert.equal(result.especialidades_config[0].duracao_minutos, 60);
    assert.equal(result.especialidades_config[0].preco, 90);
    assert.equal(result.especialidades_config[0].dias_retorno_recomendado, 70);
  });

  it('preserves existing service-specialty operational values when partial edits only resend ids', async () => {
    const canonical = specialty(canonicalId, true);
    let replacedIds = [];
    const current = {
      ...serviceRow(canonical),
      servico_especialidades: [{
        id: 'link-config',
        especialidade_id: canonicalId,
        duracao_minutos: 75,
        preco: 120,
        dias_retorno_recomendado: 45,
        aceita_agendamento_online: false,
        ativo: true,
        deleted_at: null,
        especialidade: canonical
      }]
    };

    mock.method(servicesRepository, 'findById', async () => current);
    mock.method(servicesRepository, 'listActiveByCategory', async () => []);
    mock.method(servicesRepository, 'update', async () => ({ id: serviceId }));
    mock.method(servicesRepository, 'replaceSpecialties', async (_tenantId, _serviceId, ids) => {
      replacedIds = ids;
      return [];
    });
    mock.method(teamRepository, 'listSpecialtiesByIds', async () => [canonical]);

    await servicesService.update(tenantId, serviceId, {
      especialidade_ids: [canonicalId]
    });

    assert.deepEqual(replacedIds, [{
      especialidade_id: canonicalId,
      duracao_minutos: 75,
      preco: 120,
      dias_retorno_recomendado: 45,
      aceita_agendamento_online: false
    }]);
  });

  it('returns every active specialty in the service category as available for service linking', async () => {
    const eyebrowRole = {
      id: '77777777-7777-4777-8777-777777777777',
      nome: 'Designer de Sobrancelhas',
      categoria_profissional: 'operacional',
      ativo: true,
      deleted_at: null
    };
    const eyebrowSpecialties = [
      ['brow-lamination', 'Brow Lamination'],
      ['design-sobrancelhas', 'Design de Sobrancelhas'],
      ['henna', 'Henna'],
      ['micropigmentacao', 'Micropigmentacao']
    ].map(([id, nome]) => ({
      id,
      cargo_id: eyebrowRole.id,
      nome,
      ativo: true,
      deleted_at: null,
      taxonomy_category_key: 'sobrancelhas',
      cargo: eyebrowRole
    }));

    mock.method(teamRepository, 'listSpecialties', async ({ categoryKey }) => (
      categoryKey === 'sobrancelhas' ? eyebrowSpecialties : []
    ));
    mock.method(teamRepository, 'listTenantSpecialtyStatuses', async () => []);

    const result = await servicesService.resolveCompatibleSpecialties(tenantId, {
      nome: 'Sobrancelhas',
      categoria: 'sobrancelhas'
    });

    assert.deepEqual(result.map((item) => item.nome).sort(), [
      'Brow Lamination',
      'Design de Sobrancelhas',
      'Henna',
      'Micropigmentacao'
    ]);
  });
});
