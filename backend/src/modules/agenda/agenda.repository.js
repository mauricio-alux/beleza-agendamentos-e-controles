const { supabaseAdmin } = require('../../config/supabase');

const ACTIVE_APPOINTMENT_STATUSES = ['pendente', 'confirmado'];

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

async function listAppointments(tenantId, filters = {}) {
  let query = supabaseAdmin
    .from('agendamentos')
    .select(`
      *,
      cliente:clientes(*),
      profissional:profissionais(*),
      servicos:agendamento_servicos(*)
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
      servicos:agendamento_servicos(*)
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
      email: payload.email || null
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

async function createAppointment(payload, servicePayload) {
  const { data: agendamento, error } = await supabaseAdmin
    .from('agendamentos')
    .insert(payload)
    .select()
    .single();

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
  const { data, error } = await supabaseAdmin
    .from('agendamentos')
    .update(payload)
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .select()
    .single();

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

module.exports = {
  ACTIVE_APPOINTMENT_STATUSES,
  listProfessionals,
  listServices,
  findProfessional,
  findService,
  findProfessionalService,
  getTenantSettings,
  getWeeklySchedule,
  listAppointments,
  findAppointmentById,
  listConflicts,
  listBlocks,
  findClientById,
  findClientByPhone,
  createClient,
  createAppointment,
  updateAppointment,
  createStatusHistory
};
