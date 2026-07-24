const teamRepository = require('./team.repository');
const usuariosService = require('../usuarios/usuarios.service');
const usuariosRepository = require('../usuarios/usuarios.repository');
const membershipsRepository = require('../memberships/memberships.repository');
const eventLogsService = require('../event-logs/eventLogs.service');
const { AppError, notFound } = require('../../utils/errors');
const {
  TEAM_OWNER_ROLES,
  TEAM_SERVICE_PROVIDER_ROLES,
  normalizeTeamProfessionalRole,
  canExecuteServices
} = require('../../constants/team-professional-roles');
const {
  getCargoCategoriesForTeamRole,
  getCategoryForCargoName,
  canTeamRoleUseCargoCategory
} = require('../../constants/team-professional-cargos');
const {
  getAdministrativePermissionsForCargo
} = require('../../constants/team-administrative-permissions');
const {
  isValidServiceCategory,
  normalizeServiceCategory
} = require('../../constants/service-categories');

const PROVIDER_ROLES = new Set(TEAM_SERVICE_PROVIDER_ROLES);
const OWNER_ROLES = new Set(TEAM_OWNER_ROLES);

function sanitizeRole(role) {
  if (!role) return null;
  const category = role.categoria_profissional || getCategoryForCargoName(role.nome);

  return {
    id: role.id,
    nome: role.nome,
    descricao: role.descricao,
    categoria_profissional: category,
    ativo: role.ativo !== false
  };
}

function sanitizeSpecialty(specialty) {
  if (!specialty) return null;

  return {
    id: specialty.id,
    cargo_id: specialty.cargo_id,
    nome: specialty.nome,
    descricao: specialty.descricao,
    ativo: specialty.tenant_ativo !== undefined ? specialty.tenant_ativo !== false : specialty.ativo !== false,
    catalogo_ativo: specialty.ativo !== false,
    tenant_ativo: specialty.tenant_ativo !== undefined ? specialty.tenant_ativo !== false : true,
    taxonomy_category_key: normalizeServiceCategory(specialty.taxonomy_category_key),
    tenant_id: specialty.tenant_id || null,
    is_official: specialty.is_official !== false,
    is_custom: specialty.is_custom === true,
    cargo: sanitizeRole(specialty.cargo)
  };
}

function resolveDisplayedTeamRole(professional, ownerMembership = null) {
  if (
    ownerMembership?.usuario_id
    && professional.usuario_id === ownerMembership.usuario_id
    && ownerMembership.is_owner === true
  ) {
    return normalizeTeamProfessionalRole(ownerMembership.role);
  }

  return normalizeTeamProfessionalRole(professional.metadata?.tipo_usuario || professional.tipo_usuario);
}

function sanitize(professional, ownerMembership = null) {
  const role = sanitizeRole(professional.cargo_ref);
  const specialties = (professional.profissional_especialidades || [])
    .filter((item) => item && !item.deleted_at && item.especialidade)
    .map((item) => sanitizeSpecialty(item.especialidade));
  const services = (professional.profissional_servicos || [])
    .filter((item) => item && !item.deleted_at && item.ativo !== false && item.servico && item.servico.ativo !== false)
    .map((item) => item.servico);
  const metadata = professional.metadata || {};
  const displayedTeamRole = resolveDisplayedTeamRole(professional, ownerMembership);
  const isOwnerProfessional = Boolean(
    ownerMembership?.usuario_id
    && ownerMembership.usuario_id === professional.usuario_id
    && ownerMembership.is_owner === true
  );
  const vinculoTipo = isOwnerProfessional
    ? 'owner'
    : metadata.vinculo_tipo || null;

  return {
    id: professional.id,
    tenant_id: professional.tenant_id,
    usuario_id: professional.usuario_id,
    nome_publico: professional.nome_publico,
    cargo_id: professional.cargo_id,
    cargo: role?.nome || professional.cargo,
    cargo_ref: role,
    especialidade: specialties.map((specialty) => specialty.nome).join(', ') || professional.especialidade,
    especialidades: specialties,
    especialidade_ids: specialties.map((specialty) => specialty.id),
    servicos: services,
    servico_ids: services.map((service) => service.id),
    tipo_usuario: displayedTeamRole,
    vinculo_tipo: vinculoTipo,
    possui_acesso: Boolean(professional.usuario_id),
    permissoes_sugeridas: displayedTeamRole === 'Profissional Adm'
      ? getAdministrativePermissionsForCargo(role?.nome || professional.cargo)
      : [],
    percentual_comissao: Number(professional.percentual_comissao || 0),
    aceita_agendamento_online: professional.aceita_agendamento_online !== false,
    instagram: professional.instagram,
    bio: professional.bio,
    ativo: professional.ativo !== false,
    ordem_exibicao: professional.ordem_exibicao || 0,
    created_at: professional.created_at
  };
}

