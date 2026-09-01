const assert = require('node:assert/strict');
const { afterEach, mock, test } = require('node:test');
const repository = require('./operational-profiles.repository');
const service = require('./operational-profiles.service');

const tenant = {
  id: 'tenant-1',
  endereco: {
    cidade: 'Franca',
    estado: 'SP',
    pais: 'BR'
  }
};

afterEach(() => mock.restoreAll());

function serviceRow(overrides = {}) {
  return {
    servico_catalogo_id: overrides.servico_catalogo_id || 'service-1',
    recomendado: overrides.recomendado !== false,
    obrigatorio: overrides.obrigatorio === true,
    prioridade: overrides.prioridade || 0,
    ativo: true,
    servico_catalogo: {
      id: overrides.servico_catalogo_id || 'service-1',
      nome: overrides.nome || 'Manicure',
      ativo: true
    }
  };
}

function recommendedPlanIds({ matrixRecommended, profileRecommended }) {
  const plan = service.buildPlan({
    tenant,
    profile: {
      id: 'profile-barber',
      tipo_negocio_id: 'type-barber',
      classificacao: 'especializado'
    },
    services: [{
      ...serviceRow({
        servico_catalogo_id: 'service-barber',
        recomendado: profileRecommended,
        nome: 'Barba'
      }),
      metadata: { matriz_recomendado_legado: matrixRecommended }
    }],
    roles: [],
    defaults: [{
      id: 'default-barber',
      servico_catalogo_id: 'service-barber',
      especialidade_id: 'specialty-barber',
      region_scope: 'global',
      preco_referencia: 45,
      duracao_minutos: 45
    }],
    catalogSpecialties: [specialtyRow('service-barber', 'specialty-barber')],
    existingOffers: []
  });

  return plan.planned.services.map((item) => item.servico_catalogo_id);
}

function specialtyRow(serviceId, specialtyId) {
  return {
    servico_catalogo_id: serviceId,
    especialidade_id: specialtyId,
    especialidade: {
      id: specialtyId,
      nome: specialtyId
    }
  };
}

test('specialized profile prepares recommended services, specialties, roles and defaults for tenant initialization', () => {
  const plan = service.buildPlan({
    tenant,
    profile: {
      id: 'profile-specialized',
      tipo_negocio_id: 'type-nail',
      classificacao: 'especializado'
    },
    services: [serviceRow({ servico_catalogo_id: 'service-manicure' })],
    roles: [{ cargo_id: 'role-manicure', principal: true, cargo: { nome: 'Manicure' } }],
    defaults: [{
      id: 'default-city',
      perfil_operacional_id: 'profile-specialized',
      servico_catalogo_id: 'service-manicure',
      especialidade_id: 'specialty-gel',
      region_scope: 'city',
      country: 'BR',
      state: 'SP',
      city: 'Franca',
      preco_referencia: 50,
      duracao_minutos: 60,
      dias_retorno_recomendado: 21,
      aceita_agendamento_online: true,
      fonte: 'administrative_reference'
    }],
    catalogSpecialties: [specialtyRow('service-manicure', 'specialty-gel')],
    existingOffers: []
  });

  assert.equal(plan.confirmation_policy, 'automated_initial_configuration');
  assert.equal(plan.planned.services.length, 1);
  assert.equal(plan.planned.services[0].combinations[0].defaults.preco, 50);
  assert.equal(plan.planned.services[0].combinations[0].defaults.duracao_minutos, 60);
  assert.equal(plan.planned.services[0].combinations[0].defaults.dias_retorno_recomendado, 21);
  assert.deepEqual(plan.cargos_recomendados, [{ cargo_id: 'role-manicure', nome: 'Manicure', principal: true }]);
});

test('generalist profile does not activate the entire compatible catalog blindly', () => {
  const plan = service.buildPlan({
    tenant,
    profile: {
      id: 'profile-generalist',
      tipo_negocio_id: 'type-salon',
      classificacao: 'generalista'
    },
    services: [
      serviceRow({ servico_catalogo_id: 'service-recommended', recomendado: true }),
      serviceRow({ servico_catalogo_id: 'service-compatible', recomendado: false })
    ],
    roles: [],
    defaults: [],
    catalogSpecialties: [
      specialtyRow('service-recommended', 'specialty-1'),
      specialtyRow('service-compatible', 'specialty-2')
    ],
    existingOffers: []
  });

  assert.equal(plan.confirmation_policy, service.GENERALIST_CONFIRMATION_POLICY);
  assert.deepEqual(plan.planned.services.map((item) => item.servico_catalogo_id), ['service-recommended']);
});

