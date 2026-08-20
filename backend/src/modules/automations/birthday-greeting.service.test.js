const assert = require('node:assert/strict');
const test = require('node:test');

const campaignsRepository = require('../campaigns/campaigns.repository');
const communicationRepository = require('../communication/communication.repository');
const automationRepository = require('./birthday-greeting.repository');
const env = require('../../config/env');
const service = require('./birthday-greeting.service');

const originalCampaignsRepository = { ...campaignsRepository };
const originalCommunicationRepository = { ...communicationRepository };
const originalAutomationRepository = { ...automationRepository };
const originalDryRun = env.whatsappDryRun;

function restore() {
  Object.assign(campaignsRepository, originalCampaignsRepository);
  Object.assign(communicationRepository, originalCommunicationRepository);
  Object.assign(automationRepository, originalAutomationRepository);
  env.whatsappDryRun = originalDryRun;
}

function automation(overrides = {}) {
  return {
    id: overrides.id || 'automation-tenant-a',
    tenant_id: overrides.tenant_id || 'tenant-a',
    tipo: 'birthday_greeting',
    canal: 'whatsapp',
    ativo: true,
    horario_envio: overrides.horario_envio || '09:00',
    timezone: overrides.timezone || 'America/Sao_Paulo',
    tenant: {
      nome_fantasia: overrides.tenant_name || 'Bellory Studio'
    },
    template: overrides.template === undefined ? template() : overrides.template,
    metadata: overrides.metadata || {}
  };
}

function template(overrides = {}) {
  return {
    id: overrides.id || 'template-birthday-greeting',
    nome: 'birthday_greeting',
    canal: 'whatsapp',
    tipo: 'marketing',
    conteudo: 'Oi, {{1}}! Feliz aniversario. Com carinho, {{2}}.',
    variaveis: ['nome_cliente', 'nome_salao'],
    aprovado_provider: overrides.aprovado_provider !== false,
    ativo: overrides.ativo !== false,
    metadata: {
      provider_template_name: 'birthday_greeting',
      language: 'pt_BR',
      provider_variable_mapping: {
        nome_cliente: 1,
        nome_salao: 2
      },
      ...(overrides.metadata || {})
    }
  };
}

function audienceRow(overrides = {}) {
  const client = overrides.cliente || {};
  return {
    id: overrides.id || 'link-client-a',
    tenant_id: overrides.tenant_id || 'tenant-a',
    cliente_id: overrides.cliente_id || client.id || 'client-a',
    nome_no_tenant: overrides.nome_no_tenant || null,
    status: overrides.status || 'ativo',
    aceita_campanhas: overrides.aceita_campanhas !== false,
    ativo: overrides.ativo !== false,
    metadata: overrides.metadata || {},
    internal_user_roles: overrides.internal_user_roles || [],
    cliente: {
      id: client.id || overrides.cliente_id || 'client-a',
      nome: client.nome || 'Ana Cliente',
      telefone: client.telefone === undefined ? '+5511999999999' : client.telefone,
      data_nascimento: client.data_nascimento === undefined ? '1990-07-26' : client.data_nascimento,
      ativo: client.ativo !== false,
      deleted_at: client.deleted_at || null,
      metadata: client.metadata || {}
    }
  };
}

function mockQueue({ rows = [audienceRow()], existing = null } = {}) {
  const created = [];
  campaignsRepository.listAudienceBase = async () => rows;
  communicationRepository.findActiveMessageTemplate = async () => template();
  communicationRepository.findWhatsAppMessageByIdempotencyKey = async () => existing;
  communicationRepository.createWhatsAppMessageLog = async (payload) => {
    const message = { id: `message-${created.length + 1}`, ...payload };
    created.push(message);
    return message;
  };
  automationRepository.updateAutomationRun = async () => null;
  return created;
}

test.afterEach(restore);

