const { supabaseAdmin } = require('../../config/supabase');

async function findByAuthUserId(authUserId) {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select('*')
    .eq('auth_user_id', authUserId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function findByEmail(email) {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select('*')
    .ilike('email', email)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function create(payload) {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function update(id, payload) {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function hardDelete(id) {
  const { error } = await supabaseAdmin
    .from('usuarios')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }

  return { success: true };
}

async function listByTenant(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

module.exports = {
  findByAuthUserId,
  findByEmail,
  create,
  update,
  hardDelete,
  listByTenant
};
