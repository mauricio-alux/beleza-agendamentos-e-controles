const usuariosRepository = require('./usuarios.repository');
const membershipsRepository = require('../memberships/memberships.repository');
const { supabaseAdmin } = require('../../config/supabase');
const { APP_BRAND } = require('../../config/app-brand');
const { AppError } = require('../../utils/errors');
const { normalizeEmail, normalizePhoneToE164 } = require('../../utils/normalize');
const eventLogsService = require('../event-logs/eventLogs.service');

async function getByAuthUserId(authUserId) {
  return usuariosRepository.findByAuthUserId(authUserId);
}

async function listByTenant(tenantId) {
  return usuariosRepository.listByTenant(tenantId);
}

async function createTenantUser(tenantId, createdByUsuarioId, input) {
  const email = normalizeEmail(input.email);
  const existing = await usuariosRepository.findByEmail(email);

  if (existing) {
    throw new AppError('Email ja cadastrado', 409, 'USER_EMAIL_ALREADY_EXISTS');
  }

  let authUserId = null;
  let usuario = null;

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: input.senha_temporaria,
      email_confirm: true,
      user_metadata: {
        nome: input.nome,
        telefone: input.telefone ? normalizePhoneToE164(input.telefone) : null
      }
    });

    if (authError) {
      throw new AppError(authError.message, 400, 'AUTH_USER_CREATE_FAILED');
    }

    authUserId = authData.user.id;
    usuario = await usuariosRepository.create({
      auth_user_id: authUserId,
      nome: input.nome,
      email,
      telefone: input.telefone ? normalizePhoneToE164(input.telefone) : null,
      tipo_usuario: input.tipo_usuario
    });

    const membership = await membershipsRepository.create({
      usuario_id: usuario.id,
      tenant_id: tenantId,
      role: input.tipo_usuario,
      status: 'ativo',
      profissional_id: input.profissional_id || null,
      is_primary: true,
      vinculo_tipo: input.vinculo_tipo || (input.tipo_usuario === 'Autonomo' || input.tipo_usuario === 'Terceiro' ? 'partner' : 'staff'),
      is_owner: Boolean(input.is_owner),
      marketplace_enabled: false,
      metadata: {
        origem: 'team_user_create',
        ...(input.metadata || {}),
        autonomo_context: input.tipo_usuario === 'Autonomo' ? 'partner_tenant' : null
      }
    });

    await eventLogsService.logEvent('user_registered', {
      tenantId,
      usuarioId: createdByUsuarioId,
      payload: {
        created_usuario_id: usuario.id,
        auth_user_id: authUserId,
        tipo_usuario: usuario.tipo_usuario
      }
    });

    return {
      ...usuario,
      tenant_id: tenantId,
      tipo_usuario: membership.role,
      membership
    };
  } catch (error) {
    if (usuario?.id) {
      await usuariosRepository.hardDelete(usuario.id).catch((rollbackError) => {
        console.error('Failed to rollback tenant user', rollbackError);
      });
    }

    if (authUserId) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId).catch((rollbackError) => {
        console.error('Failed to rollback auth user', rollbackError);
      });
    }

    if (error instanceof AppError) {
      throw error;
    }

    if (error.code === '23514') {
      throw new AppError('O perfil selecionado ainda nao esta habilitado no banco de dados.', 422, 'TEAM_USER_ROLE_NOT_SUPPORTED');
    }

    if (error.code === '23505') {
      throw new AppError(`Este email ja possui cadastro no ${APP_BRAND.appName}.`, 409, 'USER_EMAIL_ALREADY_EXISTS');
    }

    throw new AppError('Nao foi possivel criar o acesso deste profissional.', 500, 'TEAM_ACCESS_CREATE_FAILED');
  }
}

module.exports = {
  getByAuthUserId,
  listByTenant,
  createTenantUser
};