function resolveVinculoTipo(role) {
  const normalizedRole = normalizeTeamProfessionalRole(role);
  if (OWNER_ROLES.has(normalizedRole)) return 'owner';
  if (normalizedRole === 'Terceiro') return 'partner';
  if (normalizedRole === 'Cliente') return 'client';
  return 'staff';
}

async function ensureRole(cargoId) {
  const role = await teamRepository.findRoleById(cargoId);

  if (!role) {
    throw notFound('Cargo nao encontrado.');
  }

  return role;
}

function ensureRoleCompatibleWithTeamRole(role, membershipRole) {
  const normalizedRole = normalizeTeamProfessionalRole(membershipRole);
  const category = role?.categoria_profissional || getCategoryForCargoName(role?.nome);

  if (!canTeamRoleUseCargoCategory(normalizedRole, category)) {
    throw new AppError('Cargo incompativel com o tipo profissional selecionado.', 422, 'INCOMPATIBLE_PROFESSIONAL_CARGO', {
      tipo_usuario: normalizedRole,
      cargo_id: role?.id,
      categoria_profissional: category
    });
  }
}

async function ensureCompatibleSpecialties(tenantId, cargoId, specialtyIds = []) {
  const uniqueIds = [...new Set(specialtyIds.filter(Boolean))];
  const specialties = await teamRepository.listSpecialtiesByIds(uniqueIds, tenantId);

  if (specialties.length !== uniqueIds.length) {
    throw new AppError('Uma ou mais especialidades sao invalidas.', 422, 'INVALID_SPECIALTY');
  }

  const incompatible = specialties.find((specialty) => specialty.cargo_id !== cargoId);

  if (incompatible) {
    throw new AppError('Especialidade incompativel com o cargo selecionado.', 422, 'INCOMPATIBLE_SPECIALTY', {
      especialidade_id: incompatible.id,
      cargo_id: cargoId
    });
  }

  const statuses = tenantId ? await teamRepository.listTenantSpecialtyStatuses(tenantId) : [];
  const inactiveIds = new Set(statuses
    .filter((item) => item.ativo === false)
    .map((item) => item.especialidade_id));
  const inactive = uniqueIds.find((id) => inactiveIds.has(id));

  if (inactive) {
    throw new AppError('Especialidade inativa para este salao.', 422, 'INACTIVE_TENANT_SPECIALTY', {
      especialidade_id: inactive
    });
  }

  return uniqueIds;
}

async function ensureCompatibleServices(tenantId, serviceIds = []) {
  const uniqueIds = [...new Set(serviceIds.filter(Boolean))];
  const services = await teamRepository.listServicesByIds(tenantId, uniqueIds);

  if (services.length !== uniqueIds.length) {
    throw new AppError('Um ou mais servicos sao invalidos.', 422, 'INVALID_SERVICE');
  }

  return uniqueIds;
}

