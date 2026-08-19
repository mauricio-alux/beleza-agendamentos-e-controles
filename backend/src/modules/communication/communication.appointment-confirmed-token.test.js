const assert = require('node:assert/strict');
const test = require('node:test');

const communicationRepository = require('./communication.repository');
const whatsappProvider = require('./providers/whatsapp-mysaas.provider');
const communicationService = require('./communication.service');

const originalRepository = { ...communicationRepository };
const originalProvider = { ...whatsappProvider };

function restoreMocks() {
  Object.assign(communicationRepository, originalRepository);
  Object.assign(whatsappProvider, originalProvider);
}

function buildAppointment(overrides = {}) {
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
        nome_servico: 'Maquiagem'
      }
    ],
    ...overrides
  };
}

test.afterEach(restoreMocks);

test('appointment_confirmed refuses provider url buttons without token_confirmacao', async () => {
  communicationRepository.findExistingWhatsAppMessageLog = async () => null;
  communicationRepository.findActiveMessageTemplate = async () => ({
    id: '55555555-5555-4555-8555-555555555560',
    nome: 'appointment_confirmed',
    conteudo: 'Ola, {{1}}! Seu atendimento foi confirmado em {{2}}.',
    variaveis: [
      'nome_cliente',
      'nome_estabelecimento',
      'nome_servico',
      'nome_profissional',
      'data_agendamento',
      'hora_agendamento'
    ],
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
  whatsappProvider.shouldDryRun = () => true;

  await assert.rejects(
    () => communicationService.sendAppointmentEvent('appointment.confirmed', {
      tenantId: '22222222-2222-4222-8222-222222222222',
      payload: {
        appointment_id: '11111111-1111-4111-8111-111111111111',
        appointment: buildAppointment({ token_confirmacao: null })
      }
    }),
    (error) => error.code === 'APPOINTMENT_OPERATIONAL_TOKEN_MISSING'
  );
});

test('appointment_confirmed refuses code fallback when provider template is absent', async () => {
  communicationRepository.findExistingWhatsAppMessageLog = async () => null;
  communicationRepository.findActiveMessageTemplate = async () => null;
  whatsappProvider.shouldDryRun = () => true;

  await assert.rejects(
    () => communicationService.sendAppointmentEvent('appointment.confirmed', {
      tenantId: '22222222-2222-4222-8222-222222222222',
      payload: {
        appointment_id: '11111111-1111-4111-8111-111111111111',
        appointment: buildAppointment()
      }
    }),
    (error) => error.code === 'APPOINTMENT_CONFIRMED_TEMPLATE_ACTIONS_REQUIRED'
  );
});
