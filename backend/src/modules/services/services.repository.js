const { supabaseAdmin } = require('../../config/supabase');

async function listByTenant(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('servicos')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('ativo', true)
    .is('deleted_at', null)
    .order('ordem_exibicao', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function create(tenantId, payload) {
  const { data, error } = await supabaseAdmin
    .from('servicos')
    .insert({ tenant_id: tenantId, ...payload })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function update(tenantId, id, payload) {
  const { data, error } = await supabaseAdmin
    .from('servicos')
    .update(payload)
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function softDelete(tenantId, id) {
  const { data, error } = await supabaseAdmin
    .from('servicos')
    .update({
      ativo: false,
      deleted_at: new Date().toISOString()
    })
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = {
  listByTenant,
  create,
  update,
  softDelete
};