function validateOperationalLinks(input) {
  const role = normalizeTeamProfessionalRole(input.tipo_usuario);

  if (!canExecuteServices(role)) {
    if (input.aceita_agendamento_online === true) {
      throw new AppError('Profissional Adm nao pode aceitar agendamento online.', 422, 'ADMIN_PROFESSIONAL_CANNOT_BOOK');
    }

    if (input.servico_ids?.length) {
      throw new AppError('Profissional Adm nao pode ser vinculado a servicos.', 422, 'ADMIN_PROFESSIONAL_CANNOT_HAVE_SERVICES');
    }

    return;
  }

  if (role === 'Autonomo' && !input.servico_ids?.length) {
    throw new AppError('Autonomo deve estar vinculado a ao menos um servico.', 422, 'AUTONOMOUS_SERVICES_REQUIRED');
  }

  if (!PROVIDER_ROLES.has(role) || input.aceita_agendamento_online === false) {
    return;
  }

  if (!input.servico_ids?.length) {
    throw new AppError('Profissionais com agenda online devem estar vinculados a ao menos um servico.', 422, 'PROFESSIONAL_SERVICES_REQUIRED');
  }
}

function buildProfessionalPayload(input, role) {
  const payload = {};

  if (input.nome_publico !== undefined) payload.nome_publico = input.nome_publico;
  if (input.cargo_id !== undefined) {
    payload.cargo_id = input.cargo_id;
    payload.cargo = role?.nome || null;
  }
  if (input.percentual_comissao !== undefined) payload.percentual_comissao = input.percentual_comissao || 0;
  if (input.ativo !== undefined) payload.ativo = input.ativo !== false;
  if (input.aceita_agendamento_online !== undefined) {
    payload.aceita_agendamento_online = input.aceita_agendamento_online !== false;
  }
  if (input.instagram !== undefined) payload.instagram = input.instagram || null;
  if (input.bio !== undefined) payload.bio = input.bio || null;

  return payload;
}

async function list(tenantId) {
  const [rows, ownerMembership] = await Promise.all([
    teamRepository.listByTenant(tenantId),
    membershipsRepository.findOwnerByTenant(tenantId)
  ]);
  return rows.map((professional) => sanitize(professional, ownerMembership));
}

async function getById(tenantId, id) {
  const [professional, ownerMembership] = await Promise.all([
    teamRepository.findById(tenantId, id),
    membershipsRepository.findOwnerByTenant(tenantId)
  ]);
  if (!professional) {
    throw notFound('Profissional nao encontrado.');
  }

  return sanitize(professional, ownerMembership);
}

async function listRoles(tenantId, tipoUsuario, options = {}) {
  const normalizedRole = tipoUsuario ? normalizeTeamProfessionalRole(tipoUsuario) : null;
  const allowedCategories = normalizedRole ? getCargoCategoriesForTeamRole(normalizedRole) : null;
  const rows = await teamRepository.listRoles();
  const roles = rows.map(sanitizeRole);
  const categoryFilteredRoles = allowedCategories
    ? roles.filter((role) => allowedCategories.includes(role.categoria_profissional))
    : roles;

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[team:cargos]', {
      tenant_id: tenantId,
      tipo_usuario: normalizedRole,
      contextual: Boolean(options.contextual),
      encontrados_no_banco: rows.length,
      retornados_pela_api: categoryFilteredRoles.length,
      cargos: categoryFilteredRoles.map((role) => role.nome)
    });
  }

  return categoryFilteredRoles;
}

async function createRole(input) {
  try {
    const role = await teamRepository.createRole({
      nome: input.nome,
      descricao: input.descricao || null,
      categoria_profissional: input.categoria_profissional || 'operacional',
      ativo: input.ativo !== false
    });

    return sanitizeRole(role);
  } catch (error) {
    if (error.code === '23505') {
      throw new AppError('Ja existe um cargo com esse nome.', 409, 'ROLE_ALREADY_EXISTS');
    }

    throw error;
  }
}

async function updateRole(id, input) {
  const current = await ensureRole(id);
  const payload = {};

  for (const key of ['nome', 'descricao', 'categoria_profissional', 'ativo']) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      payload[key] = input[key];
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'descricao')) {
    payload.descricao = payload.descricao || null;
  }

  if (!Object.keys(payload).length) {
    return sanitizeRole(current);
  }

  try {
    return sanitizeRole(await teamRepository.updateRole(id, payload));
  } catch (error) {
    if (error.code === '23505') {
      throw new AppError('Ja existe um cargo com esse nome.', 409, 'ROLE_ALREADY_EXISTS');
    }

    throw error;
  }
}