test('queues birthday greeting when birthday is today', async () => {
  const created = mockQueue();
  const result = await service.queueForAutomation(automation(), {
    now: new Date('2026-07-26T12:00:00.000Z')
  });

  assert.equal(result.generated, 1);
  assert.equal(created[0].tipo_evento, 'birthday.greeting');
  assert.equal(created[0].template_nome, 'birthday_greeting');
  assert.equal(created[0].payload.provider_parameter_format, 'positional');
  assert.deepEqual(created[0].payload.provider_params, ['Ana Cliente', 'Bellory Studio']);
  assert.equal(created[0].idempotency_key, 'tenant-a:client-a:birthday_greeting:2026');
});

test('excludes birthday tomorrow', async () => {
  mockQueue({ rows: [audienceRow({ cliente: { data_nascimento: '1990-07-27' } })] });
  const result = await service.queueForAutomation(automation(), { now: new Date('2026-07-26T12:00:00.000Z') });
  assert.equal(result.generated, 0);
  assert.equal(result.audience.excluded_by_reason.fora_do_dia_aniversario, 1);
});

test('excludes birthday yesterday', async () => {
  mockQueue({ rows: [audienceRow({ cliente: { data_nascimento: '1990-07-25' } })] });
  const result = await service.queueForAutomation(automation(), { now: new Date('2026-07-26T12:00:00.000Z') });
  assert.equal(result.generated, 0);
  assert.equal(result.audience.excluded_by_reason.fora_do_dia_aniversario, 1);
});

test('excludes same month with different day', async () => {
  mockQueue({ rows: [audienceRow({ cliente: { data_nascimento: '1990-07-01' } })] });
  const result = await service.queueForAutomation(automation(), { now: new Date('2026-07-26T12:00:00.000Z') });
  assert.equal(result.generated, 0);
  assert.equal(result.audience.excluded_by_reason.fora_do_dia_aniversario, 1);
});

test('excludes clients without birth date', async () => {
  mockQueue({ rows: [audienceRow({ cliente: { data_nascimento: null } })] });
  const result = await service.queueForAutomation(automation(), { now: new Date('2026-07-26T12:00:00.000Z') });
  assert.equal(result.generated, 0);
  assert.equal(result.audience.excluded_by_reason.sem_data_nascimento, 1);
});

test('excludes invalid phone', async () => {
  mockQueue({ rows: [audienceRow({ cliente: { telefone: '123' } })] });
  const result = await service.queueForAutomation(automation(), { now: new Date('2026-07-26T12:00:00.000Z') });
  assert.equal(result.generated, 0);
  assert.equal(result.audience.excluded_by_reason.telefone_invalido, 1);
});

test('excludes clients without consent', async () => {
  mockQueue({ rows: [audienceRow({ aceita_campanhas: false })] });
  const result = await service.queueForAutomation(automation(), { now: new Date('2026-07-26T12:00:00.000Z') });
  assert.equal(result.generated, 0);
  assert.equal(result.audience.excluded_by_reason.sem_consentimento, 1);
});

test('excludes opt-out clients', async () => {
  mockQueue({ rows: [audienceRow({ metadata: { opt_out_whatsapp: true } })] });
  const result = await service.queueForAutomation(automation(), { now: new Date('2026-07-26T12:00:00.000Z') });
  assert.equal(result.generated, 0);
  assert.equal(result.audience.excluded_by_reason.sem_consentimento, 1);
});

test('excludes internal tenant users', async () => {
  mockQueue({ rows: [audienceRow({ internal_user_roles: ['Administrador'] })] });
  const result = await service.queueForAutomation(automation(), { now: new Date('2026-07-26T12:00:00.000Z') });
  assert.equal(result.generated, 0);
  assert.equal(result.audience.excluded_by_reason.usuario_interno_tenant, 1);
});

