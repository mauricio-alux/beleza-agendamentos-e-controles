const assert = require('node:assert/strict');
const test = require('node:test');

const communicationRepository = require('./communication.repository');
const whatsappProvider = require('./providers/whatsapp-mysaas.provider');
const communicationService = require('./communication.service');
const { getInstitutionalSignatureText } = require('./institutional-signature');

const originalRepository = { ...communicationRepository };
const originalProvider = { ...whatsappProvider };

function restoreMocks() {
  Object.assign(communicationRepository, originalRepository);
  Object.assign(whatsappProvider, originalProvider);
}

function buildAppointment() {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    tenant_id: '22222222-2222-4222-8222-222222222222',
    cliente_id: '33333333-3333-4333-8333-333333333333',
    profissional_id: '44444444-4444-4444-8444-444444444444',
    token_confirmacao: 'apt_test_token',
    data_inicio: '2026-06-22T17:00:00.000Z',
    cliente: {
      nome: 'Marcia Maria',
      telefone: '+5511999999999'
    },
    tenant: {
      nome_fantasia: 'Bella Rosa Studio',
      slug: 'bella-rosa-studio'
    },
    profissional: {
      nome_publico: 'Rosely Cordeiro'
    },
    servicos: [
      {
        servico_tenant_id: '55555555-5555-4555-8555-555555555555',
        nome_servico: 'Maquiagem',
        servico_tenant: {
          servico_catalogo: {
            nome: 'Maquiagem'
          }
        }
      }
    ]
  };
}

test.afterEach(restoreMocks);

test('sendAppointmentEvent uses active templates_mensagem as message source', async () => {
  const createdLogs = [];
  let providerCalled = false;

  communicationRepository.findExistingWhatsAppMessageLog = async () => null;
  communicationRepository.findActiveMessageTemplate = async () => ({
    id: '55555555-5555-4555-8555-555555555555',
    nome: 'appointment_created_custom',
    conteudo: 'Ola {{1}}, seu atendimento de {{2}} foi recebido.',
    variaveis: ['nome_cliente', 'nome_servico'],
    aprovado_provider: true,
    metadata: {
      provider_template_name: 'meta_appointment_created',
      language: 'pt_BR'
    }
  });
  communicationRepository.createWhatsAppMessageLog = async (payload) => {
    const log = {
      id: '66666666-6666-4666-8666-666666666666',
      ...payload
    };
    createdLogs.push(log);
    return log;
  };
  communicationRepository.updateWhatsAppMessageLog = async (id, payload) => ({
    id,
    ...createdLogs[0],
    ...payload
  });
  whatsappProvider.shouldDryRun = () => true;
  whatsappProvider.sendOperationalMessage = async () => {
    providerCalled = true;
    throw new Error('Provider should not be called from appointment event.');
  };

  const [result] = await communicationService.sendAppointmentEvent('appointment.created', {
    tenantId: '22222222-2222-4222-8222-222222222222',
    payload: {
      appointment_id: '11111111-1111-4111-8111-111111111111',
      appointment: buildAppointment()
    }
  });

  assert.equal(createdLogs[0].template_nome, 'appointment_created_custom');
  assert.equal(createdLogs[0].conteudo, [
    'Ola Marcia Maria, seu atendimento de Maquiagem foi recebido.',
    '',
    getInstitutionalSignatureText()
  ].join('\n'));
  assert.equal(createdLogs[0].payload.template_id, '55555555-5555-4555-8555-555555555555');
  assert.equal(createdLogs[0].payload.template_source, 'templates_mensagem');
  assert.equal(createdLogs[0].payload.provider_template_name, 'meta_appointment_created');
  assert.equal(createdLogs[0].payload.provider_parameter_format, 'positional');
  assert.deepEqual(createdLogs[0].payload.provider_variable_mapping, {
    nome_cliente: 1,
    nome_servico: 2
  });
  assert.deepEqual(createdLogs[0].payload.provider_params, ['Marcia Maria', 'Maquiagem']);
  assert.equal(createdLogs[0].payload.idempotency_key, createdLogs[0].idempotency_key);
  assert.equal(providerCalled, false);
  assert.equal(result.status_envio, 'pendente');
  assert.equal(result.provider_message_id, undefined);
});