async function removeRole(id) {
  await ensureRole(id);
  return sanitizeRole(await teamRepository.removeRole(id));
}

async function listSpecialties(cargoId, tenantId = null) {
  if (cargoId) {
    await ensureRole(cargoId);
  }

  const rows = await teamRepository.listSpecialties({ cargoId, tenantId });
  if (!tenantId) {
    return rows.map(sanitizeSpecialty);
  }

  const statuses = await teamRepository.listTenantSpecialtyStatuses(tenantId);
  const statusBySpecialty = new Map(statuses.map((item) => [item.especialidade_id, item.ativo !== false]));

  return rows.map((specialty) => sanitizeSpecialty({
    ...specialty,
    tenant_ativo: statusBySpecialty.has(specialty.id) ? statusBySpecialty.get(specialty.id) : true
  }));
}

async function updateSpecialtyStatus(tenantId, specialtyId, input) {
  const specialties = await teamRepository.listSpecialtiesByIds([specialtyId], tenantId);
  if (!specialties.length) {
    throw notFound('Especialidade nao encontrada.');
  }

  await teamRepository.upsertTenantSpecialtyStatus(tenantId, specialtyId, input.ativo !== false);
  return (await listSpecialties(null, tenantId)).find((specialty) => specialty.id === specialtyId);
}

async function createSpecialty(tenantId, input) {
  const role = await ensureRole(input.cargo_id);
  const categoryKey = normalizeServiceCategory(input.taxonomy_category_key);

  if (!isValidServiceCategory(categoryKey)) {
    throw new AppError('Categoria oficial obrigatoria para criar especialidade customizada.', 422, 'SPECIALTY_CATEGORY_REQUIRED');
  }

  if ((role.categoria_profissional || getCategoryForCargoName(role.nome)) !== 'operacional') {
    throw new AppError('Especialidades customizadas devem ser vinculadas a cargos operacionais.', 422, 'INCOMPATIBLE_SPECIALTY');
  }

  try {
    const specialty = await teamRepository.createSpecialty({
      tenant_id: tenantId,
      cargo_id: input.cargo_id,
      nome: input.nome,
      taxonomy_category_key: categoryKey,
      is_official: false,
      is_custom: true,
      created_by_tenant: tenantId,
      descricao: input.descricao || null,
      ativo: input.ativo !== false,
      metadata: {
        origem: 'tenant_custom_specialty'
      }
    });

    return sanitizeSpecialty(specialty);
  } catch (error) {
    if (error.code === '23505') {
      throw new AppError('Ja existe uma especialidade com esse nome para o cargo.', 409, 'SPECIALTY_ALREADY_EXISTS');
    }

    throw error;
  }
}

async function updateSpecialty(tenantId, id, input) {
  const current = await teamRepository.listSpecialtiesByIds([id], tenantId);
  if (!current.length) {
    throw notFound('Especialidade nao encontrada.');
  }

  if (!current[0].tenant_id || current[0].is_official !== false) {
    throw new AppError('Especialidades oficiais nao podem ser alteradas pelo salao.', 403, 'FORBIDDEN');
  }

  if (input.cargo_id) {
    const role = await ensureRole(input.cargo_id);
    if ((role.categoria_profissional || getCategoryForCargoName(role.nome)) !== 'operacional') {
      throw new AppError('Especialidades customizadas devem ser vinculadas a cargos operacionais.', 422, 'INCOMPATIBLE_SPECIALTY');
    }
  }

  const payload = {};
  for (const key of ['cargo_id', 'nome', 'descricao', 'ativo', 'taxonomy_category_key']) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      payload[key] = input[key];
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'taxonomy_category_key')) {
    payload.taxonomy_category_key = normalizeServiceCategory(payload.taxonomy_category_key);
    if (!isValidServiceCategory(payload.taxonomy_category_key)) {
      throw new AppError('Categoria oficial obrigatoria para especialidade customizada.', 422, 'SPECIALTY_CATEGORY_REQUIRED');
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'descricao')) {
    payload.descricao = payload.descricao || null;
  }

  try {
    return sanitizeSpecialty(await teamRepository.updateSpecialty(id, payload, tenantId));
  } catch (error) {
    if (error.code === '23505') {
      throw new AppError('Ja existe uma especialidade com esse nome para o cargo.', 409, 'SPECIALTY_ALREADY_EXISTS');
    }

    throw error;
  }
}

