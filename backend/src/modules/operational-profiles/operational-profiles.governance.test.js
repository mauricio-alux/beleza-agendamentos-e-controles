const assert = require('node:assert/strict');
const test = require('node:test');

function loadServiceWithRepository(repository) {
  const servicePath = require.resolve('./operational-profiles.service');
  const repositoryPath = require.resolve('./operational-profiles.repository');
  delete require.cache[servicePath];
  delete require.cache[repositoryPath];
  require.cache[repositoryPath] = {
    id: repositoryPath,
    filename: repositoryPath,
    loaded: true,
    exports: repository
  };
  return require(servicePath);
}

test('tenant context cannot maintain global operational profile governance', async () => {
  const service = loadServiceWithRepository({});

  await assert.rejects(
    () => service.updateAdminProfileService(
      { role: 'Administrador' },
      'profile-1',
      { servico_catalogo_id: 'service-1' }
    ),
    (error) => error.statusCode === 403 && error.code === 'FORBIDDEN'
  );
});

test('MasterAdmin service governance validates business type and forbids automatic tenant propagation', async () => {
  let savedInput = null;
  const service = loadServiceWithRepository({
    findProfileById: async () => ({ id: 'profile-1', tipo_negocio_id: 'business-type-1', metadata: {} }),
    findCatalogServiceForProfile: async () => ({ id: 'profile-service-link-1' }),
    upsertProfileService: async (profileId, input) => {
      savedInput = { profileId, input };
      return { id: 'saved-profile-service', ...input };
    }
  });

  const result = await service.updateAdminProfileService(
    { role: 'MasterAdmin' },
    'profile-1',
    { servico_catalogo_id: 'service-1', recomendado: true, prioridade: 2 }
  );

  assert.equal(result.id, 'saved-profile-service');
  assert.equal(savedInput.profileId, 'profile-1');
  assert.equal(savedInput.input.metadata.governance, 'masteradmin_global_template');
  assert.equal(savedInput.input.metadata.no_auto_tenant_propagation, true);
  assert.equal(savedInput.input.metadata.tenant_overwrite_policy, 'never_auto_propagate_to_existing_tenants');
});

test('MasterAdmin role governance records principal as ordering-only policy', async () => {
  let savedInput = null;
  const service = loadServiceWithRepository({
    findProfileById: async () => ({ id: 'profile-1', tipo_negocio_id: 'business-type-1', metadata: {} }),
    findCargoSpecialty: async () => ({ id: 'cargo-specialty-link-1' }),
    upsertProfileRole: async (profileId, input) => {
      savedInput = { profileId, input };
      return { id: 'saved-profile-role', ...input };
    }
  });

  await service.updateAdminProfileRole(
    { usuario: { tipo_usuario: 'MasterAdmin' } },
    'profile-1',
    { cargo_id: 'role-1', especialidade_id: 'specialty-1', principal: true }
  );

  assert.equal(savedInput.input.metadata.principal_policy, 'recommendation_ordering_only_never_execution_restriction');
  assert.equal(savedInput.input.metadata.no_auto_tenant_propagation, true);
});

test('MasterAdmin default partial update validates the merged service-specialty relation', async () => {
  let updatedPayload = null;
  const service = loadServiceWithRepository({
    findProfileDefaultById: async () => ({
      id: 'default-1',
      perfil_operacional_id: 'profile-1',
      servico_catalogo_id: 'service-1',
      especialidade_id: 'specialty-1',
      metadata: { original: true }
    }),
    findCatalogServiceForProfile: async (profileId, serviceId) => (
      profileId === 'profile-1' && serviceId === 'service-1' ? { id: 'profile-service-link-1' } : null
    ),
    findCatalogSpecialty: async (serviceId, specialtyId) => (
      serviceId === 'service-1' && specialtyId === 'specialty-2' ? { id: 'service-specialty-link-1' } : null
    ),
    updateProfileDefault: async (id, payload) => {
      updatedPayload = { id, payload };
      return { id, ...payload };
    }
  });

  await service.updateAdminDefault(
    { role: 'MasterAdmin' },
    'default-1',
    { especialidade_id: 'specialty-2', preco_referencia: 45 }
  );

  assert.equal(updatedPayload.id, 'default-1');
  assert.equal(updatedPayload.payload.preco_referencia, 45);
  assert.equal(updatedPayload.payload.metadata.original, true);
  assert.equal(updatedPayload.payload.metadata.no_auto_tenant_propagation, true);
});
