const { supabaseAdmin } = require('../../config/supabase');

async function listByTenant(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('cliente_tenants')
    .select('*, cliente:clientes(*)')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
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

async function createClient(payload) {
  const { data, error } = await supabaseAdmin
    .from('clientes')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateClient(id, payload) {
  const { data, error } = await supabaseAdmin
    .from('clientes')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function createTenantLink(tenantId, clienteId, payload) {
  const { data, error } = await supabaseAdmin
    .from('cliente_tenants')
    .insert({
      tenant_id: tenantId,
      cliente_id: clienteId,
      ...payload
    })
    .select('*, cliente:clientes(*)')
    .single();

  if (error) throw error;
  return data;
}

async function updateTenantLink(tenantId, clienteId, payload) {
  const { data, error } = await supabaseAdmin
    .from('cliente_tenants')
    .update(payload)
    .eq('tenant_id', tenantId)
    .eq('cliente_id', clienteId)
    .is('deleted_at', null)
    .select('*, cliente:clientes(*)')
    .single();

  if (error) throw error;
  return data;
}

module.exports = {
  listByTenant,
  findClientByPhone,
  createClient,
  updateClient,
  createTenantLink,
  updateTenantLink
};