async function removeSpecialty(tenantId, id) {
  const current = await teamRepository.listSpecialtiesByIds([id], tenantId);
  if (!current.length) {
    throw notFound('Especialidade nao encontrada.');
  }

  if (!current[0].tenant_id || current[0].is_official !== false) {
    throw new AppError('Especialidades oficiais nao podem ser removidas pelo salao.', 403, 'FORBIDDEN');
  }

  return sanitizeSpecialty(await teamRepository.removeSpecialty(id, tenantId));
}

function hasAdditionalProfessional(professionals, ownerMembership) {
  if (!ownerMembership?.usuario_id) return professionals.length > 1;

  return professionals.some((professional) => (
    professional.usuario_id !== ownerMembership.usuario_id
    && professional.ativo !== false
    && !professional.deleted_at
  ));
}

async function promoteAutonomoOwnerIfTeamStarted(tenantId) {
  const ownerMembership = await membershipsRepository.findOwnerByTenant(tenantId);

  if (!ownerMembership || ownerMembership.role !== 'Autonomo') {
    return null;
  }

  const professionals = await teamRepository.listByTenant(tenantId);

  if (!hasAdditionalProfessional(professionals, ownerMembership)) {
    return null;
  }

  const previousRole = ownerMembership.role;
  const nextRole = 'Administrador';
  const promotedAt = new Date().toISOString();

  const updatedMembership = await membershipsRepository.update(ownerMembership.id, {
    role: nextRole,
    metadata: {
      ...(ownerMembership.metadata || {}),
      promoted_from: previousRole,
      promoted_to: nextRole,
      promoted_at: promotedAt,
      promotion_reason: 'Promocao automatica apos criacao de equipe'
    }
  });

  if (ownerMembership.usuario_id) {
    await usuariosRepository.update(ownerMembership.usuario_id, {
      tipo_usuario: nextRole
    });

    const ownerProfessional = professionals.find((professional) => (
      professional.usuario_id === ownerMembership.usuario_id
      && professional.ativo !== false
      && !professional.deleted_at
    ));

    if (ownerProfessional) {
      await teamRepository.update(tenantId, ownerProfessional.id, {
        metadata: {
          ...(ownerProfessional.metadata || {}),
          tipo_usuario: nextRole,
          vinculo_tipo: 'owner',
          promoted_from: previousRole,
          promoted_to: nextRole,
          promoted_at: promotedAt
        }
      });
    }
  }

  await eventLogsService.logEvent('operational_role_auto_promoted', {
    tenantId,
    usuarioId: ownerMembership.usuario_id,
    payload: {
      perfil_anterior: previousRole,
      perfil_novo: nextRole,
      motivo: 'Promocao automatica apos criacao de equipe',
      membership_id: ownerMembership.id,
      profissionais_ativos: professionals.length,
      promoted_at: promotedAt
    }
  });

  return updatedMembership;
}

