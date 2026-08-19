const assert = require('node:assert/strict');
const { afterEach, beforeEach, describe, it, mock } = require('node:test');
const repository = require('./business-types.repository');
const service = require('./business-types.service');
const eventLogsService = require('../event-logs/eventLogs.service');
const tenantServiceCatalogSync = require('../services/tenant-service-catalog-sync.service');
const {
  businessTypeSchema,
  catalogAssociationSchema,
  catalogPayloadSchema,
  updateBusinessTypeSchema,
  updateCatalogPayloadSchema
} = require('./business-types.validators');

const tenantId = '11111111-1111-4111-8111-111111111111';
const principalTypeId = '22222222-2222-4222-8222-222222222222';
const complementaryTypeId = '33333333-3333-4333-8333-333333333333';
const inactiveTypeId = '44444444-4444-4444-8444-444444444444';
const catalogA = '55555555-5555-4555-8555-555555555555';
const catalogB = '66666666-6666-4666-8666-666666666666';
const roleId = 'abababab-abab-4bab-8bab-abababababab';
const specialtyId = 'bcbcbcbc-bcbc-4cbc-8cbc-bcbcbcbcbcbc';

afterEach(() => mock.restoreAll());

beforeEach(() => {
  mock.method(eventLogsService, 'logEvent', async () => null);
  mock.method(tenantServiceCatalogSync, 'syncTenant', async () => null);
  mock.method(tenantServiceCatalogSync, 'syncTenantsByTypeIds', async () => []);
  mock.method(tenantServiceCatalogSync, 'syncAllTenants', async () => []);
});

function typeRow(id, slug, nome = slug) {
  return {
    id,
    nome,
    slug,
    descricao: null,
    icone: null,
    ativo: true,
    ordem_exibicao: 0,
    criado_em: '2026-07-30T10:00:00.000Z',
    atualizado_em: '2026-07-30T10:00:00.000Z'
  };
}

function catalogRow(id, nome) {
  return {
    id,
    codigo_canonico: nome.toUpperCase(),
    nome,
    categoria_key: 'cabelo',
    descricao: null,
    natureza: 'recorrente',
    ativo: true,
    metadata: {}
  };
}

function roleRow(id = roleId, nome = 'Cabeleireira/o') {
  return {
    id,
    nome,
    descricao: null,
    categoria_profissional: 'operacional',
    ativo: true
  };
}

function specialtyRow(id = specialtyId, nome = 'Colorimetria') {
  return {
    id,
    cargo_id: roleId,
    nome,
    descricao: null,
    ativo: true,
    tenant_id: null,
    taxonomy_category_key: 'cabelo',
    is_official: true,
    is_custom: false,
    cargo: roleRow()
  };
}