test('keeps tenants isolated for the same client', async () => {
  const created = [];
  campaignsRepository.listAudienceBase = async (tenantId) => [
    audienceRow({ tenant_id: tenantId, cliente_id: 'shared-client', cliente: { id: 'shared-client' } })
  ];
  communicationRepository.findWhatsAppMessageByIdempotencyKey = async () => null;
  communicationRepository.createWhatsAppMessageLog = async (payload) => {
    created.push(payload);
    return payload;
  };
  automationRepository.updateAutomationRun = async () => null;

  const results = await service.processDueBirthdayGreetings({
    now: new Date('2026-07-26T12:00:00.000Z'),
    automations: [
      automation({ id: 'automation-a', tenant_id: 'tenant-a' }),
      automation({ id: 'automation-b', tenant_id: 'tenant-b', tenant_name: 'Outro Studio' })
    ]
  });

  assert.equal(results.length, 2);
  assert.deepEqual(created.map((item) => item.idempotency_key), [
    'tenant-a:shared-client:birthday_greeting:2026',
    'tenant-b:shared-client:birthday_greeting:2026'
  ]);
});

test('does not duplicate when run twice on the same day', async () => {
  let existing = null;
  const created = mockQueue();
  communicationRepository.findWhatsAppMessageByIdempotencyKey = async () => existing;
  communicationRepository.createWhatsAppMessageLog = async (payload) => {
    existing = { id: 'message-existing', ...payload };
    created.push(existing);
    return existing;
  };

  await service.queueForAutomation(automation(), { now: new Date('2026-07-26T12:00:00.000Z') });
  const second = await service.queueForAutomation(automation(), { now: new Date('2026-07-26T12:05:00.000Z') });

  assert.equal(created.length, 1);
  assert.equal(second.generated, 0);
  assert.equal(second.duplicates, 1);
});

test('does not duplicate after restart because idempotency is persisted', async () => {
  const existing = { id: 'persisted-message', idempotency_key: 'tenant-a:client-a:birthday_greeting:2026' };
  const created = mockQueue({ existing });
  const result = await service.queueForAutomation(automation(), { now: new Date('2026-07-26T12:00:00.000Z') });
  assert.equal(created.length, 0);
  assert.equal(result.duplicates, 1);
});

test('allows a new send in a new year', async () => {
  const keys = new Set(['tenant-a:client-a:birthday_greeting:2026']);
  const created = mockQueue();
  communicationRepository.findWhatsAppMessageByIdempotencyKey = async (key) => (
    keys.has(key) ? { id: 'old-message', idempotency_key: key } : null
  );

  const result = await service.queueForAutomation(automation(), { now: new Date('2027-07-26T12:00:00.000Z') });
  assert.equal(result.generated, 1);
  assert.equal(created[0].idempotency_key, 'tenant-a:client-a:birthday_greeting:2027');
});

test('allows dry-run with unapproved birthday template', async () => {
  env.whatsappDryRun = true;
  const created = mockQueue();
  const result = await service.queueForAutomation(automation({ template: template({ aprovado_provider: false }) }), {
    now: new Date('2026-07-26T12:00:00.000Z')
  });

  assert.equal(result.generated, 1);
  assert.equal(created[0].payload.provider_approved, false);
});

test('blocks real send queueing when birthday template is not approved', async () => {
  env.whatsappDryRun = false;
  const created = mockQueue();
  const result = await service.processDueBirthdayGreetings({
    now: new Date('2026-07-26T12:00:00.000Z'),
    automations: [automation({ template: template({ aprovado_provider: false }) })]
  });

  assert.equal(created.length, 0);
  assert.equal(result[0].status, 'error');
  assert.equal(result[0].code, 'BIRTHDAY_GREETING_TEMPLATE_NOT_APPROVED');
});

test('respects configured tenant timezone and send time', async () => {
  const created = mockQueue();
  const config = automation({ timezone: 'America/Sao_Paulo', horario_envio: '09:00' });

  const before = await service.queueForAutomation(config, { now: new Date('2026-07-26T11:59:00.000Z') });
  const after = await service.queueForAutomation(config, { now: new Date('2026-07-26T12:00:00.000Z') });

  assert.equal(before.status, 'not_due');
  assert.equal(after.generated, 1);
  assert.equal(created.length, 1);
});

test('treats Feb 29 birthdays on Feb 28 in non-leap years', async () => {
  mockQueue({ rows: [audienceRow({ cliente: { data_nascimento: '1992-02-29' } })] });
  const result = await service.queueForAutomation(automation(), { now: new Date('2027-02-28T12:00:00.000Z') });
  assert.equal(result.generated, 1);
});