test('sendAppointmentEvent uses appointment_confirmed DB actions for reschedule and cancel', async () => {
  const createdLogs = [];

  communicationRepository.findExistingWhatsAppMessageLog = async () => null;
  communicationRepository.findActiveMessageTemplate = async () => ({
    id: '55555555-5555-4555-8555-555555555557',
    nome: 'appointment_confirmed',
    conteudo: [
      'Ol\u00e1, {{1}}!',
      '',
      '{{2}} confirmou seu atendimento.',
      '',
      'Data: {{5}}',
      'Hor\u00e1rio: {{6}}',
      'Servi\u00e7o: {{3}}',
      'Profissional: {{4}}',
      '',
      'Estamos aguardando voc\u00ea.',
      '',
      'Caso precise alterar seu atendimento, utilize uma das op\u00e7\u00f5es abaixo.'
    ].join('\n'),
    variaveis: ['nome_cliente', 'nome_estabelecimento', 'nome_servico', 'nome_profissional', 'data_agendamento', 'hora_agendamento'],
    aprovado_provider: false,
    metadata: {
      provider_template_name: 'appointment_confirmed',
      language: 'pt_BR',
      actions: [
        { id: 'reschedule', title: 'Reagendar', action_type: 'reschedule', route: '/reagendar' },
        { id: 'cancel', title: 'Cancelar', action_type: 'cancel', route: '/acao_agendamento' }
      ]
    }
  });
  communicationRepository.createWhatsAppMessageLog = async (payload) => {
    const log = { id: '66666666-6666-4666-8666-666666666668', ...payload };
    createdLogs.push(log);
    return log;
  };
  communicationRepository.updateWhatsAppMessageLog = async (id, payload) => ({
    id,
    ...createdLogs[0],
    ...payload
  });
  whatsappProvider.shouldDryRun = () => true;

  await communicationService.sendAppointmentEvent('appointment.confirmed', {
    tenantId: '22222222-2222-4222-8222-222222222222',
    payload: {
      appointment_id: '11111111-1111-4111-8111-111111111111',
      appointment: buildAppointment()
    }
  });

  assert.equal(createdLogs[0].template_nome, 'appointment_confirmed');
  assert.equal(createdLogs[0].payload.template_source, 'templates_mensagem');
  assert.doesNotMatch(createdLogs[0].conteudo, /\[Reagendar\]/);
  assert.doesNotMatch(createdLogs[0].conteudo, /\[Cancelar\]/);
  assert.deepEqual(createdLogs[0].payload.actions.map((action) => action.id), ['reschedule', 'cancel']);
  assert.deepEqual(createdLogs[0].payload.actions.map((action) => action.source), ['templates_mensagem', 'templates_mensagem']);
  assert.match(createdLogs[0].payload.actions[0].url, /\/reagendar\?tk=apt_test_token$/);
  assert.match(createdLogs[0].payload.actions[1].url, /\/acao_agendamento\?cmd=cancelar&tk=apt_test_token$/);
  assert.doesNotMatch(createdLogs[0].payload.actions[0].url, /11111111-1111-4111-8111-111111111111/);
  assert.doesNotMatch(createdLogs[0].payload.actions[1].url, /11111111-1111-4111-8111-111111111111/);
  assert.equal(createdLogs[0].payload.operational_context.appointment_token, 'apt_test_token');
  assert.deepEqual(createdLogs[0].payload.provider_params, [
    'Marcia Maria',
    'Bella Rosa Studio',
    'Maquiagem',
    'Rosely Cordeiro',
    '22/06/2026',
    '14:00'
  ]);
  assert.deepEqual(createdLogs[0].payload.provider_buttons.map((button) => ({
    id: button.id,
    index: button.index,
    sub_type: button.sub_type,
    parameter_value: button.parameter_value
  })), [
    { id: 'reschedule', index: 0, sub_type: 'url', parameter_value: 'apt_test_token' },
    { id: 'cancel', index: 1, sub_type: 'url', parameter_value: 'apt_test_token' }
  ]);
  assert.deepEqual(createdLogs[0].payload.provider_components, [
    {
      type: 'body',
      parameters: ['Marcia Maria', 'Bella Rosa Studio', 'Maquiagem', 'Rosely Cordeiro', '22/06/2026', '14:00']
    },
    {
      type: 'button',
      sub_type: 'url',
      index: 0,
      parameters: ['apt_test_token']
    },
    {
      type: 'button',
      sub_type: 'url',
      index: 1,
      parameters: ['apt_test_token']
    }
  ]);
});

test('sendAppointmentEvent rejects appointment_confirmed DB template without mandatory actions', async () => {
  communicationRepository.findExistingWhatsAppMessageLog = async () => null;
  communicationRepository.findActiveMessageTemplate = async () => ({
    id: '55555555-5555-4555-8555-555555555558',
    nome: 'appointment_confirmed',
    conteudo: 'Ol\u00e1, {{1}}! {{2}} confirmou seu atendimento.',
    variaveis: ['nome_cliente', 'nome_estabelecimento'],
    aprovado_provider: false,
    metadata: {
      provider_template_name: 'appointment_confirmed',
      language: 'pt_BR',
      actions: []
    }
  });
  whatsappProvider.shouldDryRun = () => true;

  await assert.rejects(
    () => communicationService.sendAppointmentEvent('appointment.confirmed', {
      tenantId: '22222222-2222-4222-8222-222222222222',
      payload: {
        appointment_id: '11111111-1111-4111-8111-111111111111',
        appointment: buildAppointment()
      }
    }),
    /Template appointment_confirmed operacionalmente incompleto/
  );
});

