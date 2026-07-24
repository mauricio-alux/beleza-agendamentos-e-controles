const rbacRepository = require('./rbac.repository');

const SCOPE_BY_ROLE = {
  MasterAdmin: 'platform',
  Cliente: 'client'
};

const BASELINE_PERMISSIONS_BY_ROLE = {
  Administrador: [
    'dashboard.read',
    'agenda.read',
    'agenda.write',
    'agenda.confirm',
    'agenda.cancel',
    'agenda.reschedule',
    'agenda.complete',
    'agenda.no_show',
    'agenda.manage',
    'clientes.read',
    'clientes.write',
    'servicos.read',
    'servicos.write',
    'servicos.manage',
    'campanhas.read',
    'campanhas.manage',
    'financeiro.read',
    'financeiro.manage',
    'relatorios.read',
    'equipe.read',
    'equipe.manage',
    'tenant.read',
    'tenant.manage'
  ],
  Autonomo: [
    'dashboard.read',
    'agenda.read',
    'agenda.write',
    'agenda.confirm',
    'agenda.cancel',
    'agenda.reschedule',
    'agenda.complete',
    'agenda.no_show',
    'agenda.manage',
    'clientes.read',
    'clientes.write',
    'servicos.read',
    'servicos.write',
    'servicos.manage',
    'campanhas.read',
    'campanhas.manage',
    'financeiro.read',
    'financeiro.manage',
    'relatorios.read',
    'equipe.read',
    'equipe.manage',
    'tenant.read',
    'tenant.manage'
  ],
  Funcionario: [
    'dashboard.read',
    'agenda.read',
    'agenda.confirm',
    'agenda.cancel',
    'agenda.reschedule',
    'agenda.complete',
    'agenda.no_show'
  ],
  Terceiro: [
    'dashboard.read',
    'agenda.read',
    'agenda.confirm',
    'agenda.cancel',
    'agenda.reschedule',
    'agenda.complete',
    'agenda.no_show'
  ],
  Profissional: [
    'dashboard.read',
    'agenda.read',
    'agenda.confirm',
    'agenda.cancel',
    'agenda.reschedule',
    'agenda.complete',
    'agenda.no_show'
  ],
  'Profissional Adm': [
    'dashboard.read',
    'agenda.read',
    'agenda.confirm',
    'clientes.read'
  ]
};

function getScope(context = {}) {
  if (context.scope) return context.scope;
  if (context.platformContext) return 'platform';
  if (context.usuario?.tipo_usuario === 'MasterAdmin' && !context.tenantId) return 'platform';
  if (context.tipoUsuario === 'Cliente') return 'client';
  return 'tenant';
}

function getRoleName(context = {}) {
  if (context.platformContext || (context.usuario?.tipo_usuario === 'MasterAdmin' && !context.tenantId)) {
    return 'MasterAdmin';
  }

  if (context.tenantId && context.tipoUsuario === 'MasterAdmin') {
    return 'Administrador';
  }

  return context.tipoUsuario || context.membership?.role || context.usuario?.tipo_usuario || 'Cliente';
}

async function buildPermissionContext(context = {}) {
  const roleName = getRoleName(context);
  const scope = SCOPE_BY_ROLE[roleName] || getScope(context);
  const { role, permissions } = await rbacRepository.listRolePermissions(roleName, scope);
  const permissionSet = new Set(permissions.map((permission) => permission.codigo));

  (BASELINE_PERMISSIONS_BY_ROLE[roleName] || []).forEach((permission) => {
    permissionSet.add(permission);
  });

  if (scope === 'tenant') {
    const overrides = await rbacRepository.listUserPermissionOverrides(context.tenantId, context.usuario?.id);

    overrides.forEach((override) => {
      const codigo = override.permission?.codigo;
      if (!codigo) return;

      if (override.effect === 'deny') {
        permissionSet.delete(codigo);
      } else {
        permissionSet.add(codigo);
      }
    });
  }

  if (scope === 'tenant' && roleName === 'Autonomo') {
    const isOwner = context.membership?.is_owner === true || context.membership?.vinculo_tipo === 'owner';

    if (!isOwner) {
      const partnerPermissions = new Set([
        'dashboard.read',
        'agenda.read',
        'agenda.confirm',
        'agenda.cancel',
        'agenda.reschedule',
        'agenda.complete',
        'agenda.no_show'
      ]);

      permissionSet.forEach((permission) => {
        if (!partnerPermissions.has(permission)) {
          permissionSet.delete(permission);
        }
      });
    }
  }

  if (scope === 'tenant' && ['Funcionario', 'Terceiro', 'Profissional'].includes(roleName)) {
    const personalPermissions = new Set([
      'dashboard.read',
      'agenda.read',
      'agenda.confirm',
      'agenda.cancel',
      'agenda.reschedule',
      'agenda.complete',
      'agenda.no_show'
    ]);

    permissionSet.forEach((permission) => {
      if (!personalPermissions.has(permission)) {
        permissionSet.delete(permission);
      }
    });
  }

  return {
    role: role || {
      nome: roleName,
      escopo: scope,
      dashboard: scope
    },
    scope,
    permissions: Array.from(permissionSet).sort()
  };
}

async function hasPermission(context, requestedPermissions = []) {
  const permissionContext = context.permissionContext || await buildPermissionContext(context);
  const requested = Array.isArray(requestedPermissions) ? requestedPermissions : [requestedPermissions];

  return {
    allowed: requested.some((permission) => permissionContext.permissions.includes(permission)),
    permissionContext
  };
}

module.exports = {
  buildPermissionContext,
  hasPermission
};
