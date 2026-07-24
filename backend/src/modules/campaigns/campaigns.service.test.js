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
  return {
    id: '66666666-6666-4666-8666-666666666666',
    tenant_id: '22222222-2222-4222-8222-222222222222',
    nome: 'Manicure',
    categoria: 'manicure',
    preco: 50,
    ativo: true,
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

  const result = await service.list('22222222-2222-4222-8222-222222222222', { page: 1, page_size: 20 });

  assert.equal(result.items.length, 1);
  assert.equal(result.pagination.total, 15);
  assert.equal(result.pagination.has_next, false);
  assert.equal(result.diagnostics.criteria.tenant_id, '22222222-2222-4222-8222-222222222222');
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

test('preview skips campaign test clients marked with internal owner role in metadata', async () => {
  const internalOwnedClient = {
    ...audienceRows()[0],
    cliente: {
      ...audienceRows()[0].cliente,
      id: 'internal-owned-client',
      nome: 'Mariana Santos - espaco-vivian-beauty - Funcionario 13'
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
  repository.listAudienceBase = async () => [internalOwnedClient, finalClient];

  const result = await service.preview('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111');

  assert.equal(result.illustrative, false);
  assert.equal(result.recipient.nome, 'Cliente Final Elegivel');
  assert.doesNotMatch(result.conteudo, /Funcionario 13/);
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

  assert.equal(createdPayload.servico_id, '66666666-6666-4666-8666-666666666666');
  assert.equal(createdPayload.parametros_template.nome_servico.value, 'Manicure');
  assert.equal(result.servico.nome, 'Manicure');
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

  const result = await service.approve({
    tenantId: '22222222-2222-4222-8222-222222222222',
    userId: '77777777-7777-4777-8777-777777777777'
  }, '11111111-1111-4111-8111-111111111111', {
    data_inicial: '2026-08-01',
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

