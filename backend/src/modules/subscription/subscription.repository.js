const { supabaseAdmin } = require('../../config/supabase');

async function findCurrentByTenant(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('assinaturas')
    .select('*, plano:planos(*)')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .eq('ativo', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function findActiveByTenant(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('assinaturas')
    .select('*, plano:planos(*)')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .eq('ativo', true)
    .in('status', ['trial', 'ativo', 'ativa'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function create(payload) {
  const { data, error } = await supabaseAdmin
    .from('assinaturas')
    .insert(payload)
    .select('*, plano:planos(*)')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function update(id, payload) {
  const { data, error } = await supabaseAdmin
    .from('assinaturas')
    .update(payload)
    .eq('id', id)
    .select('*, plano:planos(*)')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function updateTenantStatus(tenantId, status) {
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .update({ status })
    .eq('id', tenantId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function countTableByTenant(tableName, tenantId) {
  const { count, error } = await supabaseAdmin
    .from(tableName)
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('ativo', true)
    .is('deleted_at', null);

  if (error) {
    throw error;
  }

  return count || 0;
}

async function countMonthlyAppointments(tenantId, startDate, endDate) {
  const { count, error } = await supabaseAdmin
    .from('agendamentos')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('data_inicio', startDate)
    .lt('data_inicio', endDate)
    .neq('status', 'cancelado')
    .eq('ativo', true)
    .is('deleted_at', null);

  if (error) {
    throw error;
  }

  return count || 0;
}

async function countMonthlyWhatsApp(tenantId, startDate, endDate) {
  const { count, error } = await supabaseAdmin
    .from('mensagens_whatsapp')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', startDate)
    .lt('created_at', endDate)
    .eq('direcao', 'saida')
    .eq('ativo', true)
    .is('deleted_at', null);

  if (error) {
    throw error;
  }

  return count || 0;
}

module.exports = {
  findCurrentByTenant,
  findActiveByTenant,
  create,
  update,
  updateTenantStatus,
  countTableByTenant,
  countMonthlyAppointments,
  countMonthlyWhatsApp
};