test('default resolution follows city, state, country and global priority', () => {
  const defaults = [
    { id: 'global', servico_catalogo_id: 'service-1', especialidade_id: 'specialty-1', region_scope: 'global', preco_referencia: 10 },
    { id: 'country', servico_catalogo_id: 'service-1', especialidade_id: 'specialty-1', region_scope: 'country', country: 'BR', preco_referencia: 20 },
    { id: 'state', servico_catalogo_id: 'service-1', especialidade_id: 'specialty-1', region_scope: 'state', country: 'BR', state: 'SP', preco_referencia: 30 },
    { id: 'city', servico_catalogo_id: 'service-1', especialidade_id: 'specialty-1', region_scope: 'city', country: 'BR', state: 'SP', city: 'Franca', preco_referencia: 40 }
  ];

  const resolved = service.resolveDefaultForCombination(defaults, 'service-1', 'specialty-1', {
    city: 'franca',
    state: 'sp',
    country: 'BR'
  });

  assert.equal(resolved.id, 'city');
});

test('default resolution falls back to state, country and global when specific scopes are absent', () => {
  const defaults = [
    { id: 'global', servico_catalogo_id: 'service-1', especialidade_id: 'specialty-1', region_scope: 'global', preco_referencia: 60 },
    { id: 'country', servico_catalogo_id: 'service-1', especialidade_id: 'specialty-1', region_scope: 'country', country: 'BR', preco_referencia: 70 },
    { id: 'state', servico_catalogo_id: 'service-1', especialidade_id: 'specialty-1', region_scope: 'state', country: 'BR', state: 'SP', preco_referencia: 80 }
  ];

  assert.equal(service.resolveDefaultForCombination(defaults, 'service-1', 'specialty-1', {
    city: 'ribeirao preto',
    state: 'sp',
    country: 'BR'
  }).id, 'state');
  assert.equal(service.resolveDefaultForCombination(defaults, 'service-1', 'specialty-1', {
    city: 'curitiba',
    state: 'pr',
    country: 'BR'
  }).id, 'country');
  assert.equal(service.resolveDefaultForCombination(defaults, 'service-1', 'specialty-1', {
    city: 'porto',
    state: 'porto',
    country: 'PT'
  }).id, 'global');
});

test('profile defaults preserve online false during tenant initialization planning', () => {
  const plan = service.buildPlan({
    tenant,
    profile: {
      id: 'profile-specialized',
      tipo_negocio_id: 'type-body-piercing',
      classificacao: 'especializado'
    },
    services: [serviceRow({ servico_catalogo_id: 'service-body-piercing' })],
    roles: [],
    defaults: [{
      id: 'default-state',
      servico_catalogo_id: 'service-body-piercing',
      especialidade_id: 'specialty-piercing',
      region_scope: 'state',
      country: 'BR',
      state: 'SP',
      preco_referencia: 120,
      duracao_minutos: 45,
      dias_retorno_recomendado: 90,
      aceita_agendamento_online: false
    }],
    catalogSpecialties: [specialtyRow('service-body-piercing', 'specialty-piercing')],
    existingOffers: []
  });

  assert.equal(plan.planned.services[0].combinations[0].defaults.aceita_agendamento_online, false);
});

test('tenant commercial value remains tenant-owned after initialization', () => {
  const plan = service.buildPlan({
    tenant,
    profile: {
      id: 'profile-specialized',
      tipo_negocio_id: 'type-nail',
      classificacao: 'especializado'
    },
    services: [serviceRow({ servico_catalogo_id: 'service-manicure' })],
    roles: [],
    defaults: [{
      id: 'default-global',
      servico_catalogo_id: 'service-manicure',
      especialidade_id: 'specialty-gel',
      region_scope: 'global',
      preco_referencia: 50,
      duracao_minutos: 60,
      dias_retorno_recomendado: 21
    }],
    catalogSpecialties: [specialtyRow('service-manicure', 'specialty-gel')],
    existingOffers: [{
      id: 'offer-1',
      servico_catalogo_id: 'service-manicure',
      configuracoes: [{
        id: 'config-1',
        especialidade_id: 'specialty-gel',
        preco: 80,
        duracao_minutos: 75,
        dias_retorno_recomendado: 30
      }]
    }]
  });

  assert.equal(plan.planned.services[0].action, 'noop');
  assert.equal(plan.planned.services[0].combinations[0].action, 'update');
  assert.equal(plan.planned.services[0].combinations[0].current_config_id, 'config-1');
});

