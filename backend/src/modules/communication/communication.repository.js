const { supabaseAdmin } = require('../../config/supabase');

const APPOINTMENT_COMMUNICATION_SELECT = `
  *,
  tenant:tenants(id, slug, nome_fantasia, telefone),
  cliente:clientes(*),
  profissional:profissionais(*, usuario:usuarios(*)),
  servicos:agendamento_servicos(*, servico_tenant:servico_tenants(id, servico_catalogo_id, servico_catalogo:servicos_catalogo(id, nome, codigo_canonico, categoria_key, natureza)))
`;

const APPOINTMENT_COMMUNICATION_SELECT_WITHOUT_USER = `
  *,
  tenant:tenants(id, slug, nome_fantasia, telefone),
  cliente:clientes(*),
  profissional:profissionais(*),
  servicos:agendamento_servicos(*, servico_tenant:servico_tenants(id, servico_catalogo_id, servico_catalogo:servicos_catalogo(id, nome, codigo_canonico, categoria_key, natureza)))
`;

function isMissingColumnError(error) {
  return ['42703', 'PGRST204', 'PGRST205'].includes(error?.code);
}

function isMissingEmbeddedRelation(error) {
  return ['PGRST200', 'PGRST201', 'PGRST204', 'PGRST205'].includes(error?.code);
}

function stripExtendedMessageColumns(payload) {
  const {
    profissional_id,
    tipo_evento,
    provider,
    idempotency_key,
    agendado_para,
    processado_em,
    tentativas,
    proxima_tentativa_em,
    ultimo_erro_codigo,
    ultimo_erro_mensagem,
    payload_provider,
    ...fallbackPayload
  } = payload;

  return {
    ...fallbackPayload,
    payload: {
      ...(payload.payload || {}),
      profissional_id: profissional_id || null,
      tipo_evento: tipo_evento || null,
      provider: provider || null,
      idempotency_key: idempotency_key || null,
      agendado_para: agendado_para || null,
      processado_em: processado_em || null,
      tentativas: tentativas || null,
      proxima_tentativa_em: proxima_tentativa_em || null,
      ultimo_erro_codigo: ultimo_erro_codigo || null,
      ultimo_erro_mensagem: ultimo_erro_mensagem || null,
      payload_provider: payload_provider || null
    }
  };
}

async function findAppointmentForCommunication(tenantId, appointmentId) {
  let query = supabaseAdmin
    .from('agendamentos')
    .select(APPOINTMENT_COMMUNICATION_SELECT)
    .eq('id', appointmentId)
    .is('deleted_at', null);

  if (tenantId) query = query.eq('tenant_id', tenantId);

  const { data, error } = await query.maybeSingle();
  if (isMissingEmbeddedRelation(error)) {
    console.warn('[whatsapp-operational-debug] appointment communication query fallback without usuario embed', {
      tenantId,
      appointmentId,
      code: error.code,
      message: error.message
    });

    let fallbackQuery = supabaseAdmin
      .from('agendamentos')
      .select(APPOINTMENT_COMMUNICATION_SELECT_WITHOUT_USER)
      .eq('id', appointmentId)
      .is('deleted_at', null);

    if (tenantId) fallbackQuery = fallbackQuery.eq('tenant_id', tenantId);

    const fallback = await fallbackQuery.maybeSingle();
    if (fallback.error) throw fallback.error;
    return fallback.data;
  }

  if (error) throw error;
  return data;
}

