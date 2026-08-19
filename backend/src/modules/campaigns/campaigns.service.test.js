const assert = require('node:assert/strict');
const test = require('node:test');

const repository = require('./campaigns.repository');
const env = require('../../config/env');
const service = require('./campaigns.service');
const { campaignSchema } = require('./campaigns.validators');

const originalRepository = { ...repository };
const originalDryRun = env.whatsappDryRun;

function restore() {
  Object.assign(repository, originalRepository);
  env.whatsappDryRun = originalDryRun;
}

function daysAgoIso(days) {
  const date = new Date(Date.now() - (days * 86_400_000));
  return date.toISOString();
}

function futureDateOnly(days) {
  const date = new Date(Date.now() + (days * 86_400_000));
  return date.toISOString().slice(0, 10);
}

function campaign() {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    tenant_id: '22222222-2222-4222-8222-222222222222',
    nome: 'Promocao manicure',
    tipo: 'promocao_servico',
    canal: 'whatsapp',
    template_id: '33333333-3333-4333-8333-333333333333',
    servico_id: '66666666-6666-4666-8666-666666666666',
    status: 'rascunho',
    data_inicio: '2026-01-01',
    data_fim: '2026-12-31',
    criterios_segmentacao: { mode: 'all' },
    parametros_template: {
      nome_servico: { source: 'fixed', value: 'Manicure' },
      valor_promocional: { source: 'fixed', value: 'R$ 30,00' }
    },
    total_destinatarios: 0,
    total_geradas: 0,
    total_processadas: 0,
    total_enviadas: 0,
    total_entregues: 0,
    total_lidas: 0,
    total_falhas: 0,
    total_canceladas: 0,
    tenant: {
      id: '22222222-2222-4222-8222-222222222222',
      nome_fantasia: 'Espaco Vivian Beauty',
      slug: 'espaco-vivian-beauty'
    },
    metadata: {
      origem_campanha: 'tenant',
      tipo_publico: 'clientes',
      natureza_campanha: 'promocional',
      status_campanha: 'EM_ANDAMENTO',
      status_processamento: 'PENDENTE',
      estrategia_envio: 'UNICO'
    },
    tracking_token: 'cmp_test'
  };
}

function serviceRow(overrides = {}) {
  const serviceId = overrides.id || '66666666-6666-4666-8666-666666666666';
  const catalogId = overrides.servico_catalogo_id || '77777777-7777-4777-8777-777777777777';
  const specialtyId = overrides.especialidade_id || 'specialty-nails';
  const configId = overrides.servico_tenant_especialidade_id || 'service-tenant-specialty-nails';
  const specialtyConfigOverrides = overrides.especialidade_config || {};
  return {
    id: serviceId,
    servico_tenant_id: serviceId,
    servico_catalogo_id: catalogId,
    tenant_id: '22222222-2222-4222-8222-222222222222',
    nome: 'Manicure',
    categoria: 'manicure',
    codigo_canonico: 'MANICURE',
    natureza: 'recorrente',
    preco: 50,
    ativo: true,
    especialidades_config: [{
      id: configId,
      servico_tenant_id: serviceId,
      especialidade_id: specialtyId,
      nome: 'Manicure tradicional',
      preco: 50,
      duracao_minutos: 45,
      dias_retorno_recomendado: 25,
      aceita_agendamento_online: true,
      ativo: true,
      ...specialtyConfigOverrides
    }],
    ...overrides
  };
}

function template(overrides = {}) {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    nome: 'campaign_promotion',
    canal: 'whatsapp',
    tipo: 'marketing',
    conteudo: 'Ola, {{1}}! {{2}} por {{3}}.',
    variaveis: ['nome_cliente', 'nome_servico', 'valor_promocional'],
    aprovado_provider: true,
    ativo: true,
    metadata: {
      provider_template_name: 'campaign_promotion',
      language: 'pt_BR',
      categoria_provider: 'Marketing'
    },
    ...overrides
  };
}

function commercialTemplate(overrides = {}) {
  return template({
    conteudo: [
      'Ola, {{1}}!',
      '',
      'Servico:',
      '{{2}}',
      '',
      '{{3}}',
      '',
      '{{4}}',
      '',
      'Agende seu horario pelo link abaixo.'
    ].join('\n'),
    variaveis: ['nome_cliente', 'nome_servico', 'beneficios_campanha', 'vigencia_campanha'],
    metadata: {
      provider_template_name: 'campaign_promotion',
      language: 'pt_BR',
      categoria_provider: 'Marketing',
      provider_variable_mapping: {
        nome_cliente: 1,
        nome_servico: 2,
        beneficios_campanha: 3,
        vigencia_campanha: 4
      }
    },
    ...overrides
  });
}

function commercialCampaign(overrides = {}) {
  const { parametros_template: overrideParams, metadata: overrideMetadata, ...rest } = overrides;
  return {
    ...campaign(),
    parametros_template: {
      nome_servico: { source: 'fixed', value: 'Escova' },
      ...(overrideParams || {})
    },
    metadata: {
      ...campaign().metadata,
      strategy: { approval: {} },
      ...(overrideMetadata || {})
    },
    ...rest
  };
}

function audienceRows() {
  return [
    {
      id: 'link-1',
      tenant_id: '22222222-2222-4222-8222-222222222222',
      status: 'ativo',
      aceita_campanhas: true,
      ativo: true,
      cliente: {
        id: '44444444-4444-4444-8444-444444444444',
        nome: 'Maria Souza',
        telefone: '+5511999999999',
        ativo: true
      },
      historico: [],
      agendamentos: [],
      metadata: {}
    },
    {
      id: 'link-2',
      tenant_id: '22222222-2222-4222-8222-222222222222',
      status: 'ativo',
      aceita_campanhas: false,
      ativo: true,
      cliente: {
        id: '55555555-5555-4555-8555-555555555555',
        nome: 'Ana Lima',
        telefone: '+5511888888888',
        ativo: true
      },
      historico: [],
      agendamentos: [],
      metadata: {}
    }
  ];
}

function inactiveCriteria(overrides = {}) {
  return {
    mode: 'segment',
    inactive_by_service_return: true,
    fallback_inactive_days: 45,
    no_future_appointment: true,
    ...overrides
  };
}

function inactiveCampaign(overrides = {}) {
  return {
    ...campaign(),
    nome: 'Recuperacao de inativos',
    tipo: 'recuperacao_inativos',
    servico_id: null,
    criterios_segmentacao: inactiveCriteria(),
    parametros_template: {
      nome_servico: { source: 'fixed', value: 'Servicos do salao' },
      valor_promocional: { source: 'fixed', value: 'condicao especial' }
    },
    ...overrides
  };
}

function completedHistory(overrides = {}) {
  const specialtyId = overrides.especialidade_id || 'specialty-nails';
  const service = overrides.servico || serviceRow({
    id: overrides.servico_id || 'service-manicure',
    especialidade_id: specialtyId,
    nome: 'Manicure',
    natureza: 'recorrente'
  });
  const serviceTenantSpecialtyId = overrides.servico_tenant_especialidade_id
    || overrides.servico_especialidade_id
    || service.especialidades_config?.[0]?.id
    || 'service-tenant-specialty-nails';
  const specialtyConfig = overrides.servico_tenant_especialidade || {
    id: serviceTenantSpecialtyId,
    servico_tenant_id: service.id,
    especialidade_id: specialtyId,
    dias_retorno_recomendado: service.especialidades_config?.[0]
      && Object.prototype.hasOwnProperty.call(service.especialidades_config[0], 'dias_retorno_recomendado')
      ? service.especialidades_config[0].dias_retorno_recomendado
      : 25,
    metadata: {}
  };

  return {
    id: overrides.id || 'history-1',
    cliente_id: '44444444-4444-4444-8444-444444444444',
    status: 'concluido',
    data_atendimento: '2026-06-20T10:00:00.000Z',
    agendamento_id: overrides.agendamento_id || 'appointment-1',
    servico_id: overrides.legacy_servico_id || null,
    servico_catalogo_id: service.servico_catalogo_id,
    servico_tenant_id: service.id,
    especialidade_id: specialtyId,
    servico_tenant_especialidade_id: specialtyConfig.id,
    profissional_id: null,
    deleted_at: null,
    nome_especialidade: overrides.nome_especialidade || 'Manicure tradicional',
    servico: overrides.servico_legado || null,
    servico_tenant: {
      id: service.id,
      tenant_id: service.tenant_id,
      servico_catalogo_id: service.servico_catalogo_id,
      ativo: service.ativo,
      servico_catalogo: {
        id: service.servico_catalogo_id,
        codigo_canonico: service.codigo_canonico,
        nome: service.nome,
        categoria_key: service.categoria,
        natureza: service.natureza
      }
    },
    servico_tenant_especialidade: specialtyConfig,
    especialidade: {
      id: specialtyId,
      nome: overrides.nome_especialidade || 'Manicure tradicional',
      metadata: {}
    },
    ...overrides
  };
}

function inactiveAudienceRow(overrides = {}) {
  return {
    ...audienceRows()[0],
    historico: [completedHistory()],
    agendamentos: [],
    ...overrides
  };
}

function birthdayInCurrentMonth(day = 15) {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `1990-${month}-${String(day).padStart(2, '0')}`;
}

