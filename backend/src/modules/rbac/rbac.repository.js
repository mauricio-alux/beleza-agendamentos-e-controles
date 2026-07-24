const { supabaseAdmin } = require('../../config/supabase');

async function listRolePermissions(roleName, scope) {
  const { data, error } = await supabaseAdmin
    .from('roles')
    .select(`
      id,
      nome,
      escopo,
      dashboard,
      role_permissions(permission:permissions(codigo, recurso, acao, escopo))
    `)
    .eq('nome', roleName)
    .eq('escopo', scope)
    .eq('ativo', true)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return {
      role: null,
      permissions: []
    };
  }

  return {
    role: {
      id: data.id,
      nome: data.nome,
      escopo: data.escopo,
      dashboard: data.dashboard
    },
    permissions: (data.role_permissions || [])
      .map((item) => item.permission)
      .filter(Boolean)
  };
}

async function listUserPermissionOverrides(tenantId, usuarioId) {
  if (!tenantId || !usuarioId) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from('tenant_user_permissions')
    .select('effect, permission:permissions(codigo, recurso, acao, escopo)')
    .eq('tenant_id', tenantId)
    .eq('usuario_id', usuarioId);

  if (error) throw error;
  return data || [];
}

module.exports = {
  listRolePermissions,
  listUserPermissionOverrides
};
