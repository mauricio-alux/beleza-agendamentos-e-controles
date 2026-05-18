const usuariosRepository = require('./usuarios.repository');
const { supabaseAdmin } = require('../../config/supabase');
const { AppError } = require('../../utils/errors');
const { normalizeEmail, onlyDigits } = require('../../utils/normalize');
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

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: input.senha_temporaria,
    email_confirm: true,
    user_metadata: {
      nome: input.nome,
      telefone: input.telefone ? onlyDigits(input.telefone) : null
    }
  });

  if (authError) {
    throw new AppError(authError.message, 400, 'AUTH_USER_CREATE_FAILED');
  }

  const usuario = await usuariosRepository.create({
    tenant_id: tenantId,
    auth_user_id: authData.user.id,
    nome: input.nome,
    email,
    telefone: input.telefone ? onlyDigits(input.telefone) : null,
    tipo_usuario: input.tipo_usuario
  });

  await eventLogsService.logEvent('user_registered', {
    tenantId,
    usuarioId: createdByUsuarioId,
    payload: {
      created_usuario_id: usuario.id,
      auth_user_id: authData.user.id,
      tipo_usuario: usuario.tipo_usuario
    }
  });

  return usuario;
}

module.exports = {
  getByAuthUserId,
  listByTenant,
  createTenantUser
};