async function create(tenantId, usuarioId, input) {
  const professionals = await teamRepository.listByTenant(tenantId);
  const role = await ensureRole(input.cargo_id);
  const membershipRole = normalizeTeamProfessionalRole(input.tipo_usuario);

  if (OWNER_ROLES.has(membershipRole)) {
    throw new AppError('Administrador e Autonomo sao papeis do usuario principal do salao.', 422, 'OWNER_ROLE_NOT_ALLOWED_FOR_TEAM_MEMBER');
  }

  const shouldCreateAccess = canExecuteServices(membershipRole) || Boolean(input.criar_acesso);
  ensureRoleCompatibleWithTeamRole(role, membershipRole);

  const specialtyIds = canExecuteServices(membershipRole)
    ? await ensureCompatibleSpecialties(tenantId, input.cargo_id, input.especialidade_ids)
    : [];
  const serviceIds = canExecuteServices(membershipRole)
    ? await ensureCompatibleServices(tenantId, input.servico_ids)
    : [];
  const vinculoTipo = resolveVinculoTipo(membershipRole);

  validateOperationalLinks(input);

  const professional = await teamRepository.create(tenantId, {
    ...buildProfessionalPayload(input, role),
    especialidade: null,
    aceita_agendamento_online: canExecuteServices(membershipRole) && input.aceita_agendamento_online !== false,
    ordem_exibicao: professionals.length,
    metadata: {
      origem: 'dashboard_team',
      tipo_usuario: membershipRole,
      vinculo_tipo: vinculoTipo,
      usuario_criado: shouldCreateAccess
    }
  });

  await teamRepository.replaceSpecialties(tenantId, professional.id, specialtyIds);
  await teamRepository.replaceServices(tenantId, professional.id, serviceIds, {
    percentual_comissao: input.percentual_comissao || null
  });

  if (shouldCreateAccess) {
    try {
      const usuario = await usuariosService.createTenantUser(tenantId, usuarioId, {
        nome: input.nome_publico,
        email: input.email,
        telefone: input.telefone,
        senha_temporaria: input.senha_temporaria,
        tipo_usuario: membershipRole,
        profissional_id: professional.id,
        vinculo_tipo: vinculoTipo,
        metadata: {
          origem_operacional: 'team_professional_create',
          team_professional_role: membershipRole
        }
      });

      await teamRepository.update(tenantId, professional.id, { usuario_id: usuario.id });
    } catch (error) {
      await teamRepository.hardDelete(tenantId, professional.id).catch((rollbackError) => {
        console.error('Failed to rollback professional after access error', rollbackError);
      });
      throw error;
    }
  }

  await promoteAutonomoOwnerIfTeamStarted(tenantId);

  return sanitize(await teamRepository.findById(tenantId, professional.id));
}