test('tenant customized config is not overwritten by later default changes', () => {
  const existingOffer = {
    id: 'offer-1',
    servico_catalogo_id: 'service-manicure',
    configuracoes: [{
      id: 'config-1',
      especialidade_id: 'specialty-gel',
      preco: 100,
      duracao_minutos: 75,
      dias_retorno_recomendado: 30,
      aceita_agendamento_online: true,
      ativo: true,
      metadata: {
        config_origin: 'tenant_customized',
        commercial_authority: 'tenant'
      }
    }]
  };

  const plan = service.buildPlan({
    tenant,
    profile: {
      id: 'profile-specialized',
      tipo_negocio_id: 'type-nail',
      classificacao: 'especializado'
    },
    services: [serviceRow({ servico_catalogo_id: 'service-manicure' })],
    roles: [],
    defaults: [{
      id: 'default-updated',
      servico_catalogo_id: 'service-manicure',
      especialidade_id: 'specialty-gel',
      region_scope: 'state',
      country: 'BR',
      state: 'SP',
      preco_referencia: 90,
      duracao_minutos: 60,
      dias_retorno_recomendado: 21,
      aceita_agendamento_online: true
    }],
    catalogSpecialties: [specialtyRow('service-manicure', 'specialty-gel')],
    existingOffers: [existingOffer]
  });

  const combination = plan.planned.services[0].combinations[0];
  assert.equal(combination.action, 'noop');
  assert.equal(combination.tenant_commercial_authority, true);
  assert.equal(combination.defaults.preco, 100);
});

test('tenant added config is not overwritten by profile defaults', () => {
  const plan = service.buildPlan({
    tenant,
    profile: {
      id: 'profile-specialized',
      tipo_negocio_id: 'type-nail',
      classificacao: 'especializado'
    },
    services: [serviceRow({ servico_catalogo_id: 'service-manicure' })],
    roles: [],
    defaults: [{
      id: 'default-updated',
      servico_catalogo_id: 'service-manicure',
      especialidade_id: 'specialty-gel',
      region_scope: 'global',
      preco_referencia: 90,
      duracao_minutos: 60
    }],
    catalogSpecialties: [specialtyRow('service-manicure', 'specialty-gel')],
    existingOffers: [{
      id: 'offer-1',
      servico_catalogo_id: 'service-manicure',
      configuracoes: [{
        id: 'config-1',
        especialidade_id: 'specialty-gel',
        preco: 110,
        duracao_minutos: 45,
        ativo: true,
        metadata: { config_origin: 'tenant_added' }
      }]
    }]
  });

  const combination = plan.planned.services[0].combinations[0];
  assert.equal(combination.action, 'noop');
  assert.equal(combination.defaults.preco, 110);
});

test('profile summaries separate recommended items from compatible candidates', () => {
  const services = [
    serviceRow({ servico_catalogo_id: 'service-a', recomendado: true }),
    serviceRow({ servico_catalogo_id: 'service-b', recomendado: false })
  ];
  const compatibleServices = [
    serviceRow({ servico_catalogo_id: 'service-a', recomendado: true }),
    serviceRow({ servico_catalogo_id: 'service-b', recomendado: false }),
    serviceRow({ servico_catalogo_id: 'service-c', recomendado: false })
  ];
  const roles = [
    { cargo_id: 'role-a', recomendado: true, ativo: true, cargo: { nome: 'Cargo A' } },
    { cargo_id: 'role-c', recomendado: false, ativo: true, cargo: { nome: 'Cargo C' } }
  ];
  const compatibleRoles = [
    { cargo_id: 'role-a', cargo: { nome: 'Cargo A' } },
    { cargo_id: 'role-b', cargo: { nome: 'Cargo B' } },
    { cargo_id: 'role-c', cargo: { nome: 'Cargo C' } }
  ];

  assert.deepEqual(service.recommendedProfileServices(services).map((item) => item.servico_catalogo_id), ['service-a']);
  assert.deepEqual(service.serviceCandidatesForProfile(compatibleServices, services).map((item) => item.servico_catalogo_id), ['service-b', 'service-c']);
  assert.deepEqual(service.recommendedProfileRoles(roles).map((item) => item.cargo_id), ['role-a']);
  assert.deepEqual(service.roleCandidatesForProfile(compatibleRoles, roles).map((item) => item.cargo_id), ['role-b', 'role-c']);
});

