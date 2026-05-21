const { supabase, supabaseAdmin } = require('../../config/supabase');
const { AppError, forbidden, unauthorized } = require('../../utils/errors');
const { normalizeEmail, onlyDigits } = require('../../utils/normalize');
const usuariosRepository = require('../usuarios/usuarios.repository');
const tenantsRepository = require('../tenants/tenants.repository');
const planosService = require('../planos/planos.service');
const onboardingService = require('../onboarding/onboarding.service');
const eventLogsService = require('../event-logs/eventLogs.service');

function sanitizeAuthUser(authUser) {
  return {
    id: authUser.id,
    email: authUser.email,
    phone: authUser.phone,
    role: authUser.role,
    created_at: authUser.created_at,
    updated_at: authUser.updated_at,
    last_sign_in_at: authUser.last_sign_in_at,
    user_metadata: authUser.user_metadata || {}
  };
}

function formatSessionResponse(session, authUser, usuario, tenant) {
  return {
    access_token: session?.access_token || null,
    refresh_token: session?.refresh_token || null,
    token_type: session?.token_type || 'bearer',
    expires_in: session?.expires_in || null,
    expires_at: session?.expires_at || null,
    user: sanitizeAuthUser(authUser),
    usuario: {
      id: usuario.id,
      tenant_id: usuario.tenant_id,
      nome: usuario.nome,
      email: usuario.email,
      telefone: usuario.telefone,
      tipo_usuario: usuario.tipo_usuario,
      foto_url: usuario.foto_url
    },
    tenant: {
      id: tenant.id,
      nome_fantasia: tenant.nome_fantasia,
      slug: tenant.slug,
      status: tenant.status,
      plano_id: tenant.plano_id,
      timezone: tenant.timezone
    }
  };
}

async function findAuthUserByEmail(email) {
  let page = 1;
  const perPage = 1000;

  while (page <= 10) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });

    if (error) {
      throw new AppError('Nao foi possivel verificar o email no provedor de autenticacao', 400, 'AUTH_EMAIL_CHECK_FAILED');
    }

    const user = data.users.find((item) => normalizeEmail(item.email) === email);
    if (user) {
      return user;
    }

    if (data.users.length < perPage) {
      return null;
    }

    page += 1;
  }

  return null;
}

async function rollbackAuthUser(authUserId, reason = 'register_failed') {
  if (!authUserId) {
    return;
  }

  console.info('Rolling back Supabase Auth user', { authUserId, reason });

  const partialUsuario = await usuariosRepository.findByAuthUserId(authUserId).catch((error) => {
    console.error('Failed to inspect partial usuario during rollback', {
      authUserId,
      error: error.message
    });
    return null;
  });

  if (partialUsuario?.tenant_id) {
    await tenantsRepository.hardDelete(partialUsuario.tenant_id).catch((error) => {
      console.error('Failed to rollback tenant during auth rollback', {
        authUserId,
        tenantId: partialUsuario.tenant_id,
        error: error.message
      });
    });
  } else if (partialUsuario?.id) {
    await usuariosRepository.hardDelete(partialUsuario.id).catch((error) => {
      console.error('Failed to rollback usuario during auth rollback', {
        authUserId,
        usuarioId: partialUsuario.id,
        error: error.message
      });
    });
  }

  await supabaseAdmin.auth.admin.deleteUser(authUserId).catch((error) => {
    console.error('Failed to rollback Supabase Auth user', {
      authUserId,
      error: error.message
    });
  });
}

async function getAuthenticatedUser(authUser) {
  const usuario = await usuariosRepository.findByAuthUserId(authUser.id);

  if (!usuario || !usuario.ativo || usuario.deleted_at) {
    throw forbidden('Usuario Bellory nao encontrado ou inativo');
  }

  if (!usuario.tenant_id) {
    throw forbidden('Usuario sem tenant vinculado');
  }

  const tenant = await tenantsRepository.findById(usuario.tenant_id);

  if (!tenant || !tenant.ativo || tenant.deleted_at) {
    throw forbidden('Tenant nao encontrado ou inativo');
  }

  return {
    auth_user: authUser,
    usuario,
    tenant,
    tenant_id: tenant.id,
    tipo_usuario: usuario.tipo_usuario
  };
}

async function validateToken(accessToken) {
  if (!accessToken) {
    throw unauthorized('Missing bearer token');
  }

  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);

  if (error || !data.user) {
    throw unauthorized('Invalid bearer token');
  }

  return getAuthenticatedUser(data.user);
}