test('sendAppointmentEvent rejects eligible DB template without establishment variable', async () => {
  communicationRepository.findExistingWhatsAppMessageLog = async () => null;
  communicationRepository.findActiveMessageTemplate = async () => ({
    id: '55555555-5555-4555-8555-555555555560',
    nome: 'appointment_created',
    conteudo: 'Ola {{1}}, recebemos sua solicitacao de {{2}}.',
    variaveis: ['nome_cliente', 'nome_servico'],
    aprovado_provider: false,
    metadata: {
      provider_template_name: 'appointment_created',
      language: 'pt_BR'
    }
  });
  communicationRepository.createWhatsAppMessageLog = async () => {
    throw new Error('mensagens_whatsapp should not be created without establishment identification');
  };
  whatsappProvider.shouldDryRun = () => true;

  await assert.rejects(
    () => communicationService.sendAppointmentEvent('appointment.created', {
      tenantId: '22222222-2222-4222-8222-222222222222',
      payload: {
        appointment_id: '11111111-1111-4111-8111-111111111111',
        appointment: buildAppointment()
      }
    }),
    (error) => error.code === 'WHATSAPP_ESTABLISHMENT_NAME_REQUIRED'
      && error.details.reason === 'eligible_template_missing_establishment_variable'
  );
});

test('sendAppointmentEvent appends the institutional signature only once for clients', async () => {
  const createdLogs = [];
  const signature = getInstitutionalSignatureText();

  communicationRepository.findExistingWhatsAppMessageLog = async () => null;
  communicationRepository.findActiveMessageTemplate = async () => ({
    id: '55555555-5555-4555-8555-555555555556',
    nome: 'appointment_created_signed',
    conteudo: `Conteudo funcional.\n\n${signature}`,
    aprovado_provider: true,
    metadata: {
      provider_template_name: 'meta_appointment_created_signed',
      language: 'pt_BR'
    }
  });
  communicationRepository.createWhatsAppMessageLog = async (payload) => {
    const log = { id: '66666666-6666-4666-8666-666666666667', ...payload };
    createdLogs.push(log);
    return log;
  };
  communicationRepository.updateWhatsAppMessageLog = async (id, payload) => ({
    id,
    ...createdLogs[0],
    ...payload
  });
  whatsappProvider.shouldDryRun = () => true;
  whatsappProvider.sendOperationalMessage = async () => ({
    provider: whatsappProvider.PROVIDER_NAME,
    status: 'enviado',
    dry_run: true,
    provider_message_id: 'dry_signed'
  });

  await communicationService.sendAppointmentEvent('appointment.created', {
    tenantId: '22222222-2222-4222-8222-222222222222',
    payload: {
      appointment_id: '11111111-1111-4111-8111-111111111111',
      appointment: buildAppointment()
    }
  });

  assert.equal(createdLogs[0].conteudo.split(signature).length - 1, 1);
});

test('sendAppointmentEvent falls back to code template when tenant template is absent', async () => {
  let templateLookup = null;
  const createdLogs = [];

  communicationRepository.findExistingWhatsAppMessageLog = async () => null;
  communicationRepository.findActiveMessageTemplate = async (query) => {
    templateLookup = query;
    return null;
  };
  communicationRepository.createWhatsAppMessageLog = async (payload) => {
    const log = {
      id: '77777777-7777-4777-8777-777777777777',
      ...payload
    };
    createdLogs.push(log);
    return log;
  };
  communicationRepository.updateWhatsAppMessageLog = async (id, payload) => ({
    id,
    ...createdLogs[0],
    ...payload
  });
  whatsappProvider.shouldDryRun = () => true;
  whatsappProvider.sendOperationalMessage = async () => ({
    provider: whatsappProvider.PROVIDER_NAME,
    status: 'enviado',
    dry_run: true,
    provider_message_id: 'dry_fallback'
  });

  await communicationService.sendAppointmentEvent('appointment.created', {
    tenantId: '22222222-2222-4222-8222-222222222222',
    payload: {
      appointment_id: '11111111-1111-4111-8111-111111111111',
      appointment: buildAppointment()
    }
  });

  assert.deepEqual(templateLookup.names, ['appointment_created', 'appointment.created']);
  assert.equal(createdLogs[0].payload.template_source, 'code_fallback');
  assert.equal(createdLogs[0].payload.template_id, null);
  assert.equal(createdLogs[0].template_nome, 'appointment_created');
});

