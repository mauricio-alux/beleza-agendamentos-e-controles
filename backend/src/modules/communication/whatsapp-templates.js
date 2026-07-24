const { buildOperationalLinks } = require('../agenda/domain/appointment-operational-token');

function formatDateParts(value) {
  const date = value ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) {
    return {
      data_agendamento: 'data a confirmar',
      hora_agendamento: 'horario a confirmar'
    };
  }

  return {
    data_agendamento: date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
    hora_agendamento: date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    })
  };
}

function getPrimaryService(appointment) {
  return appointment?.servicos?.[0]?.servico || appointment?.servicos?.[0] || null;
}

function buildParams(appointment = {}) {
  const service = getPrimaryService(appointment);
  const dateParts = formatDateParts(appointment.data_inicio);
  const links = appointment.token_confirmacao
    ? buildOperationalLinks(appointment.token_confirmacao)
    : {};

  return {
    nome_cliente: appointment.cliente?.nome || 'cliente',
    nome_salao: appointment.tenant?.nome_fantasia || 'salao',
    nome_profissional: appointment.profissional?.nome_publico || appointment.profissional?.nome || 'profissional',
    nome_servico: service?.nome || service?.nome_servico || 'atendimento',
    data_agendamento: dateParts.data_agendamento,
    hora_agendamento: dateParts.hora_agendamento,
    link_cancelar: links.cancelar || '',
    link_reagendar: links.reagendar || '',
    link_confirmar: links.confirmar || ''
  };
}

function buildScheduleAgainAction(appointment = {}) {
  const tenantSlug = appointment.tenant?.slug || appointment.tenant_slug || '';

  return {
    id: 'schedule_again',
    title: 'Agendar Novamente',
    action_type: 'schedule_again',
    payload: {
      tenant_id: appointment.tenant_id || null,
      cliente_id: appointment.cliente_id || null,
      target: tenantSlug ? `/agendar/${tenantSlug}` : '/agendar'
    }
  };
}

function buildOperationalActions(eventType, appointment = {}) {
  if ([
    'appointment.no_show',
    'appointment.cancelled'
  ].includes(eventType)) {
    return [buildScheduleAgainAction(appointment)];
  }

  if (!appointment.token_confirmacao) {
    return [];
  }

  const basePayload = {
    tenant_id: appointment.tenant_id || null,
    appointment_id: appointment.id || null,
    appointment_token: appointment.token_confirmacao
  };

  if ([
    'appointment.pending_attendant',
    'appointment.pending_attendant_reminder_30m',
    'appointment.pending_attendant_reminder_60m',
    'appointment.pending_attendant_reminder_2h'
  ].includes(eventType)) {
    return [
      {
        id: 'confirm',
        title: 'Confirmar',
        action_type: 'appointment.confirm',
        appointment_token: appointment.token_confirmacao,
        payload: basePayload,
        expires_at: appointment.data_inicio || null
      },
      {
        id: 'open_agenda',
        title: 'Abrir Agenda',
        action_type: 'open_agenda',
        appointment_token: appointment.token_confirmacao,
        payload: {
          ...basePayload,
          route: `/agenda/${appointment.id || ''}`
        },
        expires_at: appointment.data_inicio || null
      }
    ];
  }

  if (eventType !== 'appointment.confirmed') {
    return [];
  }

  return [
    {
      id: 'reschedule',
      title: 'Reagendar',
      action_type: 'reschedule',
      appointment_token: appointment.token_confirmacao,
      payload: basePayload,
      expires_at: appointment.data_inicio || null
    },
    {
      id: 'cancel',
      title: 'Cancelar',
      action_type: 'cancel',
      appointment_token: appointment.token_confirmacao,
      payload: basePayload,
      expires_at: appointment.data_inicio || null
    }
  ];
}

function buildMessageLinks(eventType, params) {
  if ([
    'appointment.confirmed',
    'appointment.created',
    'appointment.pending_attendant',
    'appointment.pending_attendant_reminder_30m',
    'appointment.pending_attendant_reminder_60m',
    'appointment.pending_attendant_reminder_2h'
  ].includes(eventType)) {
    return {
      confirmar: null,
      cancelar: null,
      reagendar: null
    };
  }

  return {
    confirmar: params.link_confirmar || null,
    cancelar: params.link_cancelar || null,
    reagendar: params.link_reagendar || null
  };
}

function sanitizeParamsForEvent(eventType, params) {
  if (![
    'appointment.confirmed',
    'appointment.created',
    'appointment.cancelled',
    'appointment.no_show',
    'appointment.pending_attendant',
    'appointment.pending_attendant_reminder_30m',
    'appointment.pending_attendant_reminder_60m',
    'appointment.pending_attendant_reminder_2h'
  ].includes(eventType)) {
    return params;
  }

  return {
    ...params,
    link_confirmar: '',
    link_cancelar: '',
    link_reagendar: ''
  };
}

