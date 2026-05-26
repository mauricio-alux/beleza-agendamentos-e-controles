const { supabaseAdmin } = require('../../config/supabase');

const ACTIVE_APPOINTMENT_STATUSES = ['pendente', 'pendente_atendente', 'pendente_cliente', 'confirmado', 'suspeito'];

function isMissingAdvancedScheduleTable(error) {
  return ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(error?.code);
}

function isMissingAgendaSecuritySchema(error) {
  return ['23514', '42703', 'PGRST204'].includes(error?.code);
}

async function listProfessionals(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('profissionais')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('ativo', true)
    .is('deleted_at', null)
    .order('ordem_exibicao', { ascending: true });

  if (error) throw error;
  return data;
}

async function listServices(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('servicos')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('ativo', true)
    .is('deleted_at', null)
    .order('ordem_exibicao', { ascending: true });

  if (error) throw error;
  return data;
}

async function findProfessional(tenantId, profissionalId) {
  const { data, error } = await supabaseAdmin
    .from('profissionais')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', profissionalId)
    .eq('ativo', true)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findService(tenantId, servicoId) {
  const { data, error } = await supabaseAdmin
    .from('servicos')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', servicoId)
    .eq('ativo', true)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findProfessionalService(tenantId, profissionalId, servicoId) {
  const { data, error } = await supabaseAdmin
    .from('profissional_servicos')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('profissional_id', profissionalId)
    .eq('servico_id', servicoId)
    .eq('ativo', true)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getTenantSettings(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('configuracoes_tenant')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getTenant(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getWeeklySchedule(tenantId, profissionalId, diaSemana) {
  const { data, error } = await supabaseAdmin
    .from('escalas_semanais')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('profissional_id', profissionalId)
    .eq('dia_semana', diaSemana)
    .eq('ativo', true)
    .is('deleted_at', null)
    .order('hora_inicio', { ascending: true });

  if (error) throw error;
  return data;
}

async function listWeeklySchedule(tenantId, profissionalId) {
  const { data, error } = await supabaseAdmin
    .from('escalas_semanais')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('profissional_id', profissionalId)
    .eq('ativo', true)
    .is('deleted_at', null)
    .order('dia_semana', { ascending: true })
    .order('hora_inicio', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function listProfessionalSchedules(tenantId, profissional) {
  let query = supabaseAdmin
    .from('professional_schedules')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('professional_id', profissional.id)
    .is('deleted_at', null)
    .order('weekday', { ascending: true });

  if (!profissional.id && profissional.usuario_id) {
    query = query.eq('user_id', profissional.usuario_id);
  }

  const { data, error } = await query;

  if (isMissingAdvancedScheduleTable(error)) {
    return null;
  }

  if (error) throw error;
  return data || [];
}

async function listProfessionalSchedulesByWeekday(tenantId, profissional, weekday) {
  const schedules = await listProfessionalSchedules(tenantId, profissional);

  if (schedules === null) {
    return null;
  }

  const exceptionRows = schedules.filter((item) => item.weekday === weekday && item.is_exception);
  if (exceptionRows.length) {
    return exceptionRows;
  }

  return schedules.filter((item) => item.weekday === weekday && !item.is_exception);
}

async function replaceProfessionalSchedules(tenantId, profissional, schedules) {
  const now = new Date().toISOString();
  const inactivePayload = { deleted_at: now };

  const deactivateResponse = await supabaseAdmin
    .from('professional_schedules')
    .update(inactivePayload)
    .eq('tenant_id', tenantId)
    .eq('professional_id', profissional.id)
    .is('deleted_at', null);

  if (isMissingAdvancedScheduleTable(deactivateResponse.error)) {
    return replaceLegacyWeeklySchedule(tenantId, profissional.id, schedules);
  }

  if (deactivateResponse.error) throw deactivateResponse.error;

  const rows = schedules.map((item) => ({
    tenant_id: tenantId,
    professional_id: profissional.id,
    user_id: profissional.usuario_id || null,
    weekday: item.weekday,
    work_start_morning: item.work_start_morning || null,
    work_end_morning: item.work_end_morning || null,
    work_start_afternoon: item.work_start_afternoon || null,
    work_end_afternoon: item.work_end_afternoon || null,
    break_start: item.break_start || null,
    break_end: item.break_end || null,
    is_working: item.is_working !== false,
    is_exception: Boolean(item.is_exception)
  }));

  if (!rows.length) return [];

  const { data, error } = await supabaseAdmin
    .from('professional_schedules')
    .insert(rows)
    .select();

  if (error) throw error;
  return data || [];
}

async function replaceLegacyWeeklySchedule(tenantId, profissionalId, schedules) {
  const now = new Date().toISOString();
  const { error: deactivateError } = await supabaseAdmin
    .from('escalas_semanais')
    .update({ ativo: false, deleted_at: now })
    .eq('tenant_id', tenantId)
    .eq('profissional_id', profissionalId)
    .is('deleted_at', null);

  if (deactivateError) throw deactivateError;

  const rows = [];

  schedules.forEach((item) => {
    if (item.is_working === false) return;

    if (item.work_start_morning && item.work_end_morning) {
      rows.push({
        tenant_id: tenantId,
        profissional_id: profissionalId,
        dia_semana: item.weekday,
        hora_inicio: item.work_start_morning,
        hora_fim: item.work_end_morning,
        hora_intervalo_inicio: null,
        hora_intervalo_fim: null,
        ativo: true
      });
    }

    if (item.work_start_afternoon && item.work_end_afternoon) {
      rows.push({
        tenant_id: tenantId,
        profissional_id: profissionalId,
        dia_semana: item.weekday,
        hora_inicio: item.work_start_afternoon,
        hora_fim: item.work_end_afternoon,
        hora_intervalo_inicio: null,
        hora_intervalo_fim: null,
        ativo: true
      });
    }
  });

  if (!rows.length) return [];

  const { data, error } = await supabaseAdmin
    .from('escalas_semanais')
    .insert(rows)
    .select();

  if (error) throw error;
  return data || [];
}

async function listAppointments(tenantId, filters = {}) {
  let query = supabaseAdmin
    .from('agendamentos')
    .select(`
      *,
      cliente:clientes(*),
      profissional:profissionais(*),
      servicos:agendamento_servicos(*, servico:servicos(id, nome, preco))
    `)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('data_inicio', { ascending: true });

  if (filters.data_inicio) query = query.gte('data_inicio', filters.data_inicio);
  if (filters.data_fim) query = query.lt('data_inicio', filters.data_fim);
  if (filters.profissional_id) query = query.eq('profissional_id', filters.profissional_id);
  if (filters.status) query = query.eq('status', filters.status);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function findAppointmentById(tenantId, id) {
  const { data, error } = await supabaseAdmin
    .from('agendamentos')
    .select(`
      *,
      cliente:clientes(*),
      profissional:profissionais(*),
      servicos:agendamento_servicos(*, servico:servicos(id, nome, preco))
    `)
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function listConflicts(tenantId, profissionalId, startIso, endIso, ignoreAppointmentId = null) {
  let query = supabaseAdmin
    .from('agendamentos')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('profissional_id', profissionalId)
    .in('status', ACTIVE_APPOINTMENT_STATUSES)
    .is('deleted_at', null)
    .lt('data_inicio', endIso)
    .gt('data_fim', startIso);

  if (ignoreAppointmentId) query = query.neq('id', ignoreAppointmentId);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

async function listBlocks(tenantId, profissionalId, startIso, endIso) {
  const { data, error } = await supabaseAdmin
    .from('bloqueios_agenda')
    .select('*')
    .eq('tenant_id', tenantId)
    .or(`profissional_id.eq.${profissionalId},profissional_id.is.null`)
    .eq('ativo', true)
    .is('deleted_at', null)
    .lt('data_inicio', endIso)
    .gt('data_fim', startIso);

  if (error) throw error;
  return data;
}

async function findClientById(tenantId, clienteId) {
  const { data, error } = await supabaseAdmin
    .from('cliente_tenants')
    .select('*, cliente:clientes(*)')
    .eq('tenant_id', tenantId)
    .eq('cliente_id', clienteId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data?.cliente || null;
}

async function findClientByPhone(tenantId, telefone) {
  const { data, error } = await supabaseAdmin
    .from('clientes')
    .select('*, vinculos:cliente_tenants!inner(*)')
    .eq('telefone', telefone)
    .eq('vinculos.tenant_id', tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function createClient(tenantId, payload) {
  const { data: cliente, error } = await supabaseAdmin
    .from('clientes')
    .insert({
      nome: payload.nome,
      telefone: payload.telefone,
      email: payload.email || null,
      metadata: payload.endereco ? { endereco: payload.endereco } : {}
    })
    .select()
    .single();

  if (error) throw error;

  const { error: linkError } = await supabaseAdmin
    .from('cliente_tenants')
    .insert({
      tenant_id: tenantId,
      cliente_id: cliente.id,
      nome_no_tenant: payload.nome,
      origem: 'dashboard'
    });

  if (linkError) {
    await supabaseAdmin.from('clientes').delete().eq('id', cliente.id).catch(() => null);
    throw linkError;
  }

  return cliente;
}

async function updateClientIdentity(tenantId, clienteId, payload) {
  const safePayload = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );

  if (!Object.keys(safePayload).length) return null;

  const { data, error } = await supabaseAdmin
    .from('clientes')
    .update(safePayload)
    .eq('id', clienteId)
    .select()
    .single();

  if (isMissingAgendaSecuritySchema(error)) {
    if (Object.prototype.hasOwnProperty.call(safePayload, 'metadata')) {
      const fallbackResponse = await supabaseAdmin
        .from('clientes')
        .update({ metadata: safePayload.metadata })
        .eq('id', clienteId)
        .select()
        .single();

      if (fallbackResponse.error) throw fallbackResponse.error;
      return fallbackResponse.data;
    }

    return null;
  }

  if (error) throw error;

  const { data: linked, error: linkError } = await supabaseAdmin
    .from('cliente_tenants')
    .select('cliente_id')
    .eq('tenant_id', tenantId)
    .eq('cliente_id', clienteId)
    .is('deleted_at', null)
    .maybeSingle();

  if (linkError) throw linkError;
  return linked ? data : null;
}

async function createAppointment(payload, servicePayload) {
  let insertPayload = payload;
  let { data: agendamento, error } = await supabaseAdmin
    .from('agendamentos')
    .insert(insertPayload)
    .select()
    .single();

  if (isMissingAgendaSecuritySchema(error) && payload.status === 'pendente_atendente') {
    insertPayload = {
      ...payload,
      status: 'pendente',
      metadata: {
        ...(payload.metadata || {}),
        intended_status: 'pendente_atendente',
        compatibility_mode: 'agenda_security_migration_pending'
      }
    };

    const fallbackResponse = await supabaseAdmin
      .from('agendamentos')
      .insert(insertPayload)
      .select()
      .single();

    agendamento = fallbackResponse.data;
    error = fallbackResponse.error;
  }

  if (error) throw error;

  const { error: serviceError } = await supabaseAdmin
    .from('agendamento_servicos')
    .insert({
      ...servicePayload,
      agendamento_id: agendamento.id
    });

  if (serviceError) {
    await supabaseAdmin.from('agendamentos').delete().eq('id', agendamento.id).catch(() => null);
    throw serviceError;
  }

  return agendamento;
}

async function updateAppointment(tenantId, id, payload) {
  let updatePayload = payload;
  let { data, error } = await supabaseAdmin
    .from('agendamentos')
    .update(updatePayload)
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .select()
    .single();

  const unsupportedSecurityStatus = [
    'pendente_atendente',
    'pendente_cliente',
    'expirado_atendente',
    'expirado_cliente',
    'suspeito',
    'solicitado'
  ].includes(payload.status);

  if (isMissingAgendaSecuritySchema(error) && unsupportedSecurityStatus) {
    updatePayload = {
      ...payload,
      status: payload.status === 'confirmado' ? 'confirmado' : 'pendente',
      metadata: {
        ...(payload.metadata || {}),
        intended_status: payload.status,
        compatibility_mode: 'agenda_security_migration_pending'
      }
    };

    const fallbackResponse = await supabaseAdmin
      .from('agendamentos')
      .update(updatePayload)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select()
      .single();

    data = fallbackResponse.data;
    error = fallbackResponse.error;
  }

  if (error) throw error;
  return data;
}

async function createStatusHistory(payload) {
  const { data, error } = await supabaseAdmin
    .from('agendamento_status_historico')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function listAppointmentsForAnalytics(tenantId, filters = {}) {
  let query = supabaseAdmin
    .from('agendamentos')
    .select('id, tenant_id, profissional_id, cliente_id, data_inicio, data_fim, status, valor_total')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('data_inicio', { ascending: true });

  if (filters.data_inicio) query = query.gte('data_inicio', filters.data_inicio);
  if (filters.data_fim) query = query.lt('data_inicio', filters.data_fim);
  if (filters.profissional_id) query = query.eq('profissional_id', filters.profissional_id);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function countClientAppointmentsSince(tenantId, clienteId, sinceIso) {
  const { count, error } = await supabaseAdmin
    .from('agendamentos')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('cliente_id', clienteId)
    .gte('created_at', sinceIso)
    .is('deleted_at', null);

  if (error) throw error;
  return count || 0;
}

module.exports = {
  ACTIVE_APPOINTMENT_STATUSES,
  listProfessionals,
  listServices,
  findProfessional,
  findService,
  findProfessionalService,
  getTenantSettings,
  getTenant,
  getWeeklySchedule,
  listWeeklySchedule,
  listProfessionalSchedules,
  listProfessionalSchedulesByWeekday,
  replaceProfessionalSchedules,
  listAppointments,
  findAppointmentById,
  listConflicts,
  listBlocks,
  findClientById,
  findClientByPhone,
  createClient,
  updateClientIdentity,
  createAppointment,
  updateAppointment,
  createStatusHistory,
  listAppointmentsForAnalytics,
  countClientAppointmentsSince
};
