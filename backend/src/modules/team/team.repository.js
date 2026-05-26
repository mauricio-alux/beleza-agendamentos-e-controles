const { supabaseAdmin } = require('../../config/supabase');

async function listByTenant(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('profissionais')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('ativo', { ascending: false })
    .order('ordem_exibicao', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function create(tenantId, payload) {
  const { data, error } = await supabaseAdmin
    .from('profissionais')
    .insert({
      tenant_id: tenantId,
      ...payload
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = {
  listByTenant,
  create
};