function isClientInitiated(payload = {}) {
  return payload?.metadata?.origem_status === 'link_operacional'
    || payload?.origem_status === 'link_operacional';
}

function getCancellationReason(payload = {}, appointment = {}) {
  return payload?.metadata?.motivo
    || payload?.metadata?.motivo_cancelamento
    || payload?.motivo
    || appointment?.metadata?.motivo_cancelamento
    || appointment?.metadata?.motivo
    || 'Motivo nao informado.';
}

function render(template, params) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => params[key] ?? '');
}

const CLIENT_TEMPLATES = {
  'appointment.created': {
    name: 'appointment_created',
    body: [
      'Ol\u00e1, {{nome_cliente}}!',
      '',
      'Recebemos sua solicita\u00e7\u00e3o de atendimento.',
      '',
      'Servi\u00e7o: {{nome_servico}}',
      'Profissional: {{nome_profissional}}',
      'Data: {{data_agendamento}}',
      'Hor\u00e1rio: {{hora_agendamento}}',
      '',
      'Aguarde a confirma\u00e7\u00e3o do sal\u00e3o.'
    ].join('\n')
  },
  'appointment.pending_client': {
    name: 'appointment_pending_client',
    body: [
      'Ola {{nome_cliente}}! O salao recebeu sua solicitacao de atendimento.',
      'Servico: {{nome_servico}}',
      'Profissional: {{nome_profissional}}',
      'Data: {{data_agendamento}}',
      'Horario: {{hora_agendamento}}',
      'Para confirmar sua presenca, acesse: {{link_confirmar}}',
      'Caso necessario:',
      'Cancelar: {{link_cancelar}}',
      'Reagendar: {{link_reagendar}}'
    ].join('\n')
  },
  'appointment.confirmed': {
    name: 'appointment_confirmed',
    body: [
      'Ol\u00e1, {{nome_cliente}}!',
      '',
      'Seu atendimento foi confirmado com sucesso.',
      '',
      '\u{1F4C5} Data: {{data_agendamento}}',
      '',
      '\u{1F552} Hor\u00e1rio: {{hora_agendamento}}',
      '',
      '\u2702\uFE0F Servi\u00e7o: {{nome_servico}}',
      '',
      '\u{1F469}\u200D\u{1F4BC} Profissional: {{nome_profissional}}',
      '',
      'Estamos aguardando voc\u00ea.',
      '',
      'Caso precise alterar seu atendimento, utilize uma das op\u00e7\u00f5es abaixo:',
      '',
      '[Reagendar]',
      '',
      '[Cancelar]'
    ].join('\n')
  },
  'appointment.rescheduled': {
    name: 'appointment_rescheduled',
    body: [
      'Seu atendimento foi reagendado.',
      'Servico: {{nome_servico}}',
      'Nova data: {{data_agendamento}}',
      'Novo horario: {{hora_agendamento}}'
    ].join('\n')
  },
  'appointment.cancelled': {
    name: 'appointment_cancelled_by_attendant',
    body: [
      'Ol\u00e1, {{nome_cliente}}.',
      '',
      'Seu atendimento foi cancelado pelo seguinte motivo:',
      '',
      '{{motivo_cancelamento}}',
      '',
      'Servi\u00e7o: {{nome_servico}}',
      'Data: {{data_agendamento}}',
      'Hor\u00e1rio: {{hora_agendamento}}',
      '',
      'Se desejar, voc\u00ea pode fazer um novo agendamento.',
      '',
      '[Agendar Novamente]'
    ].join('\n')
  },
  'appointment.reminder_24h': {
    name: 'appointment_reminder_24h',
    body: [
      'Voce possui atendimento amanha.',
      'Servico: {{nome_servico}}',
      'Profissional: {{nome_profissional}}',
      'Horario: {{hora_agendamento}}'
    ].join('\n')
  },
  'appointment.reminder_2h': {
    name: 'appointment_reminder_2h',
    body: 'Seu atendimento de {{nome_servico}} ocorrera em aproximadamente 2 horas, as {{hora_agendamento}}.'
  },
  'appointment.no_show': {
    name: 'appointment_no_show_client',
    body: [
      'Ol\u00e1, {{nome_cliente}}.',
      '',
      'Identificamos que voc\u00ea n\u00e3o compareceu ao atendimento agendado.',
      '',
      'Servi\u00e7o: {{nome_servico}}',
      'Data: {{data_agendamento}}',
      'Hor\u00e1rio: {{hora_agendamento}}',
      '',
      'Se desejar, voc\u00ea pode fazer um novo agendamento.',
      '',
      '[Agendar Novamente]'
    ].join('\n')
  },
  'appointment.completed': {
    name: 'appointment_completed',
    body: 'Obrigado por utilizar os servicos de {{nome_salao}}. Esperamos ve-lo novamente em breve.'
  }
};

