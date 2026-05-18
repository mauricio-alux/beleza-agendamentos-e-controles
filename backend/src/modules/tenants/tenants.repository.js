const { supabaseAdmin } = require('../../config/supabase');

async function slugExists(slug) {
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .ilike('slug', slug)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

async function create(payload) {
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function findById(id) {
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function update(id, payload) {
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function findSettings(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('configuracoes_tenant')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function updateSettings(tenantId, payload) {
  const { data, error } = await supabaseAdmin
    .from('configuracoes_tenant')
    .update(payload)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function createSettingsAudit(rows) {
  if (!rows.length) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from('tenant_settings_audit')
    .insert(rows)
    .select();

  if (error) {
    throw error;
  }

  return data;
}

module.exports = {
  slugExists,
  create,
  findById,
  update,
  findSettings,
  updateSettings,
  createSettingsAudit
};