describe('business types MER segmentation', () => {
  it('normalizes slug on create and update payloads', () => {
    const create = businessTypeSchema.parse({ nome: 'Clinica de Estetica Avancada' });
    const update = updateBusinessTypeSchema.parse({ slug: 'Spa / Day Spa' });

    assert.equal(create.slug, 'clinica-de-estetica-avancada');
    assert.equal(update.slug, 'spa-day-spa');
  });

  it('requires an exact official category key for service catalog maintenance', () => {
    const parsed = catalogPayloadSchema.parse({
      nome: 'Corte',
      categoria_key: 'cabelo'
    });

    assert.equal(parsed.categoria_key, 'cabelo');
    assert.equal(catalogPayloadSchema.safeParse({ nome: 'Corte', categoria_key: 'manicure' }).success, false);
    assert.equal(catalogPayloadSchema.safeParse({ nome: 'Corte' }).success, false);
    assert.equal(updateCatalogPayloadSchema.safeParse({ categoria_key: 'categoria_inativa' }).success, false);
  });

  it('requires numeric catalog association order when the field is sent', () => {
    const valid = catalogAssociationSchema.safeParse({
      servicos: [{
        servico_catalogo_id: catalogA,
        recomendado: false,
        ativo: true
      }]
    });
    const invalid = catalogAssociationSchema.safeParse({
      servicos: [{
        servico_catalogo_id: catalogA,
        recomendado: false,
        ativo: true,
        ordem_exibicao: null
      }]
    });

    assert.equal(valid.success, true);
    assert.equal(valid.data.servicos[0].ordem_exibicao, 0);
    assert.equal(invalid.success, false);
  });

  it('requires MasterAdmin context for global maintenance', async () => {
    await assert.rejects(
      () => service.createAdminType({ role: 'Administrador', usuario: { tipo_usuario: 'Administrador' } }, { nome: 'Teste' }),
      /Apenas MasterAdmin/
    );
  });

  it('rejects inactive or nonexistent tenant business types', async () => {
    mock.method(repository, 'listTypes', async () => [typeRow(principalTypeId, 'salao-de-beleza')]);

    await assert.rejects(
      () => service.replaceTenantTypes(
        { tenantId, usuario: { id: '77777777-7777-4777-8777-777777777777' } },
        {
          principal_tipo_negocio_id: principalTypeId,
          tipo_negocio_ids: [principalTypeId, inactiveTypeId]
        }
      ),
      /Tipo de negocio inativo ou inexistente/
    );
  });

  it('returns unioned tenant catalog with recommended services deduplicated', async () => {
    mock.method(repository, 'listTenantTypes', async () => [
      {
        id: '77777777-7777-4777-8777-777777777777',
        tenant_id: tenantId,
        tipo_negocio_id: principalTypeId,
        principal: true,
        ativo: true,
        tipo_negocio: typeRow(principalTypeId, 'salao-de-beleza', 'Salao de Beleza')
      },
      {
        id: '88888888-8888-4888-8888-888888888888',
        tenant_id: tenantId,
        tipo_negocio_id: complementaryTypeId,
        principal: false,
        ativo: true,
        tipo_negocio: typeRow(complementaryTypeId, 'spa-day-spa', 'Spa')
      }
    ]);
    mock.method(repository, 'listAllCatalog', async () => [
      catalogRow(catalogA, 'Corte'),
      catalogRow(catalogB, 'Massagem')
    ]);
    mock.method(repository, 'listTypeServices', async (typeId) => {
      if (typeId === principalTypeId) {
        return [{
          id: '99999999-9999-4999-8999-999999999999',
          tipo_negocio_id: principalTypeId,
          servico_catalogo_id: catalogA,
          recomendado: true,
          ativo: true,
          ordem_exibicao: 0,
          servico_catalogo: catalogRow(catalogA, 'Corte')
        }];
      }
      return [{
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        tipo_negocio_id: complementaryTypeId,
        servico_catalogo_id: catalogA,
        recomendado: false,
        ativo: true,
        ordem_exibicao: 0,
        servico_catalogo: catalogRow(catalogA, 'Corte')
      }];
    });

    const result = await service.listTenantApplicableCatalog(tenantId);

    assert.equal(result.recomendados.length, 1);
    assert.equal(result.recomendados[0].id, catalogA);
    assert.equal(result.recomendados[0].tipos_negocio.length, 2);
    assert.equal(result.catalogo_adicional.length, 0);
  });

  it('blocks removing a tenant type when active offers depend only on it', async () => {
    mock.method(repository, 'listTypes', async () => [
      typeRow(principalTypeId, 'salao-de-beleza'),
      typeRow(complementaryTypeId, 'nail-studio')
    ]);
    mock.method(repository, 'listTenantTypes', async () => [
      {
        id: '77777777-7777-4777-8777-777777777777',
        tenant_id: tenantId,
        tipo_negocio_id: principalTypeId,
        principal: true,
        ativo: true,
        tipo_negocio: typeRow(principalTypeId, 'salao-de-beleza')
      },
      {
        id: '88888888-8888-4888-8888-888888888888',
        tenant_id: tenantId,
        tipo_negocio_id: complementaryTypeId,
        principal: false,
        ativo: true,
        tipo_negocio: typeRow(complementaryTypeId, 'nail-studio')
      }
    ]);
    mock.method(repository, 'listTenantActiveOffers', async () => [
      { id: 'offer-1', servico_catalogo_id: catalogB, servico_catalogo: catalogRow(catalogB, 'Alongamento') }
    ]);
    mock.method(repository, 'listTypeServices', async (typeId) => {
      if (typeId === complementaryTypeId) {
        return [{
          tipo_negocio_id: complementaryTypeId,
          servico_catalogo_id: catalogB,
          recomendado: true,
          ativo: true,
          servico_catalogo: catalogRow(catalogB, 'Alongamento')
        }];
      }
      return [{
        tipo_negocio_id: principalTypeId,
        servico_catalogo_id: catalogA,
        recomendado: true,
        ativo: true,
        servico_catalogo: catalogRow(catalogA, 'Corte')
      }];
    });

    await assert.rejects(
      () => service.replaceTenantTypes(
        { tenantId, usuario: { id: '77777777-7777-4777-8777-777777777777' } },
        {
          principal_tipo_negocio_id: principalTypeId,
          tipo_negocio_ids: [principalTypeId]
        }
      ),
      (error) => error.code === 'TENANT_BUSINESS_TYPE_REMOVAL_IMPACT'
    );
  });

  it('accepts an empty complementary list and keeps only the principal type', async () => {
    let persistedRows = null;
    let syncedTenantId = null;
    mock.method(repository, 'listTypes', async () => [
      typeRow(principalTypeId, 'salao-de-beleza'),
      typeRow(complementaryTypeId, 'nail-studio')
    ]);
    mock.method(repository, 'listTenantTypes', async () => [
      {
        id: '77777777-7777-4777-8777-777777777777',
        tenant_id: tenantId,
        tipo_negocio_id: principalTypeId,
        principal: true,
        ativo: true,
        tipo_negocio: typeRow(principalTypeId, 'salao-de-beleza')
      },
      {
        id: '88888888-8888-4888-8888-888888888888',
        tenant_id: tenantId,
        tipo_negocio_id: complementaryTypeId,
        principal: false,
        ativo: true,
        tipo_negocio: typeRow(complementaryTypeId, 'nail-studio')
      }
    ]);
    mock.method(repository, 'listTenantActiveOffers', async () => []);
    mock.method(repository, 'replaceTenantTypes', async (receivedTenantId, rows) => {
      persistedRows = rows;
      return rows.map((row, index) => ({
        id: `saved-${index}`,
        tenant_id: receivedTenantId,
        tipo_negocio_id: row.tipo_negocio_id,
        principal: row.principal,
        ativo: true,
        descricao_tipo_negocio: row.descricao_tipo_negocio,
        tipo_negocio: typeRow(row.tipo_negocio_id, row.principal ? 'salao-de-beleza' : 'nail-studio')
      }));
    });
    mock.method(tenantServiceCatalogSync, 'syncTenant', async (receivedTenantId) => {
      syncedTenantId = receivedTenantId;
      return null;
    });

    const result = await service.replaceTenantTypes(
      { tenantId, usuario: { id: '77777777-7777-4777-8777-777777777777' } },
      {
        principal_tipo_negocio_id: principalTypeId,
        tipo_negocio_ids: []
      }
    );

    assert.equal(result.length, 1);
    assert.equal(syncedTenantId, tenantId);
    assert.deepEqual(persistedRows.map((row) => ({ tipo_negocio_id: row.tipo_negocio_id, principal: row.principal })), [
      { tipo_negocio_id: principalTypeId, principal: true }
    ]);
  });

  it('does not persist the principal as a complementary type when payload is duplicated', async () => {
    let persistedRows = null;
    mock.method(repository, 'listTypes', async () => [
      typeRow(principalTypeId, 'salao-de-beleza'),
      typeRow(complementaryTypeId, 'nail-studio')
    ]);
    mock.method(repository, 'listTenantTypes', async () => []);
    mock.method(repository, 'listTenantActiveOffers', async () => []);
    mock.method(repository, 'replaceTenantTypes', async (receivedTenantId, rows) => {
      persistedRows = rows;
      return rows.map((row, index) => ({
        id: `saved-${index}`,
        tenant_id: receivedTenantId,
        tipo_negocio_id: row.tipo_negocio_id,
        principal: row.principal,
        ativo: true,
        tipo_negocio: typeRow(row.tipo_negocio_id, row.principal ? 'salao-de-beleza' : 'nail-studio')
      }));
    });

    await service.replaceTenantTypes(
      { tenantId, usuario: { id: '77777777-7777-4777-8777-777777777777' } },
      {
        principal_tipo_negocio_id: principalTypeId,
        tipo_negocio_ids: [principalTypeId, principalTypeId, complementaryTypeId]
      }
    );

    assert.deepEqual(persistedRows.map((row) => ({ tipo_negocio_id: row.tipo_negocio_id, principal: row.principal })), [
      { tipo_negocio_id: principalTypeId, principal: true },
      { tipo_negocio_id: complementaryTypeId, principal: false }
    ]);
  });

  it('requires a principal tenant business type', async () => {
    await assert.rejects(
      () => service.replaceTenantTypes(
        { tenantId, usuario: { id: '77777777-7777-4777-8777-777777777777' } },
        {
          principal_tipo_negocio_id: null,
          tipo_negocio_ids: [complementaryTypeId]
        }
      ),
      (error) => error.code === 'TENANT_PRIMARY_BUSINESS_TYPE_REQUIRED'
    );
  });

  it('creates global roles only through MasterAdmin context', async () => {
    let payload = null;
    mock.method(repository, 'createRole', async (receivedPayload) => {
      payload = receivedPayload;
      return roleRow(roleId, receivedPayload.nome);
    });

    const result = await service.createAdminRole(
      { role: 'MasterAdmin', userId: '77777777-7777-4777-8777-777777777777' },
      { nome: 'Barbeiro', categoria_profissional: 'operacional', ativo: true }
    );

    assert.equal(result.nome, 'Barbeiro');
    assert.deepEqual(payload, {
      nome: 'Barbeiro',
      descricao: null,
      categoria_profissional: 'operacional',
      ativo: true
    });
  });

  it('creates official specialties with null tenant scope', async () => {
    let payload = null;
    mock.method(repository, 'findRoleById', async () => roleRow());
    mock.method(repository, 'createSpecialty', async (receivedPayload) => {
      payload = receivedPayload;
      return specialtyRow(specialtyId, receivedPayload.nome);
    });

    const result = await service.createAdminSpecialty(
      { role: 'MasterAdmin', userId: '77777777-7777-4777-8777-777777777777' },
      {
        cargo_id: roleId,
        nome: 'Colorimetria',
        taxonomy_category_key: 'cabelo',
        ativo: true
      }
    );

    assert.equal(result.tenant_id, null);
    assert.equal(result.is_official, true);
    assert.equal(payload.tenant_id, null);
    assert.equal(payload.is_custom, false);
    assert.equal(payload.metadata.origem, 'masteradmin_governance');
  });
});