async function findOperationalRecipientForAppointment(appointment = {}) {
  if (!appointment.tenant_id) {
    return null;
  }

  if (appointment.profissional_id) {
    const { data, error } = await supabaseAdmin
      .from('tenant_memberships')
      .select('id, role, usuario:usuarios(id, nome, telefone)')
      .eq('tenant_id', appointment.tenant_id)
      .eq('profissional_id', appointment.profissional_id)
      .eq('status', 'ativo')
      .order('is_primary', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && !isMissingEmbeddedRelation(error)) throw error;
    if (data?.usuario?.telefone) {
      return {
        source: 'profissional_membership',
        membership_id: data.id,
        usuario_id: data.usuario.id,
        nome: data.usuario.nome,
        telefone: data.usuario.telefone
      };
    }
  }

  let { data, error } = await supabaseAdmin
    .from('tenant_memberships')
    .select('id, role, is_owner, vinculo_tipo, usuario:usuarios(id, nome, telefone)')
    .eq('tenant_id', appointment.tenant_id)
    .eq('status', 'ativo')
    .in('role', ['Administrador', 'Autonomo'])
    .order('is_owner', { ascending: false })
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true });

  if (isMissingColumnError(error)) {
    const fallback = await supabaseAdmin
      .from('tenant_memberships')
      .select('id, role, usuario:usuarios(id, nome, telefone)')
      .eq('tenant_id', appointment.tenant_id)
      .eq('status', 'ativo')
      .in('role', ['Administrador', 'Autonomo'])
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });

    data = fallback.data;
    error = fallback.error;
  }

  if (error && !isMissingEmbeddedRelation(error)) throw error;

  const memberships = data || [];
  const admin = memberships.find((item) => item.role === 'Administrador' && item.usuario?.telefone);
  const ownerAutonomo = memberships.find((item) => (
    item.role === 'Autonomo'
    && (item.is_owner === true || item.vinculo_tipo === 'owner')
    && item.usuario?.telefone
  ));
  const anyAutonomo = memberships.find((item) => item.role === 'Autonomo' && item.usuario?.telefone);
  const chosen = admin || ownerAutonomo || anyAutonomo;

  if (!chosen?.usuario?.telefone) {
    return null;
  }

  return {
    source: chosen.role === 'Administrador' ? 'tenant_admin' : 'autonomo_owner',
    membership_id: chosen.id,
    usuario_id: chosen.usuario.id,
    nome: chosen.usuario.nome,
    telefone: chosen.usuario.telefone
  };
}

async function findWhatsAppMessageByIdempotencyKey(idempotencyKey) {
  if (!idempotencyKey) return null;

  const { data, error } = await supabaseAdmin
    .from('mensagens_whatsapp')
    .select('*')
    .eq('idempotency_key', idempotencyKey)
    .is('deleted_at', null)
    .limit(1);

  if (isMissingColumnError(error)) return null;
  if (error) throw error;
  return data?.[0] || null;
}

async function findExistingWhatsAppMessageLog({ tenantId, appointmentId, eventType, recipientType, idempotencyKey = null }) {
  const idempotentLog = await findWhatsAppMessageByIdempotencyKey(idempotencyKey);
  if (idempotentLog) return idempotentLog;

  let query = supabaseAdmin
    .from('mensagens_whatsapp')
    .select('id, status_envio, payload')
    .eq('tenant_id', tenantId)
    .eq('agendamento_id', appointmentId)
    .eq('tipo_evento', eventType)
    .is('deleted_at', null)
    .limit(1);

  const { data, error } = await query;

  if (isMissingColumnError(error)) {
    const fallback = await supabaseAdmin
      .from('mensagens_whatsapp')
      .select('id, status_envio, payload')
      .eq('tenant_id', tenantId)
      .eq('agendamento_id', appointmentId)
      .contains('payload', {
        tipo_evento: eventType,
        recipient_type: recipientType
      })
      .is('deleted_at', null)
      .limit(1);

    if (fallback.error) throw fallback.error;
    return fallback.data?.[0] || null;
  }

  if (error) throw error;

  return (data || []).find((item) => item.payload?.recipient_type === recipientType) || null;
}

async function findActiveMessageTemplate({ tenantId, names = [], requireProviderApproval = false }) {
  const normalizedNames = Array.from(new Set((names || []).filter(Boolean)));
  if (!tenantId || !normalizedNames.length) return null;

  let tenantQuery = supabaseAdmin
    .from('templates_mensagem')
    .select('id, tenant_id, nome, canal, tipo, conteudo, variaveis, aprovado_provider, metadata, ativo')
    .eq('tenant_id', tenantId)
    .eq('canal', 'whatsapp')
    .eq('ativo', true)
    .is('deleted_at', null)
    .in('nome', normalizedNames)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (requireProviderApproval) {
    tenantQuery = tenantQuery.eq('aprovado_provider', true);
  }

  const tenantResult = await tenantQuery;
  if (tenantResult.error) throw tenantResult.error;
  if (tenantResult.data?.[0]) return tenantResult.data[0];

  let globalQuery = supabaseAdmin
    .from('templates_mensagem')
    .select('id, tenant_id, nome, canal, tipo, conteudo, variaveis, aprovado_provider, metadata, ativo')
    .is('tenant_id', null)
    .eq('canal', 'whatsapp')
    .eq('ativo', true)
    .is('deleted_at', null)
    .in('nome', normalizedNames)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (requireProviderApproval) {
    globalQuery = globalQuery.eq('aprovado_provider', true);
  }

  const globalResult = await globalQuery;
  if (globalResult.error) throw globalResult.error;
  return globalResult.data?.[0] || null;
}