const SALON_TEMPLATES = {
  'appointment.pending_attendant': {
    name: 'appointment_pending_attendant_operational',
    body: [
      'Atencao!',
      '',
      'Existe um agendamento aguardando sua confirmacao.',
      '',
      'Cliente: {{nome_cliente}}',
      'Servico: {{nome_servico}}',
      'Data: {{data_agendamento}}',
      'Horario: {{hora_agendamento}}',
      '',
      '[Confirmar]',
      '',
      '[Abrir Agenda]'
    ].join('\n')
  },
  'appointment.pending_attendant_reminder_30m': {
    name: 'appointment_pending_attendant_reminder_30m',
    body: [
      'Atencao!',
      '',
      'Este agendamento continua aguardando confirmacao ha 30 minutos.',
      '',
      'Cliente: {{nome_cliente}}',
      'Servico: {{nome_servico}}',
      'Data: {{data_agendamento}}',
      'Horario: {{hora_agendamento}}',
      '',
      '[Confirmar]',
      '',
      '[Abrir Agenda]'
    ].join('\n')
  },
  'appointment.pending_attendant_reminder_60m': {
    name: 'appointment_pending_attendant_reminder_60m',
    body: [
      'Atencao!',
      '',
      'Este agendamento continua aguardando confirmacao ha 60 minutos.',
      '',
      'Cliente: {{nome_cliente}}',
      'Servico: {{nome_servico}}',
      'Data: {{data_agendamento}}',
      'Horario: {{hora_agendamento}}',
      '',
      '[Confirmar]',
      '',
      '[Abrir Agenda]'
    ].join('\n')
  },
  'appointment.pending_attendant_reminder_2h': {
    name: 'appointment_pending_attendant_reminder_2h',
    body: [
      'Prioridade alta!',
      '',
      'Faltam aproximadamente 2 horas para um atendimento ainda sem confirmacao operacional.',
      '',
      'Cliente: {{nome_cliente}}',
      'Servico: {{nome_servico}}',
      'Data: {{data_agendamento}}',
      'Horario: {{hora_agendamento}}',
      '',
      '[Confirmar]',
      '',
      '[Abrir Agenda]'
    ].join('\n')
  },
  'appointment.cancelled': {
    name: 'appointment_cancelled_salon',
    body: '{{nome_cliente}} cancelou o atendimento de {{nome_servico}} em {{data_agendamento}} as {{hora_agendamento}}.'
  },
  'appointment.rescheduled': {
    name: 'appointment_rescheduled_salon',
    body: '{{nome_cliente}} reagendou o atendimento de {{nome_servico}} para {{data_agendamento}} as {{hora_agendamento}}.'
  },
  'appointment.no_show': {
    name: 'appointment_no_show_salon',
    body: 'No-show registrado: {{nome_cliente}} nao compareceu ao atendimento de {{nome_servico}} em {{data_agendamento}} as {{hora_agendamento}}.'
  }
};

function buildWhatsAppMessage(eventType, appointment, recipientType = 'client', eventPayload = {}) {
  const catalog = recipientType === 'salon' ? SALON_TEMPLATES : CLIENT_TEMPLATES;
  let template = catalog[eventType];
  if (!template) return null;

  if (recipientType === 'client' && eventType === 'appointment.cancelled' && isClientInitiated(eventPayload)) {
    template = {
      name: 'appointment_cancelled_by_client',
      body: [
        'Ol\u00e1, {{nome_cliente}}.',
        '',
        'Seu atendimento foi cancelado conforme solicitado.',
        '',
        'Servi\u00e7o: {{nome_servico}}',
        'Data: {{data_agendamento}}',
        'Hor\u00e1rio: {{hora_agendamento}}',
        '',
        'Se desejar, voc\u00ea pode fazer um novo agendamento.',
        '',
        '[Agendar Novamente]'
      ].join('\n')
    };
  }

  const params = sanitizeParamsForEvent(eventType, {
    ...buildParams(appointment),
    motivo_cancelamento: getCancellationReason(eventPayload, appointment)
  });
  const actions = buildOperationalActions(eventType, appointment);

  return {
    channel: 'whatsapp',
    event: eventType,
    recipient_type: recipientType,
    template_name: template.name,
    template: template.body,
    params,
    text: render(template.body, params),
    links: buildMessageLinks(eventType, params),
    actions,
    operational_context: actions.length ? {
      appointment_token: actions.some((action) => action.appointment_token) ? appointment.token_confirmacao : null,
      action_ids: actions.map((action) => action.id)
    } : null,
    integration_ready: true
  };
}

module.exports = {
  CLIENT_TEMPLATES,
  SALON_TEMPLATES,
  buildWhatsAppMessage
};
