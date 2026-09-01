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

test('autonomous context cannot maintain global operational profile governance', async () => {
  const service = loadServiceWithRepository({});

  await assert.rejects(
    () => service.updateAdminProfileRole(
      { role: 'Autonomo' },
      'profile-1',
      { cargo_id: 'role-1' }
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
    findCargoForProfile: async () => ({ cargo_id: 'role-1' }),
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

test('MasterAdmin role governance rejects roles outside the business type taxonomy context', async () => {
  const service = loadServiceWithRepository({
    findProfileById: async () => ({ id: 'profile-1', tipo_negocio_id: 'business-type-1', metadata: {} }),
    findCargoForProfile: async () => null
  });

  await assert.rejects(
    () => service.updateAdminProfileRole(
      { role: 'MasterAdmin' },
      'profile-1',
      { cargo_id: 'role-outside' }
    ),
    (error) => error.statusCode === 422 && error.code === 'PROFILE_ROLE_NOT_ALLOWED_FOR_BUSINESS_TYPE'
  );
});

test('MasterAdmin role governance persists and reloads one profile role without duplicates', async () => {
  const persistedRoles = new Map();
  const profile = { id: 'profile-1', tipo_negocio_id: 'business-type-1', nome: 'Perfil teste', metadata: {} };
  const role = { id: 'role-1', nome: 'Cargo teste', categoria_profissional: 'operacional', ativo: true };
  const service = loadServiceWithRepository({
    findProfileById: async (profileId) => (profileId === profile.id ? profile : null),
    findCargoForProfile: async () => ({ cargo_id: role.id }),
    upsertProfileRole: async (profileId, input) => {
      const key = `${profileId}:${input.cargo_id}`;
      const saved = {
        id: persistedRoles.get(key)?.id || 'profile-role-1',
        perfil_operacional_id: profileId,
        cargo_id: input.cargo_id,
        recomendado: input.recomendado !== false,
        principal: input.principal === true,
        ativo: input.ativo !== false,
        prioridade: input.prioridade ?? 0,
        metadata: input.metadata || {},
        cargo: role
      };
      persistedRoles.set(key, saved);
      return saved;
    },
    listProfiles: async () => [profile],
    listProfileServices: async () => [],
    listProfileRoles: async () => Array.from(persistedRoles.values()).filter((item) => item.ativo !== false),
    listProfileDefaults: async () => [],
    listCompatibleServicesForBusinessType: async () => [],
    listCompatibleRolesForBusinessType: async () => []
  });

  await service.updateAdminProfileRole(
    { role: 'MasterAdmin' },
    profile.id,
    { cargo_id: role.id, recomendado: true, prioridade: 0 }
  );
  await service.updateAdminProfileRole(
    { role: 'MasterAdmin' },
    profile.id,
    { cargo_id: role.id, recomendado: true, prioridade: 2 }
  );
  const [reloaded] = await service.listAdminProfiles({ role: 'MasterAdmin' });

  assert.equal(persistedRoles.size, 1);
  assert.equal(reloaded.cargos.length, 1);
  assert.equal(reloaded.cargos[0].cargo_id, role.id);
  assert.equal(reloaded.cargos[0].prioridade, 2);
  assert.equal(reloaded.metrics.cargos, 1);
});

test('MasterAdmin profiles expose recommended cards and compatible dropdown candidates separately', async () => {
  const profile = { id: 'profile-1', tipo_negocio_id: 'business-type-1', nome: 'Perfil teste', metadata: {} };
  const service = loadServiceWithRepository({
    listProfiles: async () => [profile],
    listProfileServices: async () => [
      { servico_catalogo_id: 'service-a', recomendado: true, ativo: true, servico_catalogo: { nome: 'Servico A' } },
      { servico_catalogo_id: 'service-b', recomendado: false, ativo: true, servico_catalogo: { nome: 'Servico B' } }
    ],
    listProfileRoles: async () => [
      { cargo_id: 'role-a', recomendado: true, ativo: true, cargo: { nome: 'Cargo A' } }
    ],
    listProfileDefaults: async () => [],
    listCompatibleServicesForBusinessType: async () => [
      { servico_catalogo_id: 'service-a', servico_catalogo: { nome: 'Servico A' } },
      { servico_catalogo_id: 'service-b', servico_catalogo: { nome: 'Servico B' } },
      { servico_catalogo_id: 'service-c', servico_catalogo: { nome: 'Servico C' } }
    ],
    listCatalogSpecialties: async () => [],
    listCompatibleRolesForBusinessType: async () => [
      { cargo_id: 'role-a', cargo: { nome: 'Cargo A' } },
      { cargo_id: 'role-b', cargo: { nome: 'Cargo B' } }
    ]
  });

  const [result] = await service.listAdminProfiles({ role: 'MasterAdmin' });

  assert.deepEqual(result.servicos_recomendados.map((item) => item.servico_catalogo_id), ['service-a']);
  assert.deepEqual(result.servicos_candidatos.map((item) => item.servico_catalogo_id), ['service-b', 'service-c']);
  assert.deepEqual(result.cargos_recomendados.map((item) => item.cargo_id), ['role-a']);
  assert.deepEqual(result.cargos_candidatos.map((item) => item.cargo_id), ['role-b']);
  assert.equal(result.metrics.servicos, 1);
  assert.equal(result.metrics.cargos, 1);
});

test('MasterAdmin profiles expose recommended services without defaults as eligible reference services', async () => {
  const profile = { id: 'profile-barber', tipo_negocio_id: 'business-type-barber', nome: 'Perfil Barbearia', metadata: {} };
  const service = loadServiceWithRepository({
    listProfiles: async () => [profile],
    listProfileServices: async () => [
      { servico_catalogo_id: 'finishing', recomendado: true, ativo: true, prioridade: 4, servico_catalogo: { id: 'finishing', nome: 'Acabamento', ativo: true } },
      { servico_catalogo_id: 'mens-cut', recomendado: true, ativo: true, prioridade: 10, servico_catalogo: { id: 'mens-cut', nome: 'Corte masculino', ativo: true } },
      { servico_catalogo_id: 'non-recommended', recomendado: false, ativo: true, prioridade: 99, servico_catalogo: { id: 'non-recommended', nome: 'Nao recomendado', ativo: true } }
    ],
    listProfileRoles: async () => [],
    listProfileDefaults: async () => [
      { id: 'default-mens-cut', servico_catalogo_id: 'mens-cut', especialidade_id: 'specialty-cut', ativo: true }
    ],
    listCompatibleServicesForBusinessType: async () => [
      { servico_catalogo_id: 'finishing', servico_catalogo: { id: 'finishing', nome: 'Acabamento', ativo: true } },
      { servico_catalogo_id: 'mens-cut', servico_catalogo: { id: 'mens-cut', nome: 'Corte masculino', ativo: true } },
      { servico_catalogo_id: 'non-recommended', servico_catalogo: { id: 'non-recommended', nome: 'Nao recomendado', ativo: true } }
    ],
    listCompatibleRolesForBusinessType: async () => [],
    listCatalogSpecialties: async () => [
      {
        servico_catalogo_id: 'finishing',
        especialidade_id: 'specialty-finishing',
        ativo: true,
        especialidade: { id: 'specialty-finishing', nome: 'Acabamento', ativo: true }
      },
      {
        servico_catalogo_id: 'mens-cut',
        especialidade_id: 'specialty-cut',
        ativo: true,
        especialidade: { id: 'specialty-cut', nome: 'Corte Masculino', ativo: true }
      }
    ]
  });

  const [result] = await service.listAdminProfiles({ role: 'MasterAdmin' });
  const recommendedIds = result.servicos_recomendados.map((item) => item.servico_catalogo_id);
  const defaultIds = result.defaults.map((item) => item.servico_catalogo_id);
  const finishing = result.servicos_recomendados.find((item) => item.servico_catalogo_id === 'finishing');

  assert.deepEqual(recommendedIds, ['finishing', 'mens-cut']);
  assert.deepEqual(defaultIds, ['mens-cut']);
  assert.equal(finishing.servico_catalogo.especialidades_compativeis[0].nome, 'Acabamento');
  assert.equal(result.servicos_candidatos.some((item) => item.servico_catalogo_id === 'non-recommended'), true);
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