async function listPendingWhatsAppMessages(limit = 25) {
  const { data, error } = await supabaseAdmin
    .from('mensagens_whatsapp')
    .select('*')
    .in('status_envio', ['pendente', 'agendado', 'retry'])
    .eq('direcao', 'saida')
    .eq('ativo', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

async function claimPendingWhatsAppMessages(limit = 25) {
  const { data, error } = await supabaseAdmin.rpc('claim_pending_whatsapp_messages', {
    batch_size: limit
  });

  if (isMissingColumnError(error) || error?.code === '42883') {
    console.warn('[whatsapp-operational-debug] claim_pending_whatsapp_messages unavailable; falling back to listPending', {
      code: error.code,
      message: error.message
    });
    return listPendingWhatsAppMessages(limit);
  }

  if (error) throw error;
  return data || [];
}

async function createWhatsAppMessageLog(payload) {
  console.log('[whatsapp-operational-debug] creating mensagens_whatsapp log', {
    tenant_id: payload.tenant_id,
    agendamento_id: payload.agendamento_id,
    tipo_evento: payload.tipo_evento,
    provider: payload.provider,
    status_envio: payload.status_envio
  });

  let { data, error } = await supabaseAdmin
    .from('mensagens_whatsapp')
    .insert(payload)
    .select()
    .single();

  if (isMissingColumnError(error)) {
    console.warn('[whatsapp-operational-debug] mensagens_whatsapp insert fallback without extended columns', {
      code: error.code,
      message: error.message
    });

    const fallback = await supabaseAdmin
      .from('mensagens_whatsapp')
      .insert(stripExtendedMessageColumns(payload))
      .select()
      .single();

    data = fallback.data;
    error = fallback.error;
  }

  if (error?.code === '23505' && payload.idempotency_key) {
    const existing = await findWhatsAppMessageByIdempotencyKey(payload.idempotency_key);
    if (existing) return existing;
  }

  if (error) throw error;
  console.log('[whatsapp-operational-debug] mensagens_whatsapp log created', {
    id: data?.id,
    agendamento_id: data?.agendamento_id,
    status_envio: data?.status_envio
  });
  return data;
}

async function updateWhatsAppMessageLog(id, payload) {
  console.log('[whatsapp-operational-debug] updating mensagens_whatsapp log', {
    id,
    status_envio: payload.status_envio,
    provider_message_id: payload.provider_message_id || null
  });

  let { data, error } = await supabaseAdmin
    .from('mensagens_whatsapp')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (isMissingColumnError(error)) {
    console.warn('[whatsapp-operational-debug] mensagens_whatsapp update fallback without extended columns', {
      id,
      code: error.code,
      message: error.message
    });

    const fallback = await supabaseAdmin
      .from('mensagens_whatsapp')
      .update(stripExtendedMessageColumns(payload))
      .eq('id', id)
      .select()
      .single();

    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;
  console.log('[whatsapp-operational-debug] mensagens_whatsapp log updated', {
    id: data?.id,
    agendamento_id: data?.agendamento_id,
    status_envio: data?.status_envio
  });
  return data;
}

async function updateWhatsAppMessageByProviderMessageId(providerMessageId, payload) {
  if (!providerMessageId) return null;

  const current = await supabaseAdmin
    .from('mensagens_whatsapp')
    .select('id, payload')
    .eq('provider_message_id', providerMessageId)
    .is('deleted_at', null)
    .limit(1);

  if (current.error) throw current.error;
  const row = current.data?.[0];
  if (!row) return null;

  const { data, error } = await supabaseAdmin
    .from('mensagens_whatsapp')
    .update({
      ...payload,
      payload: {
        ...(row.payload || {}),
        ...(payload.payload || {})
      }
    })
    .eq('id', row.id)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) throw error;
  return data || null;
}

module.exports = {
  findAppointmentForCommunication,
  findOperationalRecipientForAppointment,
  findWhatsAppMessageByIdempotencyKey,
  findExistingWhatsAppMessageLog,
  findActiveMessageTemplate,
  listPendingWhatsAppMessages,
  claimPendingWhatsAppMessages,
  createWhatsAppMessageLog,
  updateWhatsAppMessageLog,
  updateWhatsAppMessageByProviderMessageId
};
