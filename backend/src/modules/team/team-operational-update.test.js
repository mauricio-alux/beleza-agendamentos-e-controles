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
const barberRoleId = '88888888-8888-4888-8888-888888888888';
const alternateHairRoleId = '99999999-9999-4999-8999-999999999999';

const role = {
  id: roleId,
  nome: 'Cabeleireira',
  categoria_profissional: 'operacional',
  ativo: true
};

const barberRole = {
  id: barberRoleId,
  nome: 'Barbeiro',
  categoria_profissional: 'operacional',
  ativo: true
};

const alternateHairRole = {
  id: alternateHairRoleId,
  nome: 'Cabeleireiro',
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
    profissional_servico_especialidades: []
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
      servico_tenant_id: braidsServiceId,
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
      servico_tenant_id: hydrationServiceId,
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

test('blocks duplicate specialty names within the same role and tenant context', async () => {
  const originals = {};
  const replace = (name, implementation) => {
    originals[name] = teamRepository[name];
    teamRepository[name] = implementation;
  };

  replace('findRoleById', async () => barberRole);
  replace('listSpecialties', async () => [{
    id: '99999999-9999-4999-8999-999999999999',
    cargo_id: barberRoleId,
    nome: 'Barba',
    tenant_id: null,
    ativo: true,
    cargo: barberRole
  }]);
  replace('createSpecialty', async () => {
    throw new Error('createSpecialty should not be called for duplicate specialties');
  });

  try {
    await assert.rejects(
      () => teamService.createSpecialty(tenantId, {
        cargo_id: barberRoleId,
        nome: 'barba',
        taxonomy_category_key: 'barba',
        descricao: null
      }),
      (error) => error.code === 'SPECIALTY_ALREADY_EXISTS'
    );
  } finally {
    Object.entries(originals).forEach(([name, implementation]) => {
      teamRepository[name] = implementation;
    });
  }
});

test('rejects specialty creation when role and category are incompatible', async () => {
  const originals = {};
  const replace = (name, implementation) => {
    originals[name] = teamRepository[name];
    teamRepository[name] = implementation;
  };

  replace('findRoleById', async () => barberRole);
  replace('listSpecialties', async () => []);
  replace('createSpecialty', async () => {
    throw new Error('createSpecialty should not be called for incompatible role category');
  });

  try {
    await assert.rejects(
      () => teamService.createSpecialty(tenantId, {
        cargo_id: barberRoleId,
        nome: 'Decoracao de unha',
        taxonomy_category_key: 'unhas',
        descricao: null
      }),
      (error) => error.code === 'INCOMPATIBLE_ROLE_CATEGORY'
    );
  } finally {
    Object.entries(originals).forEach(([name, implementation]) => {
      teamRepository[name] = implementation;
    });
  }
});

test('accepts specialty creation when role and category are compatible', async () => {
  const originals = {};
  const replace = (name, implementation) => {
    originals[name] = teamRepository[name];
    teamRepository[name] = implementation;
  };
  let createdPayload = null;

  replace('findRoleById', async () => barberRole);
  replace('listSpecialties', async () => []);
  replace('createSpecialty', async (payload) => {
    createdPayload = payload;
    return {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      ...payload,
      cargo: barberRole
    };
  });

  try {
    const created = await teamService.createSpecialty(tenantId, {
      cargo_id: barberRoleId,
      nome: 'Pigmentacao de barba',
      taxonomy_category_key: 'barba',
      descricao: null
    });

    assert.equal(created.nome, 'Pigmentacao de barba');
    assert.equal(createdPayload.taxonomy_category_key, 'barba');
  } finally {
    Object.entries(originals).forEach(([name, implementation]) => {
      teamRepository[name] = implementation;
    });
  }
});

test('allows the same specialty name in different roles', async () => {
  const originals = {};
  const replace = (name, implementation) => {
    originals[name] = teamRepository[name];
    teamRepository[name] = implementation;
  };
  let createdPayload = null;

  replace('findRoleById', async () => barberRole);
  replace('listSpecialties', async ({ cargoId }) => (
    cargoId === barberRoleId ? [] : [hairSpecialty]
  ));
  replace('createSpecialty', async (payload) => {
    createdPayload = payload;
    return {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      ...payload,
      cargo: barberRole
    };
  });

  try {
    const created = await teamService.createSpecialty(tenantId, {
      cargo_id: barberRoleId,
      nome: 'Corte Feminino',
      taxonomy_category_key: 'barba',
      descricao: null
    });

    assert.equal(created.nome, 'Corte Feminino');
    assert.equal(createdPayload.cargo_id, barberRoleId);
  } finally {
    Object.entries(originals).forEach(([name, implementation]) => {
      teamRepository[name] = implementation;
    });
  }
});

test('blocks equivalent specialty names in the same tenant category across roles', async () => {
  const originals = {};
  const replace = (name, implementation) => {
    originals[name] = teamRepository[name];
    teamRepository[name] = implementation;
  };

  replace('findRoleById', async () => alternateHairRole);
  replace('listSpecialties', async ({ cargoId, categoryKey }) => {
    if (cargoId === alternateHairRoleId) return [];
    if (categoryKey === 'cabelo') return [hairSpecialty];
    return [];
  });
  replace('createSpecialty', async () => {
    throw new Error('createSpecialty should not be called for semantic duplicate specialties');
  });

  try {
    await assert.rejects(
      () => teamService.createSpecialty(tenantId, {
        cargo_id: alternateHairRoleId,
        nome: 'corte feminino',
        taxonomy_category_key: 'cabelo',
        descricao: null
      }),
      (error) => error.code === 'SEMANTIC_SPECIALTY_ALREADY_EXISTS'
    );
  } finally {
    Object.entries(originals).forEach(([name, implementation]) => {
      teamRepository[name] = implementation;
    });
  }
});
