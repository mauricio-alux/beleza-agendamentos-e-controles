const test = require('node:test');
const assert = require('node:assert/strict');
const teamRepository = require('./team.repository');
const teamService = require('./team.service');

const tenantId = '11111111-1111-4111-8111-111111111111';
const professionalId = '22222222-2222-4222-8222-222222222222';
const roleId = '33333333-3333-4333-8333-333333333333';
const hairSpecialtyId = '44444444-4444-4444-8444-444444444444';
const braidsSpecialtyId = '55555555-5555-4555-8555-555555555555';
const braidsServiceId = '66666666-6666-4666-8666-666666666666';
const hydrationServiceId = '77777777-7777-4777-8777-777777777777';

const role = {
  id: roleId,
  nome: 'Cabeleireira',
  categoria_profissional: 'operacional',
  ativo: true
};

const hairSpecialty = {
  id: hairSpecialtyId,
  cargo_id: roleId,
  nome: 'Corte Feminino',
  taxonomy_category_key: 'cabelo',
  ativo: true,
  cargo: role
};

const braidsSpecialty = {
  id: braidsSpecialtyId,
  cargo_id: roleId,
  nome: 'Trancista',
  taxonomy_category_key: 'cabelo',
  ativo: true,
  tenant_id: tenantId,
  cargo: role
};

const braidsService = {
  id: braidsServiceId,
  tenant_id: tenantId,
  nome: 'Trancas',
  categoria: 'cabelo',
  taxonomy_category_key: 'cabelo',
  duracao_minutos: 60,
  preco: 120,
  ativo: true
};

const hydrationService = {
  id: hydrationServiceId,
  tenant_id: tenantId,
  nome: 'Hidratacao',
  categoria: 'terapia_capilar',
  taxonomy_category_key: 'terapia_capilar',
  duracao_minutos: 60,
  preco: 100,
  ativo: true
};

function buildProfessional() {
  return {
    id: professionalId,
    tenant_id: tenantId,
    nome_publico: 'Karol Fernanda',
    cargo_id: roleId,
    cargo: role.nome,
    cargo_ref: role,
    percentual_comissao: 60,
    aceita_agendamento_online: true,
    ativo: true,
    metadata: {
      tipo_usuario: 'Terceiro',
      vinculo_tipo: 'partner'
    },
    profissional_especialidades: [
      {
        especialidade_id: hairSpecialtyId,
        ativo: true,
        deleted_at: null,
        especialidade: hairSpecialty
      }
    ],
    profissional_servicos: []
  };
}

function installRepositoryMocks({ services, links }) {
  const originals = {};
  const calls = {
    atomic: [],
    replaceSpecialties: 0,
    replaceServices: 0
  };

  const replace = (name, implementation) => {
    originals[name] = teamRepository[name];
    teamRepository[name] = implementation;
  };

  replace('findById', async () => buildProfessional());
  replace('findRoleById', async () => role);
  replace('listActiveServicesByTenant', async () => services);
  replace('listSpecialties', async () => [hairSpecialty, braidsSpecialty]);
  replace('listServicesBySpecialtyIds', async () => services);
  replace('listSpecialtiesByIds', async (ids) => (
    [hairSpecialty, braidsSpecialty].filter((specialty) => ids.includes(specialty.id))
  ));
  replace('listTenantSpecialtyStatuses', async () => []);
  replace('listServicesByIds', async (_tenantId, ids) => (
    services.filter((service) => ids.includes(service.id))
  ));
  replace('listServiceSpecialtyLinks', async () => links);
  replace('updateWithOperationalLinks', async (...args) => {
    calls.atomic.push(args);
    return buildProfessional();
  });
  replace('replaceSpecialties', async () => {
    calls.replaceSpecialties += 1;
  });
  replace('replaceServices', async () => {
    calls.replaceServices += 1;
  });

  return {
    calls,
    restore() {
      Object.entries(originals).forEach(([name, implementation]) => {
        teamRepository[name] = implementation;
      });
    }
  };
}

test('persists compatible specialties and services through one atomic repository call', async () => {
  const mocks = installRepositoryMocks({
    services: [braidsService],
    links: [{
      servico_id: braidsServiceId,
      especialidade_id: braidsSpecialtyId,
      especialidade: braidsSpecialty
    }]
  });

  try {
    await teamService.update(tenantId, professionalId, {
      nome_publico: 'Karol Fernanda',
      tipo_usuario: 'Terceiro',
      cargo_id: roleId,
      percentual_comissao: 60,
      aceita_agendamento_online: true,
      especialidade_ids: [hairSpecialtyId, braidsSpecialtyId],
      servico_ids: [braidsServiceId]
    });

    assert.equal(mocks.calls.atomic.length, 1);
    assert.equal(mocks.calls.replaceSpecialties, 0);
    assert.equal(mocks.calls.replaceServices, 0);
    assert.deepEqual(mocks.calls.atomic[0][3], [hairSpecialtyId, braidsSpecialtyId]);
    assert.deepEqual(mocks.calls.atomic[0][4], [braidsServiceId]);
  } finally {
    mocks.restore();
  }
});

test('persists a service independently from the main cargo and specialties', async () => {
  const mocks = installRepositoryMocks({
    services: [hydrationService],
    links: [{
      servico_id: hydrationServiceId,
      especialidade_id: hairSpecialtyId,
      especialidade: hairSpecialty
    }]
  });

  try {
    await teamService.update(tenantId, professionalId, {
      nome_publico: 'Karol Fernanda',
      tipo_usuario: 'Terceiro',
      cargo_id: roleId,
      percentual_comissao: 60,
      aceita_agendamento_online: true,
      especialidade_ids: [hairSpecialtyId, braidsSpecialtyId],
      servico_ids: [hydrationServiceId]
    });

    assert.equal(mocks.calls.atomic.length, 1);
    assert.deepEqual(mocks.calls.atomic[0][4], [hydrationServiceId]);
    assert.equal(mocks.calls.replaceSpecialties, 0);
    assert.equal(mocks.calls.replaceServices, 0);
  } finally {
    mocks.restore();
  }
});
