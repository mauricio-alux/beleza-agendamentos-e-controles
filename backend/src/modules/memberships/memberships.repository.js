const { supabaseAdmin } = require('../../config/supabase');

const MEMBERSHIP_SELECT = `
  *,
  tenant:tenants(*),
  profissional:profissionais(*)
`;

async function listByUsuario(usuarioId) {
  const { data, error } = await supabaseAdmin
    .from('tenant_memberships')
    .select(MEMBERSHIP_SELECT)
    .eq('usuario_id', usuarioId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function findActiveByUsuarioAndTenant(usuarioId, tenantId) {
  const { data, error } = await supabaseAdmin
    .from('tenant_memberships')
    .select(MEMBERSHIP_SELECT)
    .eq('usuario_id', usuarioId)
    .eq('tenant_id', tenantId)
    .eq('status', 'ativo')
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function listByTenant(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('tenant_memberships')
    .select('*, usuario:usuarios(*)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function findOwnerByTenant(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('tenant_memberships')
    .select('*, usuario:usuarios(*)')
    .eq('tenant_id', tenantId)
    .eq('is_owner', true)
    .eq('status', 'ativo')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function create(payload) {
  const { data, error } = await supabaseAdmin
    .from('tenant_memberships')
    .insert(payload)
    .select(MEMBERSHIP_SELECT)
    .single();

  if (error) throw error;
  return data;
}

async function upsert(payload) {
  const { data, error } = await supabaseAdmin
    .from('tenant_memberships')
    .upsert(payload, { onConflict: 'usuario_id,tenant_id' })
    .select(MEMBERSHIP_SELECT)
    .single();

  if (error) throw error;
  return data;
}

async function update(id, payload) {
  const { data, error } = await supabaseAdmin
    .from('tenant_memberships')
    .update(payload)
    .eq('id', id)
    .select(MEMBERSHIP_SELECT)
    .single();

  if (error) throw error;
  return data;
}

module.exports = {
  listByUsuario,
  findActiveByUsuarioAndTenant,
  findOwnerByTenant,
  listByTenant,
  create,
  upsert,
  update
};
