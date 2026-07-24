require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { realtime: { transport: ws } }
);

function buildCreatedContent(params = {}) {
  return [
    `Ol\u00e1, ${params.nome_cliente || 'cliente'}!`,
    '',
    'Recebemos sua solicita\u00e7\u00e3o de atendimento.',
    '',
    `Servi\u00e7o: ${params.nome_servico || 'atendimento'}`,
    `Profissional: ${params.nome_profissional || 'profissional'}`,
    `Data: ${params.data_agendamento || 'data a confirmar'}`,
    `Hor\u00e1rio: ${params.hora_agendamento || 'horario a confirmar'}`,
    '',
    'Aguarde a confirma\u00e7\u00e3o do sal\u00e3o.'
  ].join('\n');
}

function sanitizePayload(row) {
  const payload = row.payload || {};
  const params = {
    ...(payload.params || {}),
    link_confirmar: '',
    link_cancelar: '',
    link_reagendar: ''
  };

  return {
    ...payload,
    event_type: 'appointment.created',
    params,
    links: {
      confirmar: null,
      cancelar: null,
      reagendar: null
    },
    actions: [],
    operational_context: null,
    sanitized_created_content_at: new Date().toISOString()
  };
}

async function main() {
  const { data, error } = await supabase
    .from('mensagens_whatsapp')
    .select('id, tipo_evento, template_nome, conteudo, payload')
    .or([
      'tipo_evento.eq.appointment.created',
      'template_nome.eq.appointment_created',
      'template_nome.eq.Appointment_created',
      'payload->>event_type.eq.appointment.created',
      'payload->>event_type.eq.Appointment_created',
      'payload->>event_type.eq.appointment_created'
    ].join(','));

  if (error) throw error;

  let updated = 0;

  for (const row of data || []) {
    const payload = sanitizePayload(row);
    const content = buildCreatedContent(payload.params);

    const response = await supabase
      .from('mensagens_whatsapp')
      .update({
        tipo_evento: 'appointment.created',
        template_nome: 'appointment_created',
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