async function register(input, requestContext = {}) {
  const email = normalizeEmail(input.email);
  const telefone = input.telefone ? onlyDigits(input.telefone) : null;

  await planosService.validatePlan(input.plano_id);

  const existingUsuario = await usuariosRepository.findByEmail(email);
  if (existingUsuario) {
    throw new AppError('Email ja cadastrado', 409, 'USER_EMAIL_ALREADY_EXISTS');
  }

  const existingAuthUser = await findAuthUserByEmail(email);
  if (existingAuthUser) {
    const linkedUsuario = await usuariosRepository.findByAuthUserId(existingAuthUser.id);

    if (linkedUsuario) {
      throw new AppError('Email ja cadastrado', 409, 'USER_EMAIL_ALREADY_EXISTS');
    }

    console.info('Removing orphan Supabase Auth user before register retry', {
      authUserId: existingAuthUser.id,
      email
    });

    await rollbackAuthUser(existingAuthUser.id, 'orphan_auth_retry');
  }

  console.info('Creating confirmed Supabase Auth user', { email });

  const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: input.senha,
    email_confirm: true,
    user_metadata: {
      nome: input.nome || null,
      telefone
    }
  });

  if (createError) {
    console.error('Supabase Auth register failed', {
      email,
      code: createError.code,
      status: createError.status,
      message: createError.message
    });

    const message = createError.message || 'Nao foi possivel criar o usuario de autenticacao';
    if (/rate limit|too many/i.test(message)) {
      throw new AppError('Limite temporario do provedor de autenticacao. Tente novamente em alguns minutos.', 429, 'AUTH_RATE_LIMIT');
    }

    const code = /already|registered|exists|email/i.test(message)
      ? 'USER_EMAIL_ALREADY_EXISTS'
      : 'AUTH_REGISTER_FAILED';
    const statusCode = code === 'USER_EMAIL_ALREADY_EXISTS' ? 409 : 400;

    throw new AppError(message, statusCode, code);
  }

  if (!createData.user) {
    throw new AppError('Nao foi possivel criar o usuario de autenticacao', 400, 'AUTH_USER_NOT_CREATED');
  }

  const authUser = createData.user;

  try {
    const onboarding = await onboardingService.createTenant(
      {
        plano_id: input.plano_id,
        tenant: {
          ...input.tenant,
          email: input.tenant.email || email,
          telefone: input.tenant.telefone || telefone || null
        },
        admin: {
          nome: input.nome,
          telefone
        },
        atua_como_profissional: input.atua_como_profissional,
        servicos_iniciais: input.servicos_iniciais || []
      },
      authUser,
      requestContext
    );

    console.info('Signing in newly registered user', { email, authUserId: authUser.id });

    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email,
      password: input.senha
    });

    if (sessionError || !sessionData.session) {
      throw new AppError('Usuario criado, mas nao foi possivel iniciar a sessao', 400, 'AUTH_SESSION_NOT_CREATED');
    }

    await eventLogsService.logEvent('user_registered', {
      tenantId: onboarding.tenant.id,
      usuarioId: onboarding.usuario.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      payload: {
        auth_user_id: authUser.id,
        email
      }
    });

    console.info('Register completed', {
      email,
      authUserId: authUser.id,
      tenantId: onboarding.tenant.id,
      usuarioId: onboarding.usuario.id
    });

    return {
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      expires_at: sessionData.session.expires_at || null,
      auth_user: sessionData.user || authUser,
      session: sessionData.session,
      onboarding,
      onboarding_required: false
    };
  } catch (provisioningError) {
    await rollbackAuthUser(authUser.id, 'register_provisioning_failed');

    throw provisioningError;
  }
}

async function login(input, requestContext = {}) {
  const email = normalizeEmail(input.email);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: input.senha
  });

  if (error) {
    await eventLogsService.logEvent('login_failed', {
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      payload: { email, reason: error.message }
    });

    throw unauthorized('Email ou senha invalidos');
  }

  if (!data.session?.access_token || !data.session?.refresh_token) {
    throw unauthorized('Sessao invalida');
  }

  const context = await getAuthenticatedUser(data.user);
  await usuariosRepository.update(context.usuario.id, { ultimo_login: new Date().toISOString() });

  return formatSessionResponse(data.session, data.user, context.usuario, context.tenant);
}

async function refreshToken(refreshTokenValue) {
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshTokenValue
  });

  if (error || !data.session || !data.user) {
    throw unauthorized('Refresh token invalido ou expirado');
  }

  const context = await getAuthenticatedUser(data.user);

  return formatSessionResponse(data.session, data.user, context.usuario, context.tenant);
}

async function logout(accessToken) {
  await validateToken(accessToken);

  const { error } = await supabaseAdmin.auth.admin.signOut(accessToken, 'global');

  if (error) {
    throw new AppError(error.message, 400, 'AUTH_LOGOUT_FAILED');
  }

  return { success: true };
}

async function getMe(authUser) {
  const context = await getAuthenticatedUser(authUser);

  return {
    auth_user: sanitizeAuthUser(context.auth_user),
    usuario: {
      id: context.usuario.id,
      tenant_id: context.usuario.tenant_id,
      nome: context.usuario.nome,
      email: context.usuario.email,
      telefone: context.usuario.telefone,
      tipo_usuario: context.usuario.tipo_usuario,
      foto_url: context.usuario.foto_url
    },
    tenant: {
      id: context.tenant.id,
      nome_fantasia: context.tenant.nome_fantasia,
      slug: context.tenant.slug,
      status: context.tenant.status,
      plano_id: context.tenant.plano_id,
      timezone: context.tenant.timezone
    },
    tenant_id: context.tenant_id,
    tipo_usuario: context.tipo_usuario
  };
}

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  validateToken,
  getAuthenticatedUser,
  getMe
};
