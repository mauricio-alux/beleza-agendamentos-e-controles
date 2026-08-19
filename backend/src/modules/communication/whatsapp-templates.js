const { buildOperationalLinks } = require('../agenda/domain/appointment-operational-token');

const ESTABLISHMENT_REQUIRED_TEMPLATES = new Set([
  'appointment_created',
  'appointment_pending_client',
  'appointment_confirmed',
  'appointment_rescheduled',
  'appointment_cancelled_by_attendant',
  'appointment_cancelled_by_client',
  'appointment_reminder_24h',
  'appointment_reminder_2h',
  'appointment_no_show_client',
  'appointment_completed',
  'appointment_cancelled_salon',
  'appointment_rescheduled_salon',
  'appointment_pending_attendant_reminder_2h'
]);

function resolveEstablishmentName(appointment = {}, templateName = '') {
  const name = appointment.tenant?.nome_fantasia || appointment.tenant?.nome || '';
  if (String(name).trim()) return String(name).trim();

  if (ESTABLISHMENT_REQUIRED_TEMPLATES.has(templateName)) {
    const error = new Error('Nome do estabelecimento nao resolvido para mensagem WhatsApp.');
    error.code = 'WHATSAPP_ESTABLISHMENT_NAME_REQUIRED';
    error.details = {
      template_name: templateName,
      tenant_id: appointment.tenant_id || null,
      appointment_id: appointment.id || null
    };
    throw error;
  }

  return '';
}

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
  const link = appointment?.servicos?.[0] || null;
  return link
    ? {
        ...link,
        nome: link.nome_servico || link.servico_tenant?.servico_catalogo?.nome || null
      }
    : null;
}

function buildParams(appointment = {}, templateName = '') {
  const service = getPrimaryService(appointment);
  const dateParts = formatDateParts(appointment.data_inicio);
  const links = appointment.token_confirmacao
    ? buildOperationalLinks(appointment.token_confirmacao)
    : {};
  const establishmentName = resolveEstablishmentName(appointment, templateName);

  return {
    nome_cliente: appointment.cliente?.nome || 'cliente',
    nome_estabelecimento: establishmentName,
    nome_salao: establishmentName,
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

  const links = buildOperationalLinks(appointment.token_confirmacao);
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
        url: links.confirmar,
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

  if (!appointment.token_confirmacao) {
    return [];
  }

  return [
    {
      id: 'reschedule',
      title: 'Reagendar',
      action_type: 'reschedule',
      appointment_token: appointment.token_confirmacao,
      url: links.reagendar,
      route: '/reagendar',
      payload: basePayload,
      expires_at: appointment.data_inicio || null
    },
    {
      id: 'cancel',
      title: 'Cancelar',
      action_type: 'cancel',
      appointment_token: appointment.token_confirmacao,
      url: links.cancelar,
      route: '/acao_agendamento',
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
      'Recebemos sua solicita\u00e7\u00e3o de atendimento em {{nome_estabelecimento}}.',
      '',
      'Servi\u00e7o: {{nome_servico}}',
      'Profissional: {{nome_profissional}}',
      'Data: {{data_agendamento}}',
      'Hor\u00e1rio: {{hora_agendamento}}',
      '',
      'Aguarde a confirma\u00e7\u00e3o do estabelecimento.'
    ].join('\n')
  },
  'appointment.pending_client': {
    name: 'appointment_pending_client',
    body: [
      'Ol\u00e1, {{nome_cliente}}! {{nome_estabelecimento}} recebeu sua solicita\u00e7\u00e3o de atendimento.',
      'Servi\u00e7o: {{nome_servico}}',
      'Profissional: {{nome_profissional}}',
      'Data: {{data_agendamento}}',
      'Hor\u00e1rio: {{hora_agendamento}}',
      'Para confirmar sua presen\u00e7a, acesse: {{link_confirmar}}',
      'Caso necess\u00e1rio:',
      'Cancelar: {{link_cancelar}}',
      'Reagendar: {{link_reagendar}}'
    ].join('\n')
  },
  'appointment.confirmed': {
    name: 'appointment_confirmed',
    body: [
      'Ol\u00e1, {{nome_cliente}}!',
      '',
      '{{nome_estabelecimento}} confirmou seu atendimento.',
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
      'Caso precise alterar seu atendimento, utilize uma das op\u00e7\u00f5es abaixo.'
    ].join('\n')
  },
  'appointment.rescheduled': {
    name: 'appointment_rescheduled',
    body: [
      '{{nome_estabelecimento}} reagendou seu atendimento.',
      'Servi\u00e7o: {{nome_servico}}',
      'Nova data: {{data_agendamento}}',
      'Novo hor\u00e1rio: {{hora_agendamento}}'
    ].join('\n')
  },
  'appointment.cancelled': {
    name: 'appointment_cancelled_by_attendant',
    body: [
      'Ol\u00e1, {{nome_cliente}}.',
      '',
      '{{nome_estabelecimento}} cancelou seu atendimento pelo seguinte motivo:',
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
      'Voc\u00ea possui atendimento amanh\u00e3 em {{nome_estabelecimento}}.',
      'Servi\u00e7o: {{nome_servico}}',
      'Profissional: {{nome_profissional}}',
      'Hor\u00e1rio: {{hora_agendamento}}'
    ].join('\n')
  },
  'appointment.reminder_2h': {
    name: 'appointment_reminder_2h',
    body: 'Seu atendimento de {{nome_servico}} em {{nome_estabelecimento}} ocorrer\u00e1 em aproximadamente 2 horas, \u00e0s {{hora_agendamento}}.'
  },
  'appointment.no_show': {
    name: 'appointment_no_show_client',
    body: [
      'Ol\u00e1, {{nome_cliente}}.',
      '',
      'Identificamos que voc\u00ea n\u00e3o compareceu ao atendimento agendado em {{nome_estabelecimento}}.',
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
    body: 'Obrigado por realizar seu atendimento em {{nome_estabelecimento}}. Esperamos v\u00ea-lo novamente em breve.'
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
      'Faltam aproximadamente 2 horas para um atendimento em {{nome_estabelecimento}} ainda sem confirma\u00e7\u00e3o operacional.',
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
    body: '{{nome_cliente}} cancelou o atendimento de {{nome_servico}} em {{nome_estabelecimento}} em {{data_agendamento}} \u00e0s {{hora_agendamento}}.'
  },
  'appointment.rescheduled': {
    name: 'appointment_rescheduled_salon',
    body: '{{nome_cliente}} reagendou o atendimento de {{nome_servico}} em {{nome_estabelecimento}} para {{data_agendamento}} \u00e0s {{hora_agendamento}}.'
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
        'Seu atendimento em {{nome_estabelecimento}} foi cancelado conforme solicitado.',
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
    ...buildParams(appointment, template.name),
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