test('sendAppointmentEvent queues unapproved real send for processor validation', async () => {
  let providerCalled = false;
  const createdLogs = [];

  communicationRepository.findExistingWhatsAppMessageLog = async () => null;
  communicationRepository.findActiveMessageTemplate = async (query) => {
    assert.equal(query.requireProviderApproval, false);
    return {
      id: '55555555-5555-4555-8555-555555555559',
      nome: 'appointment_created',
      conteudo: 'Olá {{1}}, {{2}} recebeu sua solicitação de {{3}}.',
      variaveis: ['nome_cliente', 'nome_estabelecimento', 'nome_servico'],
      aprovado_provider: false,
      metadata: {
        provider_template_name: 'appointment_created',
        language: 'pt_BR'
      }
    };
  };
  communicationRepository.createWhatsAppMessageLog = async (payload) => {
    const log = {
      id: '99999999-9999-4999-8999-999999999999',
      ...payload
    };
    createdLogs.push(log);
    return log;
  };
  communicationRepository.updateWhatsAppMessageLog = async (id, payload) => ({
    id,
    ...createdLogs[0],
    ...payload
  });
  whatsappProvider.shouldDryRun = () => false;
  whatsappProvider.sendOperationalMessage = async () => {
    providerCalled = true;
    throw new Error('Provider should not be called.');
  };

  const [result] = await communicationService.sendAppointmentEvent('appointment.created', {
    tenantId: '22222222-2222-4222-8222-222222222222',
    payload: {
      appointment_id: '11111111-1111-4111-8111-111111111111',
      appointment: buildAppointment()
    }
  });

  assert.equal(providerCalled, false);
  assert.equal(result.status_envio, 'pendente');
  assert.equal(result.payload.template_source, 'templates_mensagem');
  assert.equal(result.payload.provider_approved, false);
});

test('processPendingWhatsAppMessages dispatches mensagens_whatsapp pending logs', async () => {
  let dispatchedMessage = null;
  communicationRepository.claimPendingWhatsAppMessages = async (limit) => {
    assert.equal(limit, 2);
    return [
      {
        id: '88888888-8888-4888-8888-888888888888',
        telefone_destino: '+5511888888888',
        conteudo: 'Mensagem pendente',
        template_nome: 'appointment_created',
        tipo_evento: 'appointment.created',
        agendamento_id: '11111111-1111-4111-8111-111111111111',
        tentativas: 1,
        payload: {
          recipient_type: 'client',
          params: {
            nome_cliente: 'Marcia Maria'
          },
          actions: [],
          provider_template_name: 'meta_appointment_created',
          language: 'pt_BR'
        }
      }
    ];
  };
  communicationRepository.updateWhatsAppMessageLog = async (id, payload) => ({
    id,
    ...payload
  });
  whatsappProvider.sendOperationalMessage = async (message) => {
    dispatchedMessage = message;
    return {
      provider: whatsappProvider.PROVIDER_NAME,
      status: 'enviado',
      dry_run: true,
      provider_message_id: `dry_${message.providerTemplateName}`
    };
  };

  const [result] = await communicationService.processPendingWhatsAppMessages({ limit: 2 });

  assert.equal(result.status_envio, 'enviado');
  assert.equal(result.provider_message_id, 'dry_meta_appointment_created');
  assert.ok(result.enviado_em);
  assert.equal(dispatchedMessage.text, [
    'Mensagem pendente',
    '',
    getInstitutionalSignatureText()
  ].join('\n'));
  assert.equal(result.conteudo, dispatchedMessage.text);
});

test('processPendingWhatsAppMessages retries transient provider errors with backoff', async () => {
  communicationRepository.claimPendingWhatsAppMessages = async () => [
    {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      telefone_destino: '+5511888888888',
      conteudo: 'Mensagem pendente',
      template_nome: 'appointment_created',
      tipo_evento: 'appointment.created',
      agendamento_id: '11111111-1111-4111-8111-111111111111',
      tentativas: 1,
      payload: {
        recipient_type: 'salon',
        params: {},
        actions: [],
        provider_template_name: 'meta_appointment_created',
        language: 'pt_BR',
        template_source: 'templates_mensagem',
        provider_approved: true
      }
    }
  ];
  communicationRepository.updateWhatsAppMessageLog = async (id, payload) => ({
    id,
    ...payload
  });
  whatsappProvider.shouldDryRun = () => false;
  whatsappProvider.sendOperationalMessage = async () => {
    const error = new Error('Too many requests');
    error.code = 429;
    throw error;
  };

  const [result] = await communicationService.processPendingWhatsAppMessages({ limit: 1 });

  assert.equal(result.status_envio, 'retry');
  assert.equal(result.ultimo_erro_codigo, 429);
  assert.ok(result.proxima_tentativa_em);
  assert.equal(result.payload.provider_error.retryable, true);
});
