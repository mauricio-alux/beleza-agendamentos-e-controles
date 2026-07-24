require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { realtime: { transport: ws } }
);

function extractToken(payload = {}) {
  const actionToken = payload.actions?.find((action) => action?.appointment_token)?.appointment_token;
  if (actionToken) return actionToken;

  const contextToken = payload.operational_context?.appointment_token;
  if (contextToken) return contextToken;

  const values = [
    payload.links?.confirmar,
    payload.links?.cancelar,
    payload.links?.reagendar,
    payload.params?.link_confirmar,
    payload.params?.link_cancelar,
    payload.params?.link_reagendar
  ].filter(Boolean);

  for (const value of values) {
    const match = String(value).match(/[?&]tk=([^&]+)/);
    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }
  }

  return null;
}

function buildConfirmedContent(params = {}) {
  return [
    `Ol\u00e1, ${params.nome_cliente || 'cliente'}!`,
    '',
    'Seu atendimento foi confirmado com sucesso.',
    '',
    `\u{1F4C5} Data: ${params.data_agendamento || 'data a confirmar'}`,
    '',
    `\u{1F552} Hor\u00e1rio: ${params.hora_agendamento || 'horario a confirmar'}`,
    '',
    `\u2702\uFE0F Servi\u00e7o: ${params.nome_servico || 'atendimento'}`,
    '',
    `\u{1F469}\u200D\u{1F4BC} Profissional: ${params.nome_profissional || 'profissional'}`,
    '',
    'Estamos aguardando voc\u00ea.',
    '',
    'Caso precise alterar seu atendimento, utilize uma das op\u00e7\u00f5es abaixo:',
    '',
    '[Reagendar]',
    '',
    '[Cancelar]'
  ].join('\n');
}

function buildActions(row, appointmentToken) {
  if (!appointmentToken) return [];

  const basePayload = {
    tenant_id: row.tenant_id || null,
    appointment_id: row.agendamento_id || null,
    appointment_token: appointmentToken
  };

  return [
    {
      id: 'reschedule',
      title: 'Reagendar',
      action_type: 'reschedule',
      appointment_token: appointmentToken,
      payload: basePayload,
      expires_at: null
    },
    {
      id: 'cancel',
      title: 'Cancelar',
      action_type: 'cancel',
      appointment_token: appointmentToken,
      payload: basePayload,
      expires_at: null
    }
  ];
}

function sanitizePayload(row) {
  const payload = row.payload || {};
  const params = {
    ...(payload.params || {}),
    link_confirmar: '',
    link_cancelar: '',
    link_reagendar: ''
  };
  const appointmentToken = extractToken(payload);
  const actions = buildActions(row, appointmentToken);

  return {
    ...payload,
    event_type: 'appointment.confirmed',
    params,
    links: {
      confirmar: null,
      cancelar: null,
      reagendar: null
    },
    actions,
    operational_context: appointmentToken ? {
      appointment_token: appointmentToken,
      action_ids: actions.map((action) => action.id)
    } : null,
    sanitized_confirmed_content_at: new Date().toISOString()
  };
}

async function main() {
  const { data, error } = await supabase
    .from('mensagens_whatsapp')
    .select('id, tenant_id, agendamento_id, tipo_evento, template_nome, conteudo, payload')
    .or('tipo_evento.eq.appointment.confirmed,template_nome.eq.appointment_confirmed,payload->>event_type.eq.appointment.confirmed');

  if (error) throw error;

  let updated = 0;

  for (const row of data || []) {
    const payload = sanitizePayload(row);
    const content = buildConfirmedContent(payload.params);

    const response = await supabase
      .from('mensagens_whatsapp')
      .update({
        tipo_evento: 'appointment.confirmed',
        conteudo: content,
        payload
      })
      .eq('id', row.id);

    if (response.error) throw response.error;
    updated += 1;
  }

  console.log(JSON.stringify({
    selected: data?.length || 0,
    updated
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
