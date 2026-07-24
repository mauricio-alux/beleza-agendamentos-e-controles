const usuariosRepository = require('../modules/usuarios/usuarios.repository');
const membershipsRepository = require('../modules/memberships/memberships.repository');
const tenantsRepository = require('../modules/tenants/tenants.repository');
const eventLogsService = require('../modules/event-logs/eventLogs.service');
const rbacService = require('../modules/rbac/rbac.service');
const { forbidden } = require('../utils/errors');

function getSupportContext(req) {
  const enabled = String(req.headers['x-support-mode'] || '').toLowerCase() === 'true';
  const tenantId = req.headers['x-tenant-id'] || req.headers['x-bellory-tenant-id'] || null;
  const reason = req.headers['x-support-reason'] || req.headers['x-audit-reason'] || null;

  return { enabled, tenantId, reason };
}

async function applySupportTenantContext(req, usuario) {
  const support = getSupportContext(req);

  if (!support.enabled || !support.tenantId || !support.reason) {
    throw forbidden('Support mode with tenant and reason is required for platform operational access');
  }

  const tenant = await tenantsRepository.findById(support.tenantId);
  if (!tenant || !tenant.ativo || tenant.deleted_at) {
    throw forbidden('Tenant not available for support mode');
  }

  req.usuario = usuario;
  req.tenantId = tenant.id;
  req.tenant = tenant;
  req.tipoUsuario = 'Administrador';
  req.memberships = [];
  req.membership = null;
  req.supportContext = {
    enabled: true,
    mode: 'support',
    reason: String(support.reason),
    tenantId: tenant.id,
    platformRole: 'MasterAdmin',
    operationalRole: 'Administrador'
  };
  req.permissionContext = await rbacService.buildPermissionContext({
    usuario,
    tenantId: tenant.id,
    tipoUsuario: 'Administrador',
    membership: null
  });

  await eventLogsService.logEvent('platform_support_access', {
    tenantId: tenant.id,
    usuarioId: usuario.id,
    origem: 'platform_support',
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    payload: {
      method: req.method,
      path: req.originalUrl,
      reason: String(support.reason),
      support_mode: true
    }
  });
}

async function tenantMiddleware(req, res, next) {
  try {
    if (req.usuario && req.tenantId && req.membership) {
      return next();
    }

    const usuario = await usuariosRepository.findByAuthUserId(req.auth.user.id);

    if (!usuario) {
      throw forbidden('Tenant onboarding is required');
    }

    if (usuario.tipo_usuario === 'MasterAdmin') {
      await applySupportTenantContext(req, usuario);
      return next();
    }

    const memberships = await membershipsRepository.listByUsuario(usuario.id);
    const membership = memberships.find((item) => item.status === 'ativo' && item.is_primary)
      || memberships.find((item) => item.status === 'ativo');

    if (!membership) {
      throw forbidden('Tenant context is required');
    }

    req.usuario = usuario;
    req.tenantId = membership.tenant_id;
    req.tenant = membership.tenant;
    req.tipoUsuario = membership.role;
    req.memberships = memberships;
    req.membership = membership;
    req.permissionContext = await rbacService.buildPermissionContext({
      usuario,
      tenantId: membership.tenant_id,
      tipoUsuario: membership.role,
      membership
    });

    next();
  } catch (error) {
    next(error);
  }
}

async function optionalTenantMiddleware(req, res, next) {
  try {
    if (req.usuario && (req.tenantId || req.usuario.tipo_usuario === 'MasterAdmin')) {
      return next();
    }

    const usuario = await usuariosRepository.findByAuthUserId(req.auth.user.id);
    if (!usuario) {
      return next();
    }

    if (usuario.tipo_usuario === 'MasterAdmin') {
      const support = getSupportContext(req);
      if (support.enabled || support.tenantId) {
        await applySupportTenantContext(req, usuario);
        return next();
      }

      req.usuario = usuario;
      req.tipoUsuario = 'MasterAdmin';
      req.memberships = [];
      req.membership = null;
      req.permissionContext = await rbacService.buildPermissionContext({
        usuario,
        tipoUsuario: 'MasterAdmin',
        platformContext: { role: 'MasterAdmin' }
      });
      return next();
    }

    const memberships = await membershipsRepository.listByUsuario(usuario.id);
    const membership = memberships.find((item) => item.status === 'ativo' && item.is_primary)
      || memberships.find((item) => item.status === 'ativo')
      || null;

    req.usuario = usuario;
    req.memberships = memberships;

    if (membership) {
      req.tenantId = membership.tenant_id;
      req.tenant = membership.tenant;
      req.tipoUsuario = membership.role;
      req.membership = membership;
      req.permissionContext = await rbacService.buildPermissionContext({
        usuario,
        tenantId: membership.tenant_id,
        tipoUsuario: membership.role,
        membership
      });
    } else {
      req.tipoUsuario = usuario.tipo_usuario;
      req.permissionContext = await rbacService.buildPermissionContext({
        usuario,
        tipoUsuario: usuario.tipo_usuario
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = tenantMiddleware;
module.exports.optionalTenantMiddleware = optionalTenantMiddleware;