function birthdayInMonth(month, day = 15) {
  return `1990-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function birthdayCampaign(overrides = {}) {
  return {
    ...campaign(),
    nome: 'Aniversariantes do mes',
    tipo: 'aniversario',
    servico_id: null,
    criterios_segmentacao: { mode: 'segment', birthday_month: true },
    parametros_template: {},
    metadata: {
      ...campaign().metadata,
      natureza_campanha: 'relacionamento',
      estrategia_envio: 'UNICO'
    },
    ...overrides
  };
}

function birthdayTemplate(overrides = {}) {
  return template({
    nome: 'campaign_birthday',
    conteudo: [
      'Ola, {{1}}!',
      '',
      'Este e o seu mes especial!',
      '',
      'Para celebrar seu aniversario, a {{2}} preparou uma condicao especial para voce aproveitar durante este periodo.',
      '',
      'Esperamos sua visita.',
      '',
      '[Agendar Agora]'
    ].join('\n'),
    variaveis: ['nome_cliente', 'nome_salao'],
    aprovado_provider: false,
    metadata: {
      provider_template_name: 'campaign_birthday',
      language: 'pt_BR',
      categoria_provider: 'Marketing'
    },
    ...overrides
  });
}

function internalAudienceRow(role, overrides = {}) {
  return {
    id: `link-${role}`,
    tenant_id: overrides.tenant_id || '22222222-2222-4222-8222-222222222222',
    status: 'ativo',
    aceita_campanhas: true,
    ativo: true,
    cliente: {
      id: overrides.cliente_id || `${role.toLowerCase()}-client`,
      nome: `${role} Teste`,
      telefone: '+5511970000000',
      ativo: true,
      ...overrides.cliente
    },
    historico: overrides.historico || [
      { status: 'concluido', data_atendimento: '2026-01-10T10:00:00.000Z' },
      { status: 'concluido', data_atendimento: '2026-02-10T10:00:00.000Z' }
    ],
    agendamentos: overrides.agendamentos || [],
    metadata: {},
    internal_user_roles: [role]
  };
}

test.afterEach(restore);
test.beforeEach(() => {
  repository.listRecentCommercialMessages = async () => [];
  repository.listEquivalentCampaigns = async () => [];
  repository.listSaasUsers = async () => [];
});

test('list returns paginated tenant-aware campaigns with diagnostics', async () => {
  repository.listCampaigns = async (tenantId, filters) => {
    assert.equal(tenantId, '22222222-2222-4222-8222-222222222222');
    assert.equal(filters.page_size, 20);
    return {
      rows: [campaign()],
      count: 15,
      page: 1,
      page_size: 20
    };
  };
  repository.listAudienceBase = async () => audienceRows();

  const result = await service.list('22222222-2222-4222-8222-222222222222', { page: 1, page_size: 20 });

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].audience_metrics.eligible, 1);
  assert.equal(result.items[0].audience_metrics.excluded, 1);
  assert.equal(result.pagination.total, 15);
  assert.equal(result.pagination.has_next, false);
  assert.equal(result.diagnostics.criteria.tenant_id, '22222222-2222-4222-8222-222222222222');
});

test('list keeps dynamic eligible separate from materialized recipients', async () => {
  repository.listCampaigns = async () => ({
    rows: [{ ...campaign(), total_destinatarios: 0, total_geradas: 0, total_enviadas: 0, total_falhas: 0 }],
    count: 1,
    page: 1,
    page_size: 20
  });
  repository.listAudienceBase = async () => [audienceRows()[0]];

  const result = await service.list('22222222-2222-4222-8222-222222222222', { page: 1, page_size: 20 });
  const item = result.items[0];

  assert.equal(item.audience_metrics.eligible, 1);
  assert.equal(item.total_destinatarios, 0);
  assert.equal(item.total_geradas, 0);
});

test('list normalizes campaign status filter labels and aliases before querying', async () => {
  const cases = [
    ['Todos', 'all'],
    ['Rascunho', 'rascunho'],
    ['Pronta', 'pronta'],
    ['PARAMETRIZADA', 'pronta'],
    ['Agendada', 'agendada'],
    ['Gerando mensagem', 'gerando_mensagens'],
    ['Em processamento', 'em_processamento'],
    ['Concluída', 'concluida'],
    ['Cancelada', 'cancelada'],
    ['Falhou', 'falhou']
  ];
  const capturedStatuses = [];

  repository.listCampaigns = async (_tenantId, filters) => {
    capturedStatuses.push(filters.status);
    return {
      rows: [],
      count: 0,
      page: 1,
      page_size: 20
    };
  };
  repository.listAudienceBase = async () => audienceRows();

  for (const [input] of cases) {
    await service.list('22222222-2222-4222-8222-222222222222', { status: input, page: 1, page_size: 20 });
  }

  assert.deepEqual(capturedStatuses, cases.map(([, expected]) => expected));
});

test('estimate only treats valid client tenant links as eligible audience', async () => {
  repository.listAudienceBase = async () => [
    ...audienceRows(),
    {
      id: 'link-without-client',
      tenant_id: '22222222-2222-4222-8222-222222222222',
      status: 'ativo',
      aceita_campanhas: true,
      ativo: true,
      cliente: null,
      historico: [],
      agendamentos: [],
      metadata: {}
    }
  ];

  const result = await service.estimate('22222222-2222-4222-8222-222222222222', { criterios_segmentacao: { mode: 'all' } });

  assert.equal(result.found, 3);
  assert.equal(result.eligible, 1);
  assert.equal(result.excluded_by_reason.cliente_invalido, 1);
});

test('campaign eligibility excludes Administrador from tenant audience', async () => {
  repository.listAudienceBase = async () => [internalAudienceRow('Administrador')];

  const result = await service.estimate('22222222-2222-4222-8222-222222222222', { criterios_segmentacao: { mode: 'all' } });

  assert.equal(result.eligible, 0);
  assert.equal(result.excluded_by_reason.usuario_interno_tenant, 1);
});

test('campaign eligibility excludes Funcionario even with phone and history', async () => {
  repository.listAudienceBase = async () => [internalAudienceRow('Funcionario')];

  const result = await service.estimate('22222222-2222-4222-8222-222222222222', { criterios_segmentacao: { recurring: true, min_completed: 2 } });

  assert.equal(result.eligible, 0);
  assert.equal(result.excluded_by_reason.usuario_interno_tenant, 1);
});

test('campaign eligibility excludes Autonomo matching segmentation data', async () => {
  repository.listAudienceBase = async () => [internalAudienceRow('Autonomo')];

  const result = await service.estimate('22222222-2222-4222-8222-222222222222', { criterios_segmentacao: { mode: 'all' } });

  assert.equal(result.eligible, 0);
  assert.equal(result.excluded_by_reason.usuario_interno_tenant, 1);
});

test('campaign eligibility excludes Terceiro from tenant audience', async () => {
  repository.listAudienceBase = async () => [internalAudienceRow('Terceiro')];

  const result = await service.estimate('22222222-2222-4222-8222-222222222222', { criterios_segmentacao: { mode: 'all' } });

  assert.equal(result.eligible, 0);
  assert.equal(result.excluded_by_reason.usuario_interno_tenant, 1);
});

test('campaign eligibility keeps final Cliente when no internal tenant role exists', async () => {
  repository.listAudienceBase = async () => [audienceRows()[0]];

  const result = await service.estimate('22222222-2222-4222-8222-222222222222', { criterios_segmentacao: { mode: 'all' } });

  assert.equal(result.eligible, 1);
  assert.equal(result.excluded_by_reason.usuario_interno_tenant, undefined);
});

test('campaign eligibility protects multiple links in same tenant when client also has internal role', async () => {
  repository.listAudienceBase = async () => [
    internalAudienceRow('Funcionario', {
      cliente: { nome: 'Cliente e Funcionario', telefone: '+5511970000001' }
    })
  ];

  const result = await service.estimate('22222222-2222-4222-8222-222222222222', { criterios_segmentacao: { mode: 'all' } });

  assert.equal(result.eligible, 0);
  assert.equal(result.excluded_by_reason.usuario_interno_tenant, 1);
});

test('campaign eligibility is scoped per tenant for multi-tenant people', async () => {
  repository.listAudienceBase = async (tenantId) => {
    if (tenantId === 'tenant-a') return [internalAudienceRow('Funcionario', { tenant_id: 'tenant-a', cliente_id: 'same-person' })];
    return [{
      ...audienceRows()[0],
      tenant_id: 'tenant-b',
      cliente: { ...audienceRows()[0].cliente, id: 'same-person', telefone: '+5511970000002' },
      internal_user_roles: []
    }];
  };

  const tenantA = await service.estimate('tenant-a', { criterios_segmentacao: { mode: 'all' } });
  const tenantB = await service.estimate('tenant-b', { criterios_segmentacao: { mode: 'all' } });

  assert.equal(tenantA.eligible, 0);
  assert.equal(tenantA.excluded_by_reason.usuario_interno_tenant, 1);
  assert.equal(tenantB.eligible, 1);
});

test('campaign eligibility keeps client with owner metadata from another tenant', async () => {
  repository.listAudienceBase = async () => [{
    ...audienceRows()[0],
    metadata: {
      owner_user_id: 'other-tenant-user',
      responsible_profissional_id: 'other-tenant-professional'
    },
    cliente: {
      ...audienceRows()[0].cliente,
      metadata: {
        owner_user_id: 'other-tenant-user',
        owner_role: 'Funcionario'
      }
    },
    internal_user_roles: []
  }];

  const result = await service.estimate('tenant-current', { criterios_segmentacao: { mode: 'all' } });

  assert.equal(result.eligible, 1);
  assert.equal(result.excluded_by_reason.usuario_interno_tenant, undefined);
});

test('inactive recovery uses tenant service-specialty return days to mark overdue clients eligible', async () => {
  repository.listAudienceBase = async () => [inactiveAudienceRow()];

  const result = await service.estimate(
    '22222222-2222-4222-8222-222222222222',
    { criterios_segmentacao: inactiveCriteria() },
    { now: new Date('2026-07-26T12:00:00.000Z') }
  );

  assert.equal(result.eligible, 1);
  assert.equal(result.rows[0].stats.inactive_recovery.recommended_return_days, 25);
  assert.equal(result.rows[0].stats.inactive_recovery.recommended_return_source, 'servico_tenant_especialidade');
});

test('inactive recovery uses service-specialty tenant configuration over legacy service fallback', async () => {
  repository.listAudienceBase = async () => [inactiveAudienceRow({
    historico: [completedHistory({
      data_atendimento: '2026-07-01T10:00:00.000Z',
      especialidade_id: 'specialty-nails',
      servico_tenant_especialidade_id: 'service-specialty-nails',
      especialidade: {
        id: 'specialty-nails',
        nome: 'Manicure tradicional',
        metadata: { dias_retorno_recomendado: 20 }
      },
      servico_tenant_especialidade: {
        id: 'service-specialty-nails',
        dias_retorno_recomendado: 15,
        metadata: {}
      },
      servico: serviceRow({
        id: 'service-manicure',
        nome: 'Manicure',
        dias_retorno_recomendado: 45,
        servico_ocasional: false,
        metadata: {}
      })
    })]
  })];

  const result = await service.estimate(
    '22222222-2222-4222-8222-222222222222',
    { criterios_segmentacao: inactiveCriteria() },
    { now: new Date('2026-07-26T12:00:00.000Z') }
  );

  assert.equal(result.eligible, 1);
  assert.equal(result.rows[0].stats.inactive_recovery.recommended_return_days, 15);
  assert.equal(result.rows[0].stats.inactive_recovery.recommended_return_source, 'servico_tenant_especialidade');
  assert.equal(result.rows[0].stats.inactive_recovery.last_specialty_name, 'Manicure tradicional');
  assert.equal(result.rows[0].stats.inactive_recovery.last_service_specialty_id, 'service-specialty-nails');
});

test('inactive recovery excludes clients still inside the service return period', async () => {
  repository.listAudienceBase = async () => [inactiveAudienceRow({
    historico: [completedHistory({ data_atendimento: '2026-07-10T10:00:00.000Z' })]
  })];

  const result = await service.estimate(
    '22222222-2222-4222-8222-222222222222',
    { criterios_segmentacao: inactiveCriteria() },
    { now: new Date('2026-07-26T12:00:00.000Z') }
  );

  assert.equal(result.eligible, 0);
  assert.equal(result.excluded_by_reason.dentro_prazo_retorno, 1);
});

test('inactive recovery falls back to configured default when recurring service has no return days', async () => {
  repository.listAudienceBase = async () => [inactiveAudienceRow({
    historico: [completedHistory({
      data_atendimento: '2026-06-01T10:00:00.000Z',
      servico: serviceRow({
        id: 'service-custom',
        nome: 'Servico customizado',
        natureza: 'recorrente',
        especialidade_config: { dias_retorno_recomendado: null }
      })
    })]
  })];

  const result = await service.estimate(
    '22222222-2222-4222-8222-222222222222',
    { criterios_segmentacao: inactiveCriteria() },
    { now: new Date('2026-07-26T12:00:00.000Z') }
  );

  assert.equal(result.eligible, 1);
  assert.equal(result.rows[0].stats.inactive_recovery.recommended_return_days, 45);
  assert.equal(result.rows[0].stats.inactive_recovery.recommended_return_source, 'fallback');
});

test('inactive recovery does not classify clients by occasional-only services', async () => {
  repository.listAudienceBase = async () => [inactiveAudienceRow({
    historico: [completedHistory({
      data_atendimento: '2026-04-01T10:00:00.000Z',
      servico: serviceRow({
        id: 'service-makeup',
        nome: 'Maquiagem social',
        natureza: 'ocasional',
        especialidade_config: { dias_retorno_recomendado: null }
      })
    })]
  })];

  const result = await service.estimate(
    '22222222-2222-4222-8222-222222222222',
    { criterios_segmentacao: inactiveCriteria() },
    { now: new Date('2026-07-26T12:00:00.000Z') }
  );

  assert.equal(result.eligible, 0);
  assert.equal(result.excluded_by_reason.servico_ocasional_sem_recuperacao, 1);
});

test('inactive recovery excludes valid future appointments and ignores canceled future appointments', async () => {
  repository.listAudienceBase = async () => [
    inactiveAudienceRow({
      id: 'future-valid',
      agendamentos: [{ id: 'appt-future', status: 'confirmado', data_inicio: '2026-07-30T10:00:00.000Z', deleted_at: null }]
    }),
    inactiveAudienceRow({
      id: 'future-canceled',
      cliente: { ...audienceRows()[0].cliente, id: 'client-canceled-future', telefone: '+5511999999998' },
      agendamentos: [{ id: 'appt-canceled', status: 'cancelado', data_inicio: '2026-07-30T10:00:00.000Z', deleted_at: null }]
    })
  ];

  const result = await service.estimate(
    '22222222-2222-4222-8222-222222222222',
    { criterios_segmentacao: inactiveCriteria() },
    { now: new Date('2026-07-26T12:00:00.000Z') }
  );

  assert.equal(result.eligible, 1);
  assert.equal(result.excluded_by_reason.possui_agendamento_futuro, 1);
});

test('inactive recovery uses the shortest recurring return period in a multi-service appointment', async () => {
  repository.listAudienceBase = async () => [inactiveAudienceRow({
    historico: [
      completedHistory({
        id: 'history-hair',
        data_atendimento: '2026-06-30T10:00:00.000Z',
        agendamento_id: 'appointment-combo',
        servico: serviceRow({
          id: 'service-luzes',
          nome: 'Luzes',
          natureza: 'recorrente',
          servico_tenant_especialidade_id: 'service-tenant-specialty-hair',
          especialidade_config: { id: 'service-tenant-specialty-hair', dias_retorno_recomendado: 120 }
        })
      }),
      completedHistory({
        id: 'history-nails',
        data_atendimento: '2026-06-30T10:00:00.000Z',
        agendamento_id: 'appointment-combo',
        servico: serviceRow({
          id: 'service-manicure',
          nome: 'Manicure',
          natureza: 'recorrente',
          servico_tenant_especialidade_id: 'service-tenant-specialty-nails',
          especialidade_config: { id: 'service-tenant-specialty-nails', dias_retorno_recomendado: 25 }
        })
      })
    ]
  })];

  const result = await service.estimate(
    '22222222-2222-4222-8222-222222222222',
    { criterios_segmentacao: inactiveCriteria() },
    { now: new Date('2026-07-26T12:00:00.000Z') }
  );

  assert.equal(result.eligible, 1);
  assert.equal(result.rows[0].stats.inactive_recovery.last_service_name, 'Manicure');
  assert.equal(result.rows[0].stats.inactive_recovery.recommended_return_days, 25);
});

test('inactive recovery keeps preview, estimate and start on the same service-return audience', async () => {
  const messages = [];
  const baseCampaign = inactiveCampaign({
    criterios_segmentacao: inactiveCriteria({ no_future_appointment: true }),
    data_inicio: '2026-07-01',
    data_fim: '2026-08-01',
    metadata: {
      ...campaign().metadata,
      strategy: {
        approval: {
          valor_promocional: 49.9
        }
      }
    }
  });

  repository.getCampaign = async () => baseCampaign;
  repository.getTemplate = async () => template();
  repository.getCoupon = async () => null;
  repository.listAudienceBase = async () => [
    inactiveAudienceRow({
      historico: [completedHistory({ data_atendimento: daysAgoIso(35) })]
    }),
    inactiveAudienceRow({
      id: 'inside-period',
      cliente: { ...audienceRows()[0].cliente, id: 'client-inside-period', telefone: '+5511999999997' },
      historico: [completedHistory({ data_atendimento: daysAgoIso(10) })]
    })
  ];
  repository.updateCampaign = async (_tenantId, _id, payload) => ({ ...baseCampaign, ...payload });
  repository.createCampaignSend = async (payload) => ({ id: 'send-1', ...payload });
  repository.createWhatsAppCampaignMessage = async (payload) => {
    messages.push(payload);
    return { id: `msg-${messages.length}`, ...payload };
  };
  repository.listCampaignMessages = async () => messages;

  const preview = await service.preview('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111');
  const estimate = await service.estimate('22222222-2222-4222-8222-222222222222', baseCampaign);
  const started = await service.start('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111');

  assert.equal(preview.recipient.nome, 'Maria Souza');
  assert.equal(estimate.eligible, 1);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].cliente_id, '44444444-4444-4444-8444-444444444444');
  assert.equal(started.total_destinatarios, 1);
});

test('campaign eligibility keeps common client with owner_user_id metadata', async () => {
  repository.listAudienceBase = async () => [{
    ...audienceRows()[0],
    metadata: {
      owner_user_id: 'tenant-user-owner',
      owner_role: 'Funcionario'
    },
    cliente: {
      ...audienceRows()[0].cliente,
      metadata: {
        owner_user_id: 'tenant-user-owner',
        owner_role: 'Funcionario'
      }
    },
    internal_user_roles: []
  }];

  const result = await service.estimate('22222222-2222-4222-8222-222222222222', {
    criterios_segmentacao: { mode: 'all' }
  });

  assert.equal(result.eligible, 1);
  assert.equal(result.excluded_by_reason.usuario_interno_tenant, undefined);
});

test('campaign eligibility keeps common client with responsible_profissional_id metadata', async () => {
  repository.listAudienceBase = async () => [{
    ...audienceRows()[0],
    metadata: {
      responsible_profissional_id: 'tenant-professional'
    },
    internal_user_roles: []
  }];

  const result = await service.estimate('22222222-2222-4222-8222-222222222222', {
    criterios_segmentacao: { mode: 'all' }
  });

  assert.equal(result.eligible, 1);
  assert.equal(result.excluded_by_reason.usuario_interno_tenant, undefined);
});

test('campaign eligibility keeps common client with owner_profissional_id metadata', async () => {
  repository.listAudienceBase = async () => [{
    ...audienceRows()[0],
    metadata: {
      owner_profissional_id: 'tenant-owner-professional'
    },
    cliente: {
      ...audienceRows()[0].cliente,
      metadata: {
        owner_profissional_id: 'tenant-owner-professional'
      }
    },
    internal_user_roles: []
  }];

  const result = await service.estimate('22222222-2222-4222-8222-222222222222', {
    criterios_segmentacao: { mode: 'all' }
  });

  assert.equal(result.eligible, 1);
  assert.equal(result.excluded_by_reason.usuario_interno_tenant, undefined);
});

test('birthday campaign keeps non-internal birthday client eligible', async () => {
  repository.listAudienceBase = async () => [{
    ...audienceRows()[0],
    cliente: {
      ...audienceRows()[0].cliente,
      data_nascimento: birthdayInCurrentMonth(16)
    },
    metadata: {
      owner_user_id: 'tenant-owner',
      owner_role: 'Funcionario',
      responsible_profissional_id: 'tenant-professional'
    },
    internal_user_roles: []
  }];

  const result = await service.estimate('22222222-2222-4222-8222-222222222222', {
    criterios_segmentacao: { mode: 'segment', birthday_month: true }
  });

  assert.equal(result.eligible, 1);
  assert.equal(result.excluded_by_reason.usuario_interno_tenant, undefined);
});

test('birthday campaign includes clients from the first and last day of the current month', async () => {
  const now = new Date('2026-08-01T12:00:00-03:00');
  repository.listAudienceBase = async () => [{
    ...audienceRows()[0],
    cliente: {
      ...audienceRows()[0].cliente,
      id: 'birthday-first-day',
      data_nascimento: birthdayInMonth(8, 1)
    }
  }, {
    ...audienceRows()[0],
    id: 'link-last-day',
    cliente: {
      ...audienceRows()[0].cliente,
      id: 'birthday-last-day',
      nome: 'Cliente Ultimo Dia',
      telefone: '+5511988888888',
      data_nascimento: birthdayInMonth(8, 31)
    }
  }];

  const result = await service.estimate('22222222-2222-4222-8222-222222222222', {
    criterios_segmentacao: { mode: 'segment', birthday_month: true }
  }, { now });

  assert.equal(result.eligible, 2);
  assert.equal(result.excluded_by_reason.fora_mes_aniversario, undefined);
});

test('birthday campaign excludes clients born in another month', async () => {
  const now = new Date('2026-08-01T12:00:00-03:00');
  repository.listAudienceBase = async () => [{
    ...audienceRows()[0],
    cliente: {
      ...audienceRows()[0].cliente,
      data_nascimento: birthdayInMonth(9, 15)
    }
  }];

  const result = await service.estimate('22222222-2222-4222-8222-222222222222', {
    criterios_segmentacao: { mode: 'segment', birthday_month: true }
  }, { now });

  assert.equal(result.eligible, 0);
  assert.equal(result.excluded_by_reason.fora_mes_aniversario, 1);
});

test('birthday campaign excludes birthday client for consent without internal marker', async () => {
  repository.listAudienceBase = async () => [{
    ...audienceRows()[0],
    aceita_campanhas: false,
    cliente: {
      ...audienceRows()[0].cliente,
      data_nascimento: birthdayInCurrentMonth(21)
    },
    metadata: {
      owner_user_id: 'tenant-owner',
      owner_role: 'Funcionario',
      responsible_profissional_id: 'tenant-professional'
    },
    internal_user_roles: []
  }];

  const result = await service.estimate('22222222-2222-4222-8222-222222222222', {
    criterios_segmentacao: { mode: 'segment', birthday_month: true }
  });

  assert.equal(result.eligible, 0);
  assert.equal(result.excluded_by_reason.sem_consentimento, 1);
  assert.equal(result.excluded_by_reason.usuario_interno_tenant, undefined);
});

test('birthday campaign excludes birthday client with invalid phone', async () => {
  repository.listAudienceBase = async () => [{
    ...audienceRows()[0],
    cliente: {
      ...audienceRows()[0].cliente,
      telefone: 'telefone-invalido',
      data_nascimento: birthdayInCurrentMonth(20)
    },
    internal_user_roles: []
  }];

  const result = await service.estimate('22222222-2222-4222-8222-222222222222', {
    criterios_segmentacao: { mode: 'segment', birthday_month: true }
  });

  assert.equal(result.eligible, 0);
  assert.equal(result.excluded_by_reason.telefone_invalido, 1);
});

test('platform campaign audience uses SaaS users and does not include clients', async () => {
  repository.listAudienceBase = async () => {
    throw new Error('client audience should not be used for platform campaigns');
  };
  repository.listSaasUsers = async () => [
    { id: 'user-admin', nome: 'Admin SaaS', email: 'admin@example.com', telefone: '+5511999999999', tipo_usuario: 'Administrador', ativo: true },
    { id: 'user-client', nome: 'Cliente', email: 'cliente@example.com', telefone: '+5511888888888', tipo_usuario: 'Cliente', ativo: true }
  ];

  const result = await service.estimate(null, {
    metadata: { origem_campanha: 'plataforma', tipo_publico: 'usuarios_saas' },
    criterios_segmentacao: { roles: ['Administrador'] }
  });

  assert.equal(result.found, 2);
  assert.equal(result.eligible, 1);
  assert.equal(result.sample[0].usuario_id, 'user-admin');
  assert.equal(result.excluded_by_reason.perfil_nao_permitido, 1);
});

test('platform campaign for Autonomos keeps clients out of the audience', async () => {
  repository.listAudienceBase = async () => {
    throw new Error('client audience should not be mixed with SaaS users');
  };
  repository.listSaasUsers = async () => [
    { id: 'autonomo-1', nome: 'Autonomo SaaS', email: 'auto@example.com', telefone: '+5511999999999', tipo_usuario: 'Autonomo', ativo: true }
  ];

  const result = await service.estimate(null, {
    metadata: { origem_campanha: 'plataforma', tipo_publico: 'usuarios_saas' },
    criterios_segmentacao: { roles: ['Autonomo'] }
  });

  assert.equal(result.eligible, 1);
  assert.equal(result.sample[0].tipo_usuario, 'Autonomo');
});

test('preview renders campaign content without creating queue records', async () => {
  let createMessageCalled = false;
  repository.getCampaign = async () => campaign();
  repository.getTemplate = async () => template();
  repository.getCoupon = async () => null;
  repository.listAudienceBase = async () => audienceRows();
  repository.createWhatsAppCampaignMessage = async () => {
    createMessageCalled = true;
  };

  const result = await service.preview('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111');

  assert.equal(createMessageCalled, false);
  assert.equal(result.creates_queue, false);
  assert.equal(result.conteudo, 'Ola, Maria Souza! Manicure por R$ 30,00.');
});

test('preview uses the current templates_mensagem content while campaign is editable', async () => {
  repository.getCampaign = async () => ({
    ...campaign(),
    template: template({ conteudo: 'Conteudo antigo {{1}}.' })
  });
  repository.getTemplate = async () => template({
    conteudo: 'Conteudo vigente {{1}}.',
    variaveis: ['nome_cliente']
  });
  repository.getCoupon = async () => null;
  repository.listAudienceBase = async () => audienceRows();

  const result = await service.preview('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111');

  assert.equal(result.preview_source, 'templates_mensagem');
  assert.equal(result.conteudo, 'Conteudo vigente Maria Souza.');
});

test('birthday campaign preview uses monthly copy without implying birthday-day delivery', async () => {
  repository.getCampaign = async () => birthdayCampaign();
  repository.getTemplate = async () => birthdayTemplate();
  repository.getCoupon = async () => null;
  repository.listAudienceBase = async () => [{
    ...audienceRows()[0],
    cliente: {
      ...audienceRows()[0].cliente,
      data_nascimento: birthdayInCurrentMonth(31)
    }
  }];

  const result = await service.preview('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111');

  assert.match(result.conteudo, /mes especial/);
  assert.match(result.conteudo, /durante este periodo/);
  assert.doesNotMatch(result.conteudo, /excelente dia|hoje e seu dia|feliz aniversario hoje/i);
});

test('preview renders tenant campaign origin with tenant name', async () => {
  repository.getCampaign = async () => ({
    ...campaign(),
    tenant: { id: '22222222-2222-4222-8222-222222222222', nome_fantasia: 'Espaco Vivian Beauty', slug: 'espaco-vivian-beauty' },
    metadata: { ...campaign().metadata, origem_campanha: 'ia' }
  });
  repository.getTemplate = async () => template({
    conteudo: 'Ola, {{1}}! A equipe da {{2}} deseja um excelente dia.',
    variaveis: ['nome_cliente', 'nome_salao']
  });
  repository.getCoupon = async () => null;
  repository.listAudienceBase = async () => audienceRows();

  const result = await service.preview('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111');

  assert.equal(result.params.nome_salao, 'Espaco Vivian Beauty');
  assert.match(result.conteudo, /A equipe da Espaco Vivian Beauty/);
});

test('preview renders platform campaign origin with tenant name for establishment variables', async () => {
  repository.getCampaign = async () => ({
    ...campaign(),
    tenant: { id: '22222222-2222-4222-8222-222222222222', nome_fantasia: 'Espaco Vivian Beauty', slug: 'espaco-vivian-beauty' },
    metadata: { ...campaign().metadata, origem_campanha: 'plataforma' }
  });
  repository.getTemplate = async () => template({
    conteudo: 'Ola, {{1}}! A equipe da {{2}} deseja um excelente dia.',
    variaveis: ['nome_cliente', 'nome_salao']
  });
  repository.getCoupon = async () => null;
  repository.listAudienceBase = async () => audienceRows();

  const result = await service.preview('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111');

  assert.equal(result.params.nome_salao, 'Espaco Vivian Beauty');
  assert.match(result.conteudo, /A equipe da Espaco Vivian Beauty/);
});

test('preview renders platform campaign origin with SaaS name only for SaaS variable', async () => {
  repository.getCampaign = async () => ({
    ...campaign(),
    metadata: { ...campaign().metadata, origem_campanha: 'plataforma' }
  });
  repository.getTemplate = async () => template({
    conteudo: 'Ola, {{1}}! A {{2}} opera a tecnologia da {{3}}.',
    variaveis: ['nome_cliente', 'nome_estabelecimento', 'nome_saas']
  });
  repository.getCoupon = async () => null;
  repository.listAudienceBase = async () => audienceRows();

  const result = await service.preview('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111');

  assert.equal(result.params.nome_estabelecimento, 'Espaco Vivian Beauty');
  assert.equal(result.params.nome_saas, env.appName);
  assert.match(result.conteudo, new RegExp(`A Espaco Vivian Beauty opera a tecnologia da ${env.appName}`));
});

test('preview freezes on generated mensagem_whatsapp content after execution starts', async () => {
  repository.getCampaign = async () => ({
    ...campaign(),
    status: 'em_processamento',
    metadata: { ...campaign().metadata, status_processamento: 'CONCLUIDO' }
  });
  repository.listCampaignMessages = async () => [{
    id: 'msg-1',
    cliente_id: '44444444-4444-4444-8444-444444444444',
    telefone_destino: '+5511999999999',
    conteudo: 'Mensagem congelada do lote.',
    payload: { params: { nome_cliente: 'Maria Souza' }, provider_params: ['Maria Souza'] },
    cliente: { nome: 'Maria Souza' }
  }];
  repository.getTemplate = async () => {
    throw new Error('current template should not be used after message generation');
  };

  const result = await service.preview('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111');

  assert.equal(result.preview_source, 'mensagens_whatsapp');
  assert.equal(result.conteudo, 'Mensagem congelada do lote.');
});

test('campaign template renders only discount benefit when configured', async () => {
  repository.getCampaign = async () => commercialCampaign({
    parametros_template: {
      nome_servico: { source: 'fixed', value: 'Escova' },
      desconto: { source: 'fixed', value: 20 }
    }
  });
  repository.getTemplate = async () => commercialTemplate();
  repository.getCoupon = async () => null;
  repository.listAudienceBase = async () => audienceRows();

  const result = await service.preview('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111');

  assert.match(result.conteudo, /Desconto: 20%/);
  assert.doesNotMatch(result.conteudo, /Valor promocional/);
  assert.doesNotMatch(result.conteudo, /Brinde/);
  assert.doesNotMatch(result.conteudo, /null|undefined|\{\{/);
});

test('campaign template renders only promotional value when configured', async () => {
  repository.getCampaign = async () => commercialCampaign({
    parametros_template: {
      nome_servico: { source: 'fixed', value: 'Escova' },
      valor_promocional: { source: 'fixed', value: 49.9 }
    }
  });
  repository.getTemplate = async () => commercialTemplate();
  repository.getCoupon = async () => null;
  repository.listAudienceBase = async () => audienceRows();

  const result = await service.preview('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111');

  assert.match(result.conteudo, /Valor promocional: R\$ 49,90/);
  assert.doesNotMatch(result.conteudo, /Desconto:/);
  assert.doesNotMatch(result.conteudo, /Brinde:/);
});

test('campaign template renders only gift when configured', async () => {
  repository.getCampaign = async () => commercialCampaign({
    parametros_template: {
      nome_servico: { source: 'fixed', value: 'Escova' },
      brinde: { source: 'fixed', value: 'Hidratacao capilar' }
    }
  });
  repository.getTemplate = async () => commercialTemplate();
  repository.getCoupon = async () => null;
  repository.listAudienceBase = async () => audienceRows();

  const result = await service.preview('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111');

  assert.match(result.conteudo, /Brinde: Hidratacao capilar/);
  assert.doesNotMatch(result.conteudo, /Desconto:/);
  assert.doesNotMatch(result.conteudo, /Valor promocional:/);
});

test('campaign template renders discount plus gift without empty optional lines', async () => {
  repository.getCampaign = async () => commercialCampaign({
    parametros_template: {
      nome_servico: { source: 'fixed', value: 'Escova' },
      desconto: { source: 'fixed', value: 15 },
      brinde: { source: 'fixed', value: 'Finalizacao' }
    }
  });
  repository.getTemplate = async () => commercialTemplate();
  repository.getCoupon = async () => null;
  repository.listAudienceBase = async () => audienceRows();

  const result = await service.preview('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111');

  assert.match(result.conteudo, /Desconto: 15%/);
  assert.match(result.conteudo, /Brinde: Finalizacao/);
  assert.doesNotMatch(result.conteudo, /\n{3,}/);
});

test('campaign template renders promotional value plus gift', async () => {
  repository.getCampaign = async () => commercialCampaign({
    parametros_template: {
      nome_servico: { source: 'fixed', value: 'Escova' },
      valor_promocional: { source: 'fixed', value: 'R$ 49,90' },
      brinde: { source: 'fixed', value: 'Hidratacao' }
    }
  });
  repository.getTemplate = async () => commercialTemplate();
  repository.getCoupon = async () => null;
  repository.listAudienceBase = async () => audienceRows();

  const result = await service.preview('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111');

  assert.match(result.conteudo, /Valor promocional: R\$ 49,90/);
  assert.match(result.conteudo, /Brinde: Hidratacao/);
});

test('campaign template formats full validity range in pt-BR', async () => {
  repository.getCampaign = async () => commercialCampaign({
    data_inicio: '2026-08-10',
    data_fim: '2026-08-20',
    parametros_template: {
      nome_servico: { source: 'fixed', value: 'Escova' },
      valor_promocional: { source: 'fixed', value: 49.9 }
    }
  });
  repository.getTemplate = async () => commercialTemplate();
  repository.getCoupon = async () => null;
  repository.listAudienceBase = async () => audienceRows();

  const result = await service.preview('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111');

  assert.match(result.conteudo, /Oferta valida de 10\/08\/2026 ate 20\/08\/2026\./);
});

test('campaign template formats start-only validity without inventing end date', async () => {
  repository.getCampaign = async () => commercialCampaign({
    data_inicio: '2026-08-10',
    data_fim: null,
    parametros_template: {
      nome_servico: { source: 'fixed', value: 'Escova' },
      valor_promocional: { source: 'fixed', value: 49.9 }
    }
  });
  repository.getTemplate = async () => commercialTemplate();
  repository.getCoupon = async () => null;
  repository.listAudienceBase = async () => audienceRows();

  const result = await service.preview('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111');

  assert.match(result.conteudo, /Oferta disponivel a partir de 10\/08\/2026\./);
  assert.doesNotMatch(result.conteudo, /ate\s*\./);
});

test('non-promotional campaign omits commercial benefits', async () => {
  repository.getCampaign = async () => commercialCampaign({
    tipo: 'relacionamento',
    data_inicio: '2026-08-10',
    data_fim: null,
    parametros_template: {
      nome_servico: { source: 'fixed', value: 'Escova' }
    },
    metadata: {
      ...campaign().metadata,
      natureza_campanha: 'relacionamento',
      strategy: { approval: {} }
    }
  });
  repository.getTemplate = async () => commercialTemplate();
  repository.getCoupon = async () => null;
  repository.listAudienceBase = async () => audienceRows();

  const result = await service.preview('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111');

  assert.doesNotMatch(result.conteudo, /Desconto:|Valor promocional:|Brinde:/);
  assert.match(result.conteudo, /Oferta disponivel a partir de 10\/08\/2026\./);
});

test('preview preserves provider parameter order for campaign templates', async () => {
  repository.getCampaign = async () => commercialCampaign({
    data_inicio: '2026-08-10',
    data_fim: '2026-08-20',
    parametros_template: {
      nome_servico: { source: 'fixed', value: 'Escova' },
      desconto: { source: 'fixed', value: 20 },
      brinde: { source: 'fixed', value: 'Hidratacao' }
    }
  });
  repository.getTemplate = async () => commercialTemplate();
  repository.getCoupon = async () => null;
  repository.listAudienceBase = async () => audienceRows();

  const result = await service.preview('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111');

  assert.deepEqual(result.provider_params, [
    'Maria Souza',
    'Escova',
    'Desconto: 20%\nBrinde: Hidratacao',
    'Oferta valida de 10/08/2026 ate 20/08/2026.'
  ]);
});

test('preview respects existing provider variable mapping from template metadata', async () => {
  repository.getCampaign = async () => commercialCampaign({
    data_inicio: '2026-08-10',
    data_fim: '2026-08-20',
    parametros_template: {
      nome_servico: { source: 'fixed', value: 'Escova' },
      desconto: { source: 'fixed', value: 20 }
    }
  });
  repository.getTemplate = async () => commercialTemplate({
    metadata: {
      provider_template_name: 'campaign_promotion_approved',
      language: 'pt_BR',
      categoria_provider: 'Marketing',
      provider_variable_mapping: {
        vigencia_campanha: 1,
        beneficios_campanha: 2,
        nome_cliente: 3,
        nome_servico: 4
      }
    }
  });
  repository.getCoupon = async () => null;
  repository.listAudienceBase = async () => audienceRows();

  const result = await service.preview('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111');

  assert.deepEqual(result.provider_params, [
    'Oferta valida de 10/08/2026 ate 20/08/2026.',
    'Desconto: 20%',
    'Maria Souza',
    'Escova'
  ]);
});

test('preview and execution only use final clients when internal users match the same campaign', async () => {
  const sends = [];
  const messages = [];
  const finalClient = audienceRows()[0];
  const internalUser = internalAudienceRow('Administrador');

  repository.getCampaign = async () => campaign();
  repository.getTemplate = async () => template();
  repository.getCoupon = async () => null;
  repository.listAudienceBase = async () => [internalUser, finalClient];
  repository.updateCampaign = async (_tenantId, _id, payload) => ({ ...campaign(), ...payload });
  repository.createCampaignSend = async (payload) => {
    sends.push(payload);
    return { id: `send-${sends.length}`, ...payload };
  };
  repository.createWhatsAppCampaignMessage = async (payload) => {
    messages.push(payload);
    return { id: `msg-${messages.length}`, ...payload };
  };
  repository.listCampaignMessages = async () => messages;

  const preview = await service.preview('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111');
  const estimate = await service.estimate('22222222-2222-4222-8222-222222222222', campaign());
  await service.start('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111');

  assert.equal(preview.recipient.nome, 'Maria Souza');
  assert.equal(estimate.eligible, 1);
  assert.equal(estimate.excluded_by_reason.usuario_interno_tenant, 1);
  assert.equal(sends.length, 1);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].cliente_id, finalClient.cliente.id);
});

test('preview does not use internal users or unsafe fallback when no client is eligible', async () => {
  repository.getCampaign = async () => commercialCampaign();
  repository.getTemplate = async () => commercialTemplate({ variaveis: ['nome_cliente', 'nome_servico'] });
  repository.getCoupon = async () => null;
  repository.listAudienceBase = async () => [internalAudienceRow('Administrador')];

  const result = await service.preview('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111');

  assert.equal(result.illustrative, true);
  assert.equal(result.recipient.nome, '[Nome do cliente]');
  assert.match(result.conteudo, /Ola, \[Nome do cliente\]!/);
  assert.doesNotMatch(result.conteudo, /Administrador Teste/);
});

test('preview resolves establishment name from campaign tenant with tenant isolation', async () => {
  repository.getCampaign = async (_tenantId, id) => {
    if (id === 'campaign-a') {
      return {
        ...campaign(),
        id: 'campaign-a',
        tenant_id: 'tenant-a',
        tenant: { id: 'tenant-a', nome_fantasia: 'Espaco A', slug: 'espaco-a' }
      };
    }
    return {
      ...campaign(),
      id: 'campaign-b',
      tenant_id: 'tenant-b',
      tenant: { id: 'tenant-b', nome_fantasia: 'Espaco B', slug: 'espaco-b' }
    };
  };
  repository.getTemplate = async () => template({
    conteudo: 'Ola, {{1}}! A {{2}} preparou {{3}}.',
    variaveis: ['nome_cliente', 'nome_estabelecimento', 'nome_servico'],
    metadata: {
      provider_template_name: 'campaign_promotion',
      provider_variable_mapping: {
        nome_cliente: 1,
        nome_estabelecimento: 2,
        nome_servico: 3
      }
    }
  });
  repository.getCoupon = async () => null;
  repository.listAudienceBase = async () => audienceRows();

  const resultA = await service.preview('tenant-a', 'campaign-a');
  const resultB = await service.preview('tenant-b', 'campaign-b');

  assert.equal(resultA.params.nome_estabelecimento, 'Espaco A');
  assert.equal(resultB.params.nome_estabelecimento, 'Espaco B');
  assert.match(resultA.conteudo, /A Espaco A preparou Manicure/);
  assert.match(resultB.conteudo, /A Espaco B preparou Manicure/);
  assert.deepEqual(resultA.provider_params, ['Maria Souza', 'Espaco A', 'Manicure']);
  assert.deepEqual(resultB.provider_params, ['Maria Souza', 'Espaco B', 'Manicure']);
});

test('preview fails without sending undefined when establishment name is unavailable', async () => {
  repository.getCampaign = async () => ({
    ...campaign(),
    tenant: null,
    metadata: { ...campaign().metadata, tenant_name: '', nome_tenant: '' }
  });
  repository.getTemplate = async () => template({
    conteudo: 'Ola, {{1}}! A {{2}} preparou {{3}}.',
    variaveis: ['nome_cliente', 'nome_estabelecimento', 'nome_servico']
  });
  repository.getCoupon = async () => null;
  repository.listAudienceBase = async () => audienceRows();

  await assert.rejects(
    () => service.preview('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111'),
    (error) => error.code === 'CAMPAIGN_ESTABLISHMENT_NAME_REQUIRED'
  );
});

test('preview keeps owner metadata client when there is no explicit internal identity', async () => {
  const ownerManagedClient = {
    ...audienceRows()[0],
    cliente: {
      ...audienceRows()[0].cliente,
      id: 'owner-managed-client',
      nome: 'Mariana Santos - espaco-vivian-beauty - Funcionario 13',
      metadata: {
        owner_role: 'Funcionario',
        owner_user_id: 'user-funcionario'
      }
    },
    metadata: {
      owner_role: 'Funcionario',
      owner_user_id: 'user-funcionario'
    },
    internal_user_roles: []
  };
  const finalClient = {
    ...audienceRows()[0],
    cliente: {
      ...audienceRows()[0].cliente,
      id: 'final-client',
      nome: 'Cliente Final Elegivel'
    },
    metadata: {},
    internal_user_roles: []
  };

  repository.getCampaign = async () => commercialCampaign();
  repository.getTemplate = async () => commercialTemplate({ variaveis: ['nome_cliente', 'nome_servico'] });
  repository.getCoupon = async () => null;
  repository.listAudienceBase = async () => [ownerManagedClient, finalClient];

  const result = await service.preview('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111');

  assert.equal(result.illustrative, false);
  assert.equal(result.recipient.nome, 'Mariana Santos - espaco-vivian-beauty - Funcionario 13');
  assert.match(result.conteudo, /Funcionario 13/);
});

test('execution writes the same rendered campaign content and provider params to mensagens_whatsapp', async () => {
  const messages = [];
  const baseCampaign = commercialCampaign({
    data_inicio: '2026-08-10',
    data_fim: '2026-08-20',
    metadata: {
      ...campaign().metadata,
      execution_mode: 'automatic',
      strategy: { approval: { valor_promocional: 49.9, brinde: 'Hidratacao' } }
    },
    parametros_template: {
      nome_servico: { source: 'fixed', value: 'Escova' }
    }
  });
  repository.getCampaign = async () => baseCampaign;
  repository.getTemplate = async () => commercialTemplate();
  repository.getCoupon = async () => null;
  repository.listAudienceBase = async () => audienceRows();
  repository.updateCampaign = async (_tenantId, _id, payload) => ({ ...baseCampaign, ...payload });
  repository.createCampaignSend = async (payload) => ({ id: 'send-1', ...payload });
  repository.createWhatsAppCampaignMessage = async (payload) => {
    messages.push(payload);
    return { id: 'msg-1', ...payload };
  };
  repository.listCampaignMessages = async () => messages;

  const preview = await service.preview('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111');
  await service.start('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111');

  assert.equal(messages.length, 1);
  assert.equal(messages[0].conteudo, preview.conteudo);
  assert.deepEqual(messages[0].payload.provider_params, preview.provider_params);
  assert.deepEqual(messages[0].payload.provider_variable_mapping, {
    nome_cliente: 1,
    nome_servico: 2,
    beneficios_campanha: 3,
    vigencia_campanha: 4
  });
  assert.doesNotMatch(messages[0].conteudo, /null|undefined|\{\{/);
});

test('campaign schema requires template on create', () => {
  assert.throws(
    () => campaignSchema.parse({
      nome: 'Campanha sem template',
      tipo: 'campanha_geral',
      criterios_segmentacao: { mode: 'all' }
    }),
    /Required/
  );
});

test('create rejects service promotion without a service', async () => {
  repository.getTemplate = async () => template();

  await assert.rejects(
    () => service.create({
      tenantId: '22222222-2222-4222-8222-222222222222',
      tenantSlug: 'tenant-test',
      userId: '77777777-7777-4777-8777-777777777777'
    }, {
      nome: 'Promocao sem servico',
      tipo: 'promocao_servico',
      template_id: '33333333-3333-4333-8333-333333333333',
      criterios_segmentacao: { mode: 'all' },
      parametros_template: { valor_promocional: { source: 'fixed', value: 'R$ 30,00' }, validade_promocao: { source: 'fixed', value: '2026-12-31' } }
    }),
    /Selecione o servico/
  );
});

test('create rejects past scheduled date', async () => {
  repository.getTemplate = async () => template();

  await assert.rejects(
    () => service.create({
      tenantId: '22222222-2222-4222-8222-222222222222',
      tenantSlug: 'tenant-test'
    }, {
      nome: 'Campanha passada',
      tipo: 'campanha_geral',
      template_id: '33333333-3333-4333-8333-333333333333',
      criterios_segmentacao: { mode: 'all' },
      parametros_template: {},
      agendada_para: '2020-01-01T10:00:00.000Z'
    }),
    /data e hora futuras/
  );
});

test('create rejects invalid coupon benefit', async () => {
  repository.getTemplate = async () => template();
  repository.getService = async () => serviceRow();
  repository.getCoupon = async () => ({
    id: '88888888-8888-4888-8888-888888888888',
    tenant_id: '22222222-2222-4222-8222-222222222222',
    codigo: 'ZERO',
    tipo_desconto: 'percentual',
    percentual_desconto: 0,
    ativo: true,
    servicos: []
  });

  await assert.rejects(
    () => service.create({
      tenantId: '22222222-2222-4222-8222-222222222222',
      tenantSlug: 'tenant-test'
    }, {
      nome: 'Promocao cupom invalido',
      tipo: 'promocao_servico',
      template_id: '33333333-3333-4333-8333-333333333333',
      servico_id: '66666666-6666-4666-8666-666666666666',
      cupom_id: '88888888-8888-4888-8888-888888888888',
      criterios_segmentacao: { mode: 'all' },
      parametros_template: {}
    }),
    /Cupom indisponivel/
  );
});

test('create stores service reference and renders service name parameter', async () => {
  let createdPayload = null;
  repository.getTemplate = async () => template();
  repository.getService = async () => serviceRow();
  repository.getCoupon = async () => null;
  repository.createCampaign = async (payload) => {
    createdPayload = payload;
    return { ...campaign(), ...payload, template: template(), servico: serviceRow(), cupom: null };
  };

  const result = await service.create({
    tenantId: '22222222-2222-4222-8222-222222222222',
    tenantSlug: 'tenant-test',
    userId: '77777777-7777-4777-8777-777777777777'
  }, {
    nome: 'Promocao manicure',
    tipo: 'promocao_servico',
    template_id: '33333333-3333-4333-8333-333333333333',
    servico_id: '66666666-6666-4666-8666-666666666666',
    criterios_segmentacao: { mode: 'all' },
    parametros_template: {
      valor_promocional: { source: 'fixed', value: 'R$ 30,00' },
      validade_promocao: { source: 'fixed', value: '2026-12-31' }
    }
  });

  assert.equal(createdPayload.servico_id, null);
  assert.equal(createdPayload.servico_tenant_id, '66666666-6666-4666-8666-666666666666');
  assert.equal(createdPayload.servico_catalogo_id, '77777777-7777-4777-8777-777777777777');
  assert.equal(createdPayload.metadata.servico_tenant_id, '66666666-6666-4666-8666-666666666666');
  assert.equal(createdPayload.parametros_template.nome_servico.value, 'Manicure');
  assert.equal(result.servico.nome, 'Manicure');
});

test('create accepts coupon scoped to selected service-specialty combination', async () => {
  let createdPayload = null;
  repository.getTemplate = async () => template();
  repository.getService = async () => serviceRow();
  repository.getCoupon = async () => ({
    id: '88888888-8888-4888-8888-888888888888',
    tenant_id: '22222222-2222-4222-8222-222222222222',
    codigo: 'COMBO10',
    tipo_desconto: 'percentual',
    percentual_desconto: 10,
    ativo: true,
    servicos: [{
      escopo: 'combinacao',
      servico_tenant_id: '66666666-6666-4666-8666-666666666666',
      especialidade_id: 'specialty-nails',
      servico_tenant_especialidade_id: 'service-tenant-specialty-nails'
    }]
  });
  repository.createCampaign = async (payload) => {
    createdPayload = payload;
    return { ...campaign(), ...payload, template: template(), servico_tenant: serviceRow(), cupom: null };
  };

  await service.create({
    tenantId: '22222222-2222-4222-8222-222222222222',
    tenantSlug: 'tenant-test'
  }, {
    nome: 'Promocao combo',
    tipo: 'promocao_servico',
    template_id: '33333333-3333-4333-8333-333333333333',
    servico_id: '66666666-6666-4666-8666-666666666666',
    especialidade_id: 'specialty-nails',
    servico_tenant_especialidade_id: 'service-tenant-specialty-nails',
    cupom_id: '88888888-8888-4888-8888-888888888888',
    criterios_segmentacao: { mode: 'all' },
    parametros_template: {
      validade_promocao: { source: 'fixed', value: '2026-12-31' }
    }
  });

  assert.equal(createdPayload.servico_tenant_especialidade_id, 'service-tenant-specialty-nails');
  assert.equal(createdPayload.especialidade_id, 'specialty-nails');
});

test('create rejects coupon scoped to a different service-specialty combination', async () => {
  repository.getTemplate = async () => template();
  repository.getService = async () => serviceRow();
  repository.getCoupon = async () => ({
    id: '88888888-8888-4888-8888-888888888888',
    tenant_id: '22222222-2222-4222-8222-222222222222',
    codigo: 'OTHERCOMBO',
    tipo_desconto: 'percentual',
    percentual_desconto: 10,
    ativo: true,
    servicos: [{
      escopo: 'combinacao',
      servico_tenant_id: '66666666-6666-4666-8666-666666666666',
      especialidade_id: 'specialty-hair',
      servico_tenant_especialidade_id: 'service-tenant-specialty-hair'
    }]
  });

  await assert.rejects(
    () => service.create({
      tenantId: '22222222-2222-4222-8222-222222222222',
      tenantSlug: 'tenant-test'
    }, {
      nome: 'Promocao combo invalido',
      tipo: 'promocao_servico',
      template_id: '33333333-3333-4333-8333-333333333333',
      servico_id: '66666666-6666-4666-8666-666666666666',
      especialidade_id: 'specialty-nails',
      servico_tenant_especialidade_id: 'service-tenant-specialty-nails',
      cupom_id: '88888888-8888-4888-8888-888888888888',
      criterios_segmentacao: { mode: 'all' },
      parametros_template: {
        validade_promocao: { source: 'fixed', value: '2026-12-31' }
      }
    }),
    /Cupom incompativel/
  );
});

test('createCoupon stores a tenant-wide general scope', async () => {
  let scopes = null;
  repository.createCoupon = async (payload, receivedScopes) => {
    scopes = receivedScopes;
    return { id: 'coupon-general', ...payload, servicos: receivedScopes };
  };

  const result = await service.createCoupon({
    tenantId: '22222222-2222-4222-8222-222222222222'
  }, {
    codigo: 'GERAL10',
    tipo_desconto: 'percentual',
    percentual_desconto: 10,
    data_fim: '2026-12-31',
    escopo: 'geral'
  });

  assert.equal(result.metadata.escopo, 'geral');
  assert.deepEqual(scopes, [{ escopo: 'geral', metadata: { source: 'campaigns_phase6' } }]);
});

test('createCoupon stores a tenant service scope from servico_tenants', async () => {
  let scopes = null;
  repository.getService = async () => serviceRow();
  repository.createCoupon = async (payload, receivedScopes) => {
    scopes = receivedScopes;
    return { id: 'coupon-service', ...payload, servicos: receivedScopes };
  };

  await service.createCoupon({
    tenantId: '22222222-2222-4222-8222-222222222222'
  }, {
    codigo: 'SERV10',
    tipo_desconto: 'percentual',
    percentual_desconto: 10,
    data_fim: '2026-12-31',
    escopo: 'servico',
    servico_tenant_id: '66666666-6666-4666-8666-666666666666'
  });

  assert.equal(scopes[0].escopo, 'servico');
  assert.equal(scopes[0].servico_tenant_id, '66666666-6666-4666-8666-666666666666');
  assert.equal(scopes[0].servico_catalogo_id, '77777777-7777-4777-8777-777777777777');
});

test('createCoupon stores specialty and service-specialty combination scopes', async () => {
  const calls = [];
  repository.getService = async () => serviceRow();
  repository.createCoupon = async (payload, receivedScopes) => {
    calls.push(receivedScopes);
    return { id: `coupon-${calls.length}`, ...payload, servicos: receivedScopes };
  };

  await service.createCoupon({
    tenantId: '22222222-2222-4222-8222-222222222222'
  }, {
    codigo: 'ESP10',
    tipo_desconto: 'percentual',
    percentual_desconto: 10,
    data_fim: '2026-12-31',
    escopo: 'especialidade',
    especialidade_id: 'specialty-nails'
  });
  await service.createCoupon({
    tenantId: '22222222-2222-4222-8222-222222222222'
  }, {
    codigo: 'COMBO10',
    tipo_desconto: 'percentual',
    percentual_desconto: 10,
    data_fim: '2026-12-31',
    escopo: 'combinacao',
    servico_tenant_id: '66666666-6666-4666-8666-666666666666',
    servico_tenant_especialidade_id: 'service-tenant-specialty-nails'
  });

  assert.equal(calls[0][0].escopo, 'especialidade');
  assert.equal(calls[0][0].especialidade_id, 'specialty-nails');
  assert.equal(calls[1][0].escopo, 'combinacao');
  assert.equal(calls[1][0].servico_tenant_id, '66666666-6666-4666-8666-666666666666');
  assert.equal(calls[1][0].especialidade_id, 'specialty-nails');
  assert.equal(calls[1][0].servico_tenant_especialidade_id, 'service-tenant-specialty-nails');
});

test('start generates one queued WhatsApp message per eligible recipient with idempotency', async () => {
  const sends = [];
  const messages = [];
  repository.getCampaign = async () => campaign();
  repository.getTemplate = async () => template();
  repository.getCoupon = async () => null;
  repository.listAudienceBase = async () => audienceRows();
  repository.updateCampaign = async (_tenantId, _id, payload) => ({ ...campaign(), ...payload });
  repository.createCampaignSend = async (payload) => {
    sends.push(payload);
    return { id: `send-${sends.length}`, ...payload };
  };
  repository.createWhatsAppCampaignMessage = async (payload) => {
    messages.push(payload);
    return { id: `msg-${messages.length}`, ...payload };
  };
  repository.listCampaignMessages = async () => messages;

  const result = await service.start('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111');

  assert.equal(sends.length, 1);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].idempotency_key, '22222222-2222-4222-8222-222222222222:11111111-1111-4111-8111-111111111111:44444444-4444-4444-8444-444444444444:33333333-3333-4333-8333-333333333333');
  assert.equal(messages[0].payload.priority, 'low');
  assert.equal(result.status, 'em_processamento');
  assert.equal(result.metadata.status_processamento, 'CONCLUIDO');
  assert.equal(result.metadata.status_campanha, 'EM_ANDAMENTO');
  assert.equal(result.total_geradas, 1);
});

test('start generates immediate birthday campaign messages for all eligible current-month birthdays', async () => {
  const sends = [];
  const messages = [];
  repository.getCampaign = async () => birthdayCampaign();
  repository.getTemplate = async () => birthdayTemplate();
  repository.getCoupon = async () => null;
  repository.listAudienceBase = async () => [{
    ...audienceRows()[0],
    cliente: {
      ...audienceRows()[0].cliente,
      id: 'birthday-mid-month',
      data_nascimento: birthdayInCurrentMonth(15)
    }
  }, {
    ...audienceRows()[0],
    id: 'link-last-day-start',
    cliente: {
      ...audienceRows()[0].cliente,
      id: 'birthday-last-day-start',
      nome: 'Cliente Ultimo Dia',
      telefone: '+5511988888888',
      data_nascimento: birthdayInCurrentMonth(31)
    }
  }];
  repository.updateCampaign = async (_tenantId, _id, payload) => ({ ...birthdayCampaign(), ...payload });
  repository.createCampaignSend = async (payload) => {
    sends.push(payload);
    return { id: `send-${sends.length}`, ...payload };
  };
  repository.createWhatsAppCampaignMessage = async (payload) => {
    messages.push(payload);
    return { id: `msg-${messages.length}`, ...payload };
  };
  repository.listCampaignMessages = async () => messages;

  const result = await service.start('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111');

  assert.equal(sends.length, 2);
  assert.equal(messages.length, 2);
  assert.deepEqual(messages.map((message) => message.status_envio), ['pendente', 'pendente']);
  assert.deepEqual(messages.map((message) => message.agendado_para), [null, null]);
  assert.equal(result.total_geradas, 2);
});

test('commercial cooldown blocks client temporarily across campaigns', async () => {
  const sends = [];
  const messages = [];
  repository.getCampaign = async () => ({ ...campaign(), id: 'campaign-b' });
  repository.getTemplate = async () => template();
  repository.getCoupon = async () => null;
  repository.listAudienceBase = async () => audienceRows();
  repository.listRecentCommercialMessages = async () => [{
    id: 'recent-message',
    cliente_id: '44444444-4444-4444-8444-444444444444',
    campanha_id: 'campaign-a',
    created_at: new Date().toISOString(),
    tipo_evento: 'campaign.message',
    payload: { natureza_campanha: 'promocional' }
  }];
  repository.updateCampaign = async (_tenantId, _id, payload) => ({ ...campaign(), id: 'campaign-b', ...payload });
  repository.createCampaignSend = async (payload) => {
    sends.push(payload);
    return { id: `send-${sends.length}`, ...payload };
  };
  repository.createWhatsAppCampaignMessage = async (payload) => {
    messages.push(payload);
    return { id: `msg-${messages.length}`, ...payload };
  };
  repository.listCampaignMessages = async () => messages;

  await assert.rejects(
    () => service.start('22222222-2222-4222-8222-222222222222', 'campaign-b'),
    /Nenhum cliente elegivel/
  );
  assert.equal(sends.length, 0);
  assert.equal(messages.length, 0);
});

test('commercial cooldown allows client after interval', async () => {
  const messages = [];
  repository.getCampaign = async () => ({ ...campaign(), id: 'campaign-b' });
  repository.getTemplate = async () => template();
  repository.getCoupon = async () => null;
  repository.listAudienceBase = async () => audienceRows();
  repository.listRecentCommercialMessages = async () => [];
  repository.updateCampaign = async (_tenantId, _id, payload) => ({ ...campaign(), id: 'campaign-b', ...payload });
  repository.createCampaignSend = async (payload) => ({ id: 'send-1', ...payload });
  repository.createWhatsAppCampaignMessage = async (payload) => {
    messages.push(payload);
    return { id: 'msg-1', ...payload };
  };
  repository.listCampaignMessages = async () => messages;

  const result = await service.start('22222222-2222-4222-8222-222222222222', 'campaign-b');

  assert.equal(messages.length, 1);
  assert.equal(result.total_geradas, 1);
});

test('createFromSuggestion stores lifecycle metadata requiring tenant approval', async () => {
  let createdPayload = null;
  repository.listMarketingTemplates = async () => [template({ nome: 'campaign_birthday' })];
  repository.getTemplate = async () => template({ nome: 'campaign_birthday' });
  repository.createCampaign = async (payload) => {
    createdPayload = payload;
    return { ...campaign(), ...payload, template: template({ nome: 'campaign_birthday' }) };
  };

  const result = await service.createFromSuggestion({
    tenantId: '22222222-2222-4222-8222-222222222222',
    tenantSlug: 'tenant-test',
    userId: '77777777-7777-4777-8777-777777777777'
  }, 'birthday_month');

  assert.equal(createdPayload.metadata.origin, 'ai_suggestion');
  assert.equal(createdPayload.metadata.origem_campanha, 'ia');
  assert.equal(createdPayload.metadata.tipo_publico, 'clientes');
  assert.equal(createdPayload.metadata.lifecycle_stage, 'suggestion');
  assert.equal(createdPayload.metadata.requires_tenant_approval, true);
  assert.equal(result.tipo, 'aniversario');
});

test('createFromSuggestion blocks duplicate active equivalent suggestion', async () => {
  repository.listMarketingTemplates = async () => [template({ nome: 'campaign_birthday' })];
  repository.listEquivalentCampaigns = async () => [{
    ...campaign(),
    tipo: 'aniversario',
    created_at: new Date().toISOString(),
    metadata: { suggestion_key: 'birthday_month', tipo_publico: 'clientes', status_campanha: 'SUGERIDA' }
  }];

  await assert.rejects(
    () => service.createFromSuggestion({
      tenantId: '22222222-2222-4222-8222-222222222222',
      tenantSlug: 'tenant-test',
      userId: '77777777-7777-4777-8777-777777777777'
    }, 'birthday_month'),
    /campanha equivalente/
  );
});

test('approve blocks promotional campaign without start date', async () => {
  repository.getCampaign = async () => ({ ...campaign(), data_inicio: null, metadata: { ...campaign().metadata, lifecycle_stage: 'suggestion' } });
  repository.getCoupon = async () => null;

  await assert.rejects(
    () => service.approve({
      tenantId: '22222222-2222-4222-8222-222222222222',
      userId: '77777777-7777-4777-8777-777777777777'
    }, '11111111-1111-4111-8111-111111111111', {
      valor_promocional: 30
    }),
    /data de inicio/
  );
});

test('approve blocks promotional campaign without benefit', async () => {
  repository.getCampaign = async () => ({ ...campaign(), data_inicio: null, metadata: { ...campaign().metadata, lifecycle_stage: 'suggestion' }, parametros_template: {} });
  repository.getCoupon = async () => null;

  await assert.rejects(
    () => service.approve({
      tenantId: '22222222-2222-4222-8222-222222222222',
      userId: '77777777-7777-4777-8777-777777777777'
    }, '11111111-1111-4111-8111-111111111111', {
      data_inicial: '2026-08-01'
    }),
    /beneficio/
  );
});

test('approve accepts promotional campaign with start date and gift', async () => {
  repository.getCampaign = async () => ({ ...campaign(), data_inicio: null, metadata: { ...campaign().metadata, lifecycle_stage: 'suggestion' }, parametros_template: {} });
  repository.getCoupon = async () => null;
  repository.updateCampaign = async (_tenantId, _id, payload) => ({ ...campaign(), ...payload });
  const scheduledStart = futureDateOnly(10);

  const result = await service.approve({
    tenantId: '22222222-2222-4222-8222-222222222222',
    userId: '77777777-7777-4777-8777-777777777777'
  }, '11111111-1111-4111-8111-111111111111', {
    data_inicial: scheduledStart,
    brinde: 'Hidratacao'
  });

  assert.equal(result.metadata.status_campanha, 'AGENDADA');
  assert.equal(result.metadata.strategy.approval.brinde, 'Hidratacao');
});

test('approve is idempotent after campaign was already approved', async () => {
  const approved = {
    ...campaign(),
    status: 'pronta',
    metadata: {
      ...campaign().metadata,
      lifecycle_stage: 'approved',
      status_campanha: 'PARAMETRIZADA'
    }
  };
  repository.getCampaign = async () => approved;
  repository.updateCampaign = async () => {
    throw new Error('duplicate approval should not update campaign');
  };

  const result = await service.approve({
    tenantId: '22222222-2222-4222-8222-222222222222',
    userId: '77777777-7777-4777-8777-777777777777'
  }, '11111111-1111-4111-8111-111111111111', {
    data_inicial: '2026-08-01',
    brinde: 'Outro brinde'
  });

  assert.equal(result.metadata.lifecycle_stage, 'approved');
  assert.equal(result.metadata.strategy?.approval?.brinde, undefined);
});

test('start blocks suggested campaign before tenant approval', async () => {
  repository.getCampaign = async () => ({
    ...campaign(),
    metadata: {
      requires_tenant_approval: true,
      lifecycle_stage: 'suggestion'
    }
  });

  await assert.rejects(
    () => service.start('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111'),
    /exige aprovacao/
  );
});

test('start only prepares tenant-assisted approved campaign without queue messages', async () => {
  const updates = [];
  repository.getCampaign = async () => ({
    ...campaign(),
    metadata: {
      requires_tenant_approval: true,
      lifecycle_stage: 'approved',
      execution_mode: 'tenant_assisted',
      strategy: {}
    }
  });
  repository.updateCampaign = async (_tenantId, _id, payload) => {
    updates.push(payload);
    return { ...campaign(), ...payload };
  };
  repository.createWhatsAppCampaignMessage = async () => {
    throw new Error('queue should not be created for assisted delivery');
  };

  const result = await service.start('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111');

  assert.equal(updates.length, 1);
  assert.equal(result.metadata.lifecycle_stage, 'prepared_for_manual_delivery');
});

test('start blocks real send when marketing template is not approved', async () => {
  env.whatsappDryRun = false;
  repository.getCampaign = async () => campaign();
  repository.getTemplate = async () => template({ aprovado_provider: false });
  repository.getCoupon = async () => null;
  repository.listAudienceBase = async () => audienceRows();
  repository.updateCampaign = async (_tenantId, _id, payload) => ({ ...campaign(), ...payload });

  await assert.rejects(
    () => service.start('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111'),
    /Envio real exige template aprovado/
  );
});

test('cancel marks only queued campaign messages as canceled', async () => {
  repository.getCampaign = async () => campaign();
  repository.cancelQueuedMessages = async () => [{ id: 'msg-1' }, { id: 'msg-2' }];
  repository.updateCampaign = async (_tenantId, _id, payload) => ({ ...campaign(), ...payload });

  const result = await service.cancel('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111');

  assert.equal(result.status, 'cancelada');
  assert.equal(result.total_canceladas, 2);
  assert.ok(result.cancelada_em);
});

