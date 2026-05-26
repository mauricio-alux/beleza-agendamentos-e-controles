const { supabaseAdmin } = require('../../config/supabase');

async function countByTenant(tableName, tenantId, builder = (query) => query) {
  const query = builder(
    supabaseAdmin
      .from(tableName)
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
  );

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function sumAppointmentsRevenue(tenantId, startIso, endIso) {
  const { data, error } = await supabaseAdmin
    .from('agendamentos')
    .select('valor_total')
    .eq('tenant_id', tenantId)
    .gte('data_inicio', startIso)
    .lt('data_inicio', endIso)
    .in('status', ['confirmado', 'concluido'])
    .is('deleted_at', null);

  if (error) throw error;

  return (data || []).reduce((total, item) => total + Number(item.valor_total || 0), 0);
}

async function countTodayAppointments(tenantId, startIso, endIso) {
  return countByTenant('agendamentos', tenantId, (query) => query
    .gte('data_inicio', startIso)
    .lt('data_inicio', endIso)
    .neq('status', 'cancelado'));
}

async function countActiveClients(tenantId) {
  return countByTenant('cliente_tenants', tenantId, (query) => query.eq('status', 'ativo'));
}

async function countActiveProfessionals(tenantId) {
  return countByTenant('profissionais', tenantId, (query) => query.eq('ativo', true));
}

async function listAgendaPreview(tenantId, startIso, endIso, limit = 4) {
  const { data, error } = await supabaseAdmin
    .from('agendamentos')
    .select(`
      id,
      data_inicio,
      data_fim,
      status,
      valor_total,
      cliente:clientes(nome),
      profissional:profissionais(nome_publico, cargo),
      servicos:agendamento_servicos(nome_servico)
    `)
    .eq('tenant_id', tenantId)
    .gte('data_inicio', startIso)
    .lt('data_inicio', endIso)
    .is('deleted_at', null)
    .order('data_inicio', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

async function listNextAppointments(tenantId, fromIso, limit = 4) {
  const { data, error } = await supabaseAdmin
    .from('agendamentos')
    .select(`
      id,
      data_inicio,
      data_fim,
      status,
      valor_total,
      cliente:clientes(nome),
      profissional:profissionais(nome_publico, cargo),
      servicos:agendamento_servicos(nome_servico)
    `)
    .eq('tenant_id', tenantId)
    .gte('data_inicio', fromIso)
    .in('status', ['pendente', 'confirmado'])
    .is('deleted_at', null)
    .order('data_inicio', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

async function listRecentActivities(tenantId, limit = 6) {
  const { data, error } = await supabaseAdmin
    .from('event_logs')
    .select('id, event_type, origem, payload, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

async function listNotifications(tenantId, userId, limit = 4) {
  const { data, error } = await supabaseAdmin
    .from('notificacoes')
    .select('id, titulo, mensagem, tipo, lida, created_at')
    .eq('tenant_id', tenantId)
    .or(`usuario_id.eq.${userId},usuario_id.is.null`)
    .eq('ativo', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

async function listCampaignPreview(tenantId, limit = 3) {
  const { data, error } = await supabaseAdmin
    .from('campanhas')
    .select('id, nome, descricao, status, data_inicio, data_fim')
    .eq('tenant_id', tenantId)
    .in('status', ['rascunho', 'agendada', 'ativa'])
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

async function countTenantsByStatus(status) {
  let query = supabaseAdmin
    .from('tenants')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null);

  if (status) query = query.eq('status', status);

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

module.exports = {
  sumAppointmentsRevenue,
  countTodayAppointments,
  countActiveClients,
  countActiveProfessionals,
  listAgendaPreview,
  listNextAppointments,
  listRecentActivities,
  listNotifications,
  listCampaignPreview,
  countTenantsByStatus
};
