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
    .from('tenant_memberships')
    .select('*, usuario:usuarios(*)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return (data || [])
    .filter((membership) => membership.usuario && !membership.usuario.deleted_at)
    .map((membership) => ({
      ...membership.usuario,
      tenant_id: membership.tenant_id,
      tipo_usuario: membership.role,
      membership: {
        id: membership.id,
        tenant_id: membership.tenant_id,
        role: membership.role,
        status: membership.status,
        profissional_id: membership.profissional_id,
        is_primary: membership.is_primary
      }
    }));
}

module.exports = {
  findByAuthUserId,
  findByEmail,
  create,
  update,
  hardDelete,
  listByTenant
};
