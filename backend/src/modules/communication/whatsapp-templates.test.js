const assert = require('node:assert/strict');
const test = require('node:test');

const { buildWhatsAppMessage } = require('./whatsapp-templates');

function buildAppointment(overrides = {}) {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    tenant_id: '22222222-2222-4222-8222-222222222222',
    token_confirmacao: 'apt_test_token',
    data_inicio: '2026-06-22T17:00:00.000Z',
    cliente: {
      nome: 'Marcia Maria'
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
        servico_id: '33333333-3333-4333-8333-333333333333',
        servico: {
          nome: 'Maquiagem'
        }
      }
    ],
    ...overrides
  };
}

test('appointment.created message only acknowledges the request without links or actions', () => {
  const message = buildWhatsAppMessage('appointment.created', buildAppointment(), 'client');

  assert.equal(message.event, 'appointment.created');
  assert.equal(message.template_name, 'appointment_created');
  assert.equal(message.text, [
    'Ol\u00e1, Marcia Maria!',
    '',
    'Recebemos sua solicita\u00e7\u00e3o de atendimento.',
    '',
    'Servi\u00e7o: Maquiagem',
    'Profissional: Rosely Cordeiro',
    'Data: 22/06/2026',
    'Hor\u00e1rio: 14:00',
    '',
    'Aguarde a confirma\u00e7\u00e3o do sal\u00e3o.'
  ].join('\n'));

  assert.doesNotMatch(message.text, /cancelar/i);
  assert.doesNotMatch(message.text, /reagendar/i);
  assert.doesNotMatch(message.text, /https?:\/\//i);
  assert.doesNotMatch(message.text, /cmd=/i);
  assert.doesNotMatch(message.text, /tk=/i);
  assert.doesNotMatch(message.text, /token=/i);
  assert.doesNotMatch(message.text, /127\.0\.0\.1/i);
  assert.doesNotMatch(message.text, /apt_test_token/i);

  assert.deepEqual(message.links, {
    confirmar: null,
    cancelar: null,
    reagendar: null
  });
  assert.equal(message.params.link_confirmar, '');
  assert.equal(message.params.link_cancelar, '');
  assert.equal(message.params.link_reagendar, '');
  assert.deepEqual(message.actions, []);
  assert.equal(message.operational_context, null);
});

test('appointment.confirmed message is clean and exposes only internal operational actions', () => {
  const message = buildWhatsAppMessage('appointment.confirmed', buildAppointment(), 'client');

  assert.equal(message.template_name, 'appointment_confirmed');
  assert.equal(message.text, [
    'Ol\u00e1, Marcia Maria!',
    '',
    'Seu atendimento foi confirmado com sucesso.',
    '',
    '\u{1F4C5} Data: 22/06/2026',
    '',
    '\u{1F552} Hor\u00e1rio: 14:00',
    '',
    '\u2702\uFE0F Servi\u00e7o: Maquiagem',
    '',
    '\u{1F469}\u200D\u{1F4BC} Profissional: Rosely Cordeiro',
    '',
    'Estamos aguardando voc\u00ea.',
    '',
    'Caso precise alterar seu atendimento, utilize uma das op\u00e7\u00f5es abaixo:',
    '',
    '[Reagendar]',
    '',
    '[Cancelar]'
  ].join('\n'));

  assert.doesNotMatch(message.text, /confirmar/i);
  assert.doesNotMatch(message.text, /presenca/i);
  assert.doesNotMatch(message.text, /presen\u00e7a/i);
  assert.doesNotMatch(message.text, /https?:\/\//i);
  assert.doesNotMatch(message.text, /cmd=/i);
  assert.doesNotMatch(message.text, /tk=/i);
  assert.doesNotMatch(message.text, /token=/i);
  assert.doesNotMatch(message.text, /127\.0\.0\.1/i);
  assert.doesNotMatch(message.text, /apt_test_token/i);

  assert.deepEqual(message.links, {
    confirmar: null,
    cancelar: null,
    reagendar: null
  });
  assert.equal(message.params.link_confirmar, '');
  assert.equal(message.params.link_cancelar, '');
  assert.equal(message.params.link_reagendar, '');

  assert.deepEqual(message.actions.map((action) => action.id), ['reschedule', 'cancel']);
  assert.equal(message.actions[0].appointment_token, 'apt_test_token');
  assert.equal(message.actions[1].appointment_token, 'apt_test_token');
  assert.equal(message.operational_context.appointment_token, 'apt_test_token');
});

test('appointment.pending_client still keeps explicit client confirmation flow', () => {
  const message = buildWhatsAppMessage('appointment.pending_client', buildAppointment(), 'client');

  assert.match(message.text, /Para confirmar sua presenca/);
  assert.ok(message.links.confirmar);
  assert.ok(message.links.cancelar);
  assert.ok(message.links.reagendar);
});

test('appointment.pending_attendant renders operational salon alert', () => {
  const message = buildWhatsAppMessage('appointment.pending_attendant', buildAppointment(), 'salon');

  assert.equal(message.template_name, 'appointment_pending_attendant_operational');
  assert.match(message.text, /agendamento aguardando sua confirmacao/);
  assert.match(message.text, /Cliente: Marcia Maria/);
  assert.match(message.text, /Servico: Maquiagem/);
  assert.match(message.text, /\[Confirmar\]/);
  assert.match(message.text, /\[Abrir Agenda\]/);
  assert.doesNotMatch(message.text, /https?:\/\//i);
  assert.doesNotMatch(message.text, /cmd=/i);
  assert.doesNotMatch(message.text, /tk=/i);
  assert.doesNotMatch(message.text, /token=/i);
  assert.doesNotMatch(message.text, /apt_test_token/i);
  assert.deepEqual(message.links, {
    confirmar: null,
    cancelar: null,
    reagendar: null
  });
  assert.deepEqual(message.actions.map((action) => action.id), ['confirm', 'open_agenda']);
  assert.equal(message.actions[0].action_type, 'appointment.confirm');
  assert.equal(message.actions[1].action_type, 'open_agenda');
  assert.equal(message.actions[0].appointment_token, 'apt_test_token');
  assert.equal(message.actions[1].appointment_token, 'apt_test_token');
  assert.equal(message.operational_context.appointment_token, 'apt_test_token');
});

test('appointment.no_show renders respectful client message with schedule again action only in payload', () => {
  const message = buildWhatsAppMessage('appointment.no_show', buildAppointment(), 'client');

  assert.equal(message.template_name, 'appointment_no_show_client');
  assert.equal(message.text, [
    'Ol\u00e1, Marcia Maria.',
    '',
    'Identificamos que voc\u00ea n\u00e3o compareceu ao atendimento agendado.',
    '',
    'Servi\u00e7o: Maquiagem',
    'Data: 22/06/2026',
    'Hor\u00e1rio: 14:00',
    '',
    'Se desejar, voc\u00ea pode fazer um novo agendamento.',
    '',
    '[Agendar Novamente]'
  ].join('\n'));
  assert.doesNotMatch(message.text, /https?:\/\//i);
  assert.doesNotMatch(message.text, /cmd=/i);
  assert.doesNotMatch(message.text, /tk=/i);
  assert.doesNotMatch(message.text, /token=/i);
  assert.doesNotMatch(message.text, /link_confirmar/i);
  assert.doesNotMatch(message.text, /link_cancelar/i);
  assert.doesNotMatch(message.text, /link_reagendar/i);
  assert.deepEqual(message.links, {
    confirmar: null,
    cancelar: null,
    reagendar: null
  });
  assert.deepEqual(message.actions.map((action) => action.id), ['schedule_again']);
  assert.equal(message.actions[0].action_type, 'schedule_again');
  assert.equal(message.actions[0].payload.target, '/agendar/bella-rosa-studio');
  assert.equal(message.operational_context.appointment_token, null);
});

test('appointment.cancelled by attendant renders reason and schedule again action', () => {
  const message = buildWhatsAppMessage('appointment.cancelled', buildAppointment(), 'client', {
    metadata: {
      motivo: 'Profissional indisponivel.'
    }
  });

  assert.equal(message.template_name, 'appointment_cancelled_by_attendant');
  assert.match(message.text, /Seu atendimento foi cancelado pelo seguinte motivo:/);
  assert.match(message.text, /Profissional indisponivel\./);
  assert.doesNotMatch(message.text, /https?:\/\//i);
  assert.doesNotMatch(message.text, /cmd=/i);
  assert.doesNotMatch(message.text, /tk=/i);
  assert.doesNotMatch(message.text, /token=/i);
  assert.deepEqual(message.actions.map((action) => action.id), ['schedule_again']);
  assert.equal(message.actions[0].payload.target, '/agendar/bella-rosa-studio');
});

test('appointment.cancelled by client uses separated client template', () => {
  const message = buildWhatsAppMessage('appointment.cancelled', buildAppointment(), 'client', {
    metadata: {
      origem_status: 'link_operacional'
    }
  });

  assert.equal(message.template_name, 'appointment_cancelled_by_client');
  assert.match(message.text, /Seu atendimento foi cancelado conforme solicitado\./);
  assert.doesNotMatch(message.text, /seguinte motivo/);
  assert.deepEqual(message.actions.map((action) => action.id), ['schedule_again']);
});