test('case I: adding a recommended service writes only to the operational profile relation', async () => {
  let upsertPayload = null;
  mock.method(repository, 'findProfileById', async () => ({
    id: 'profile-barber',
    tipo_negocio_id: 'type-barber',
    metadata: {}
  }));
  mock.method(repository, 'findCatalogServiceForProfile', async () => ({
    tipo_negocio_id: 'type-barber',
    servico_catalogo_id: 'service-barber',
    ativo: true
  }));
  mock.method(repository, 'upsertProfileService', async (profileId, input) => {
    upsertPayload = { profileId, input };
    return { perfil_operacional_id: profileId, ...input };
  });

  await service.updateAdminProfileService(
    { role: 'MasterAdmin', userId: 'master' },
    'profile-barber',
    { servico_catalogo_id: 'service-barber', recomendado: true, ativo: true, prioridade: 10 }
  );

  assert.equal(upsertPayload.profileId, 'profile-barber');
  assert.equal(upsertPayload.input.recomendado, true);
  assert.equal(upsertPayload.input.servico_catalogo_id, 'service-barber');
  assert.equal(upsertPayload.input.metadata.managed_entity, 'perfil_operacional_servicos');
});

test('case J: removing a recommendation keeps the profile service active and does not remove applicability', async () => {
  let upsertPayload = null;
  mock.method(repository, 'findProfileById', async () => ({
    id: 'profile-barber',
    tipo_negocio_id: 'type-barber',
    metadata: {}
  }));
  mock.method(repository, 'findCatalogServiceForProfile', async () => ({
    tipo_negocio_id: 'type-barber',
    servico_catalogo_id: 'service-barber',
    ativo: true
  }));
  mock.method(repository, 'upsertProfileService', async (profileId, input) => {
    upsertPayload = { profileId, input };
    return { perfil_operacional_id: profileId, ...input };
  });

  await service.updateAdminProfileService(
    { role: 'MasterAdmin', userId: 'master' },
    'profile-barber',
    { servico_catalogo_id: 'service-barber', recomendado: false, ativo: true, prioridade: 10 }
  );

  assert.equal(upsertPayload.input.recomendado, false);
  assert.equal(upsertPayload.input.ativo, true);
  assert.equal(upsertPayload.input.servico_catalogo_id, 'service-barber');
});

test('case E: service layer rejects recommending a service outside the business type applicability matrix', async () => {
  mock.method(repository, 'findProfileById', async () => ({
    id: 'profile-barber',
    tipo_negocio_id: 'type-barber',
    metadata: {}
  }));
  mock.method(repository, 'findCatalogServiceForProfile', async () => null);
  mock.method(repository, 'upsertProfileService', async () => {
    throw new Error('should not upsert a non-applicable service');
  });

  await assert.rejects(
    () => service.updateAdminProfileService(
      { role: 'MasterAdmin', userId: 'master' },
      'profile-barber',
      { servico_catalogo_id: 'service-not-applicable', recomendado: true, ativo: true }
    ),
    (error) => error.code === 'PROFILE_SERVICE_NOT_ALLOWED_FOR_BUSINESS_TYPE'
  );
});

test('cases L/M/N: onboarding follows profile recommendation and ignores matrix legacy toggles', () => {
  assert.deepEqual(
    recommendedPlanIds({ matrixRecommended: true, profileRecommended: false }),
    []
  );
  assert.deepEqual(
    recommendedPlanIds({ matrixRecommended: false, profileRecommended: true }),
    ['service-barber']
  );
  assert.deepEqual(
    recommendedPlanIds({ matrixRecommended: true, profileRecommended: true }),
    recommendedPlanIds({ matrixRecommended: false, profileRecommended: true })
  );
});