async function update(tenantId, id, input) {
  const current = await teamRepository.findById(tenantId, id);

  if (!current) {
    throw notFound('Profissional nao encontrado.');
  }

  const cargoId = input.cargo_id || current.cargo_id;
  const role = input.cargo_id ? await ensureRole(input.cargo_id) : current.cargo_ref;
  const membershipRole = input.tipo_usuario !== undefined
    ? normalizeTeamProfessionalRole(input.tipo_usuario)
    : normalizeTeamProfessionalRole(current.metadata?.tipo_usuario);
  const currentMetadata = current.metadata || {};
  const isOwnerProfessional = currentMetadata.vinculo_tipo === 'owner';

  if (OWNER_ROLES.has(membershipRole) && !isOwnerProfessional) {
    throw new AppError('Administrador e Autonomo so podem ser usados no profissional principal do salao.', 422, 'OWNER_ROLE_ONLY_FOR_OWNER_PROFESSIONAL');
  }

  if (!OWNER_ROLES.has(membershipRole) && isOwnerProfessional) {
    throw new AppError('O profissional principal deve permanecer como Administrador ou Autonomo.', 422, 'OWNER_PROFESSIONAL_ROLE_REQUIRED');
  }

  const shouldCreateAccess = Boolean(input.criar_acesso) && !current.usuario_id;
  const payload = buildProfessionalPayload(input, role);
  ensureRoleCompatibleWithTeamRole(role, membershipRole);

  if (shouldCreateAccess && (!input.email || !input.senha_temporaria)) {
    throw new AppError('Informe email e senha temporaria para criar acesso ao sistema.', 422, 'TEAM_ACCESS_CREDENTIALS_REQUIRED');
  }

  if (input.tipo_usuario !== undefined) {
    payload.metadata = {
      ...(current.metadata || {}),
      tipo_usuario: membershipRole,
      vinculo_tipo: resolveVinculoTipo(membershipRole)
    };
  }

  if (!canExecuteServices(membershipRole)) {
    if (input.aceita_agendamento_online === true) {
      throw new AppError('Profissional Adm nao pode aceitar agendamento online.', 422, 'ADMIN_PROFESSIONAL_CANNOT_BOOK');
    }

    payload.aceita_agendamento_online = false;
  }

  const currentSpecialtyIds = (current.profissional_especialidades || [])
    .filter((item) => item && !item.deleted_at && item.ativo !== false && item.especialidade_id)
    .map((item) => item.especialidade_id);
  const currentServiceIds = (current.profissional_servicos || [])
    .filter((item) => item && !item.deleted_at && item.ativo !== false && item.servico_id)
    .map((item) => item.servico_id);
  const replacesSpecialties = input.especialidade_ids !== undefined
    || input.cargo_id !== undefined
    || !canExecuteServices(membershipRole);
  const replacesServices = input.servico_ids !== undefined
    || !canExecuteServices(membershipRole);
  const requestedSpecialtyIds = canExecuteServices(membershipRole)
    ? (
      input.especialidade_ids !== undefined
        ? input.especialidade_ids
        : (input.cargo_id !== undefined ? [] : currentSpecialtyIds)
    )
    : [];
  const specialtyIds = replacesSpecialties
    ? await ensureCompatibleSpecialties(tenantId, cargoId, requestedSpecialtyIds)
    : currentSpecialtyIds;
  const requestedServiceIds = canExecuteServices(membershipRole)
    ? (input.servico_ids !== undefined ? input.servico_ids : currentServiceIds)
    : [];

  if (!canExecuteServices(membershipRole) && input.servico_ids?.length) {
    throw new AppError('Profissional Adm nao pode ser vinculado a servicos.', 422, 'ADMIN_PROFESSIONAL_CANNOT_HAVE_SERVICES');
  }

  if (replacesSpecialties) {
    payload.especialidade = null;
  }

  const serviceIds = replacesServices
    ? await ensureCompatibleServices(tenantId, requestedServiceIds)
    : currentServiceIds;

  validateOperationalLinks({
    tipo_usuario: membershipRole,
    aceita_agendamento_online: input.aceita_agendamento_online !== undefined
      ? input.aceita_agendamento_online
      : current.aceita_agendamento_online,
    especialidade_ids: specialtyIds,
    servico_ids: serviceIds
  });

  if (replacesSpecialties || replacesServices) {
    await teamRepository.updateWithOperationalLinks(
      tenantId,
      id,
      payload,
      specialtyIds,
      serviceIds,
      {
        replaceSpecialties: replacesSpecialties,
        replaceServices: replacesServices,
        percentualComissao: input.percentual_comissao ?? current.percentual_comissao
      }
    );
  } else if (Object.keys(payload).length) {
    await teamRepository.update(tenantId, id, payload);
  }

  if (shouldCreateAccess) {
    const vinculoTipo = resolveVinculoTipo(membershipRole);
    const usuario = await usuariosService.createTenantUser(tenantId, null, {
      nome: input.nome_publico || current.nome_publico,
      email: input.email,
      telefone: input.telefone,
      senha_temporaria: input.senha_temporaria,
      tipo_usuario: membershipRole,
      profissional_id: id,
      vinculo_tipo: vinculoTipo,
      metadata: {
        origem_operacional: 'team_professional_maintenance',
        team_professional_role: membershipRole
      }
    });

    await teamRepository.update(tenantId, id, {
      usuario_id: usuario.id,
      metadata: {
        ...(current.metadata || {}),
        ...(payload.metadata || {}),
        usuario_criado: true,
        tipo_usuario: membershipRole,
        vinculo_tipo: vinculoTipo
      }
    });
  }

  return sanitize(await teamRepository.findById(tenantId, id));
}

async function remove(tenantId, id) {
  const current = await teamRepository.findById(tenantId, id);

  if (!current) {
    throw notFound('Profissional nao encontrado.');
  }

  await teamRepository.replaceSpecialties(tenantId, id, []);
  await teamRepository.replaceServices(tenantId, id, []);
  await teamRepository.remove(tenantId, id);

  return { id, removed: true };
}

module.exports = {
  list,
  getById,
  listRoles,
  createRole,
  updateRole,
  removeRole,
  listSpecialties,
  updateSpecialtyStatus,
  createSpecialty,
  updateSpecialty,
  removeSpecialty,
  create,
  update,
  remove
};
