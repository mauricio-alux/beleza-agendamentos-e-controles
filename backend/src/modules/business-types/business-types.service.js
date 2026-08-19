const repository = require('./business-types.repository');
const eventLogsService = require('../event-logs/eventLogs.service');
const tenantServiceCatalogSync = require('../services/tenant-service-catalog-sync.service');
const { AppError, forbidden, notFound } = require('../../utils/errors');

function ensurePlatform(context) {
  if (context?.role !== 'MasterAdmin' && context?.usuario?.tipo_usuario !== 'MasterAdmin') {
    throw forbidden('Apenas MasterAdmin pode manter tipos de negocio globais.');
  }
}

function sanitizeType(row) {
  const services = row.tipo_negocio_servicos_catalogo || [];
  const tenants = row.tenant_tipos_negocio || [];
  return {
    id: row.id,
    nome: row.nome,
    slug: row.slug,
    descricao: row.descricao,
    icone: row.icone,
    ativo: row.ativo !== false,
    ordem_exibicao: row.ordem_exibicao || 0,
    criado_em: row.criado_em,
    atualizado_em: row.atualizado_em,
    metrics: {
      servicos_associados: services.filter((item) => item.ativo !== false).length,
      servicos_recomendados: services.filter((item) => item.ativo !== false && item.recomendado === true).length,
      tenants_associados: tenants.filter((item) => item.ativo !== false).length
    }
  };
}

function sanitizeAssociation(row) {
  return {
    id: row.id,
    tipo_negocio_id: row.tipo_negocio_id,
    servico_catalogo_id: row.servico_catalogo_id,
    recomendado: row.recomendado === true,
    ativo: row.ativo !== false,
    ordem_exibicao: row.ordem_exibicao || 0,
    servico_catalogo: row.servico_catalogo || null
  };
}

function sanitizeCatalog(row) {
  return {
    id: row.id,
    codigo_canonico: row.codigo_canonico,
    nome: row.nome,
    categoria_key: row.categoria_key,
    categoria: row.categoria_key,
    descricao: row.descricao || null,
    natureza: row.natureza,
    ativo: row.ativo !== false,
    metadata: row.metadata || {}
  };
}

function sanitizeRole(row) {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao || null,
    categoria_profissional: row.categoria_profissional || 'operacional',
    ativo: row.ativo !== false,
    metrics: {
      especialidades: row.especialidades_count || 0
    }
  };
}

function sanitizeSpecialty(row) {
  return {
    id: row.id,
    cargo_id: row.cargo_id,
    nome: row.nome,
    descricao: row.descricao || null,
    ativo: row.ativo !== false,
    tenant_id: row.tenant_id || null,
    taxonomy_category_key: row.taxonomy_category_key || null,
    is_official: row.is_official !== false,
    is_custom: row.is_custom === true,
    cargo: row.cargo ? sanitizeRole(row.cargo) : null
  };
}

function catalogCodeFromName(nome) {
  return String(nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function sanitizeTenantType(row) {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    tipo_negocio_id: row.tipo_negocio_id,
    principal: row.principal === true,
    ativo: row.ativo !== false,
    descricao_tipo_negocio: row.descricao_tipo_negocio || null,
    tipo_negocio: row.tipo_negocio ? sanitizeType(row.tipo_negocio) : null
  };
}

async function listActiveTypes() {
  return (await repository.listTypes({ includeInactive: false })).map(sanitizeType);
}

async function listAdminTypes(context, filters = {}) {
  ensurePlatform(context);
  return (await repository.listTypes({
    includeInactive: filters.status !== 'ativos',
    search: filters.search || ''
  })).map(sanitizeType);
}

async function getAdminType(context, id) {
  ensurePlatform(context);
  const type = await repository.findTypeById(id);
  if (!type) throw notFound('Tipo de negocio nao encontrado.');
  const services = await repository.listTypeServices(id);
  return {
    ...sanitizeType(type),
    servicos: services.map(sanitizeAssociation)
  };
}

async function createAdminType(context, input) {
  ensurePlatform(context);
  const existing = await repository.findTypeBySlug(input.slug);
  if (existing) {
    throw new AppError('Slug de tipo de negocio ja existe.', 409, 'BUSINESS_TYPE_SLUG_EXISTS');
  }
  const created = await repository.createType({
    ...input,
    criado_por: context.userId || context.usuario?.id || null,
    atualizado_por: context.userId || context.usuario?.id || null
  });
  await eventLogsService.logEvent('business_type_created', {
    usuarioId: context.userId || context.usuario?.id,
    payload: { tipo_negocio_id: created.id, slug: created.slug }
  }).catch(() => null);
  return sanitizeType(created);
}

async function updateAdminType(context, id, input) {
  ensurePlatform(context);
  const current = await repository.findTypeById(id);
  if (!current) throw notFound('Tipo de negocio nao encontrado.');
  if (input.slug && input.slug !== current.slug) {
    const existing = await repository.findTypeBySlug(input.slug);
    if (existing && existing.id !== id) {
      throw new AppError('Slug de tipo de negocio ja existe.', 409, 'BUSINESS_TYPE_SLUG_EXISTS');
    }
  }
  const updated = await repository.updateType(id, {
    ...input,
    atualizado_por: context.userId || context.usuario?.id || null
  });
  if (Object.prototype.hasOwnProperty.call(input, 'ativo')) {
    await tenantServiceCatalogSync.syncTenantsByTypeIds([id], {
      reason: input.ativo === false ? 'business_type_deactivated' : 'business_type_activated'
    });
  }
  await eventLogsService.logEvent('business_type_updated', {
    usuarioId: context.userId || context.usuario?.id,
    payload: { tipo_negocio_id: id, before: current, after: updated }
  }).catch(() => null);
  return sanitizeType(updated);
}

async function updateAdminStatus(context, id, input) {
  return updateAdminType(context, id, { ativo: input.ativo });
}

async function listAdminTypeServices(context, id) {
  ensurePlatform(context);
  const type = await repository.findTypeById(id);
  if (!type) throw notFound('Tipo de negocio nao encontrado.');
  return (await repository.listTypeServices(id)).map(sanitizeAssociation);
}

async function listAdminCatalog(context) {
  ensurePlatform(context);
  return (await repository.listAllCatalog({ includeInactive: true })).map(sanitizeCatalog);
}

async function createAdminCatalog(context, input) {
  ensurePlatform(context);
  const created = await repository.createCatalog({
    ...input,
    codigo_canonico: input.codigo_canonico || catalogCodeFromName(input.nome),
    ativo: input.ativo !== false,
    metadata: {
      ...(input.metadata || {}),
      origem: 'masteradmin_governance'
    }
  });
  return sanitizeCatalog(created);
}

async function updateAdminCatalog(context, id, input) {
  ensurePlatform(context);
  const updated = await repository.updateCatalog(id, input);
  if (Object.prototype.hasOwnProperty.call(input, 'ativo')) {
    await tenantServiceCatalogSync.syncAllTenants({
      reason: input.ativo === false ? 'service_catalog_deactivated' : 'service_catalog_activated'
    });
  }
  return sanitizeCatalog(updated);
}

async function listAdminSpecialties(context) {
  ensurePlatform(context);
  return repository.listSpecialties();
}

async function listAdminRoles(context) {
  ensurePlatform(context);
  const [roles, specialties] = await Promise.all([
    repository.listRoles({ includeInactive: true }),
    repository.listAdminSpecialties({ includeInactive: true })
  ]);
  const countByRoleId = specialties.reduce((acc, specialty) => {
    if (specialty.ativo !== false) {
      acc.set(specialty.cargo_id, (acc.get(specialty.cargo_id) || 0) + 1);
    }
    return acc;
  }, new Map());
  return roles.map((role) => sanitizeRole({
    ...role,
    especialidades_count: countByRoleId.get(role.id) || 0
  }));
}

async function createAdminRole(context, input) {
  ensurePlatform(context);
  const created = await repository.createRole({
    nome: input.nome,
    descricao: input.descricao || null,
    categoria_profissional: input.categoria_profissional || 'operacional',
    ativo: input.ativo !== false
  });
  await eventLogsService.logEvent('taxonomy_role_created', {
    usuarioId: context.userId || context.usuario?.id,
    payload: { cargo_id: created.id, nome: created.nome }
  }).catch(() => null);
  return sanitizeRole(created);
}

async function updateAdminRole(context, id, input) {
  ensurePlatform(context);
  const current = await repository.findRoleById(id);
  if (!current) throw notFound('Cargo nao encontrado.');
  const payload = {};
  for (const key of ['nome', 'descricao', 'categoria_profissional', 'ativo']) {
    if (Object.prototype.hasOwnProperty.call(input, key)) payload[key] = input[key];
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'descricao')) payload.descricao = payload.descricao || null;
  const updated = Object.keys(payload).length ? await repository.updateRole(id, payload) : current;
  await eventLogsService.logEvent('taxonomy_role_updated', {
    usuarioId: context.userId || context.usuario?.id,
    payload: { cargo_id: id, before: current, after: updated }
  }).catch(() => null);
  return sanitizeRole(updated);
}

async function listAdminGlobalSpecialties(context) {
  ensurePlatform(context);
  return (await repository.listAdminSpecialties({ includeInactive: true })).map(sanitizeSpecialty);
}

async function createAdminSpecialty(context, input) {
  ensurePlatform(context);
  const role = await repository.findRoleById(input.cargo_id);
  if (!role || role.ativo === false) throw notFound('Cargo ativo nao encontrado.');
  const created = await repository.createSpecialty({
    cargo_id: input.cargo_id,
    nome: input.nome,
    descricao: input.descricao || null,
    taxonomy_category_key: input.taxonomy_category_key,
    tenant_id: null,
    is_official: true,
    is_custom: false,
    ativo: input.ativo !== false,
    metadata: { origem: 'masteradmin_governance' }
  });
  await eventLogsService.logEvent('taxonomy_specialty_created', {
    usuarioId: context.userId || context.usuario?.id,
    payload: { especialidade_id: created.id, cargo_id: created.cargo_id, nome: created.nome }
  }).catch(() => null);
  return sanitizeSpecialty(created);
}

async function updateAdminSpecialty(context, id, input) {
  ensurePlatform(context);
  const current = await repository.findSpecialtyById(id);
  if (!current) throw notFound('Especialidade global nao encontrada.');
  if (input.cargo_id) {
    const role = await repository.findRoleById(input.cargo_id);
    if (!role || role.ativo === false) throw notFound('Cargo ativo nao encontrado.');
  }
  const payload = {};
  for (const key of ['cargo_id', 'nome', 'descricao', 'taxonomy_category_key', 'ativo']) {
    if (Object.prototype.hasOwnProperty.call(input, key)) payload[key] = input[key];
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'descricao')) payload.descricao = payload.descricao || null;
  const updated = Object.keys(payload).length ? await repository.updateSpecialty(id, payload) : current;
  await eventLogsService.logEvent('taxonomy_specialty_updated', {
    usuarioId: context.userId || context.usuario?.id,
    payload: { especialidade_id: id, before: current, after: updated }
  }).catch(() => null);
  return sanitizeSpecialty(updated);
}

async function listAdminCatalogSpecialties(context, catalogId) {
  ensurePlatform(context);
  return repository.listCatalogSpecialties(catalogId);
}

async function replaceAdminCatalogSpecialties(context, catalogId, input) {
  ensurePlatform(context);
  const activeSpecialtyIds = new Set((await repository.listSpecialties()).map((item) => item.id));
  const invalid = (input.especialidade_ids || []).filter((id) => !activeSpecialtyIds.has(id));
  if (invalid.length) {
    throw new AppError('Especialidade inativa ou inexistente para compatibilidade global.', 422, 'CATALOG_SPECIALTY_NOT_SELECTABLE', {
      especialidade_ids: invalid
    });
  }
  const rows = await repository.replaceCatalogSpecialties(catalogId, [...new Set(input.especialidade_ids || [])]);
  await eventLogsService.logEvent('service_catalog_specialties_updated', {
    usuarioId: context.userId || context.usuario?.id,
    payload: { servico_catalogo_id: catalogId, total: rows.filter((item) => item.ativo !== false).length }
  }).catch(() => null);
  return rows;
}

async function replaceAdminTypeServices(context, id, input) {
  ensurePlatform(context);
  const type = await repository.findTypeById(id);
  if (!type) throw notFound('Tipo de negocio nao encontrado.');
  const activeCatalog = await repository.listAllCatalog();
  const activeCatalogIds = new Set(activeCatalog.map((item) => item.id));
  const invalidServices = (input.servicos || [])
    .map((item) => item.servico_catalogo_id)
    .filter((servicoCatalogoId) => !activeCatalogIds.has(servicoCatalogoId));
  if (invalidServices.length) {
    throw new AppError('Servico de catalogo inativo ou inexistente.', 422, 'BUSINESS_TYPE_SERVICE_NOT_SELECTABLE', {
      servico_catalogo_ids: [...new Set(invalidServices)]
    });
  }
  const services = await repository.replaceTypeServices(id, input.servicos || []);
  await tenantServiceCatalogSync.syncTenantsByTypeIds([id], {
    reason: 'business_type_services_updated'
  });
  await eventLogsService.logEvent('business_type_catalog_services_updated', {
    usuarioId: context.userId || context.usuario?.id,
    payload: { tipo_negocio_id: id, total: services.length }
  }).catch(() => null);
  return services.map(sanitizeAssociation);
}

async function listTenantTypes(tenantId) {
  return (await repository.listTenantTypes(tenantId)).map(sanitizeTenantType);
}

async function resolveTenantAllowedCatalog(tenantId) {
  const tenantTypes = await repository.listTenantTypes(tenantId);
  const byId = new Map();

  for (const row of tenantTypes) {
    if (!row.tipo_negocio || row.tipo_negocio.ativo === false) continue;
    const associations = await repository.listTypeServices(row.tipo_negocio_id);
    for (const association of associations) {
      if (association.ativo === false || association.servico_catalogo?.ativo === false) continue;
      addCatalogItem(byId, association.servico_catalogo, {
        recomendado: association.recomendado,
        tipo: {
          id: row.tipo_negocio.id,
          nome: row.tipo_negocio.nome,
          slug: row.tipo_negocio.slug,
          principal: row.principal === true
        }
      });
    }
  }

  return {
    tenantTypes,
    catalog: [...byId.values()]
  };
}

async function ensureCatalogAllowedForTenant(tenantId, servicoCatalogoId) {
  const { tenantTypes, catalog } = await resolveTenantAllowedCatalog(tenantId);
  if (!tenantTypes.length) {
    throw new AppError('Tenant sem tipo de negocio ativo. Defina um tipo antes de configurar servicos.', 422, 'TENANT_BUSINESS_TYPE_REQUIRED');
  }

  const allowed = catalog.find((item) => item.id === servicoCatalogoId);
  if (!allowed) {
    throw new AppError('O servico selecionado nao esta associado aos tipos de negocio ativos deste tenant.', 422, 'SERVICE_NOT_ALLOWED_FOR_TENANT', {
      servico_catalogo_id: servicoCatalogoId,
      tipo_negocio_ids: tenantTypes.map((item) => item.tipo_negocio_id)
    });
  }

  return allowed;
}

async function ensureTypeChangeHasNoOfferImpact(tenantId, desiredIds) {
  const currentRows = await repository.listTenantTypes(tenantId);
  const currentIds = currentRows.map((item) => item.tipo_negocio_id);
  const removedIds = currentIds.filter((id) => !desiredIds.includes(id));
  if (!removedIds.length) return [];

  const offers = await repository.listTenantActiveOffers(tenantId);
  if (!offers.length) return [];

  const remainingAllowedCatalogIds = new Set();
  for (const typeId of desiredIds) {
    const associations = await repository.listTypeServices(typeId);
    associations
      .filter((item) => item.ativo !== false && item.servico_catalogo?.ativo !== false)
      .forEach((item) => remainingAllowedCatalogIds.add(item.servico_catalogo_id));
  }

  const removedAllowedCatalogIds = new Set();
  for (const typeId of removedIds) {
    const associations = await repository.listTypeServices(typeId);
    associations
      .filter((item) => item.ativo !== false && item.servico_catalogo?.ativo !== false)
      .forEach((item) => removedAllowedCatalogIds.add(item.servico_catalogo_id));
  }

  return offers
    .filter((offer) => removedAllowedCatalogIds.has(offer.servico_catalogo_id))
    .filter((offer) => !remainingAllowedCatalogIds.has(offer.servico_catalogo_id))
    .map((offer) => ({
      servico_tenant_id: offer.id,
      servico_catalogo_id: offer.servico_catalogo_id,
      nome: offer.servico_catalogo?.nome || 'Servico'
    }));
}

async function replaceTenantTypes(context, input) {
  const tenantId = context.tenantId;
  const principalId = input.principal_tipo_negocio_id || null;
  if (!principalId) {
    throw new AppError('Tipo principal de negocio e obrigatorio.', 422, 'TENANT_PRIMARY_BUSINESS_TYPE_REQUIRED');
  }

  const complementaryIds = [...new Set(input.tipo_negocio_ids || [])].filter((id) => id && id !== principalId);
  const ids = [principalId, ...complementaryIds];
  const activeTypes = await repository.listTypes({ includeInactive: false });
  const activeIds = new Set(activeTypes.map((item) => item.id));
  const invalid = ids.filter((id) => !activeIds.has(id));

  if (invalid.length) {
    throw new AppError('Tipo de negocio inativo ou inexistente.', 422, 'BUSINESS_TYPE_NOT_SELECTABLE', { ids: invalid });
  }

  const impacted = await ensureTypeChangeHasNoOfferImpact(tenantId, ids);
  if (impacted.length && input.confirmar_remocao_com_impacto !== true) {
    throw new AppError(
      `Nao foi possivel remover alguns tipos de negocio porque existem servicos vinculados exclusivamente a eles: ${impacted.map((item) => item.nome).join(', ')}.`,
      409,
      'TENANT_BUSINESS_TYPE_REMOVAL_IMPACT',
      { servicos_afetados: impacted }
    );
  }

  const rows = ids.map((id) => ({
    tenant_id: tenantId,
    tipo_negocio_id: id,
    principal: id === principalId,
    ativo: true,
    descricao_tipo_negocio: input.descricao_tipo_negocio || null
  }));

  const result = await repository.replaceTenantTypes(tenantId, rows);
  await tenantServiceCatalogSync.syncTenant(tenantId, {
    reason: 'tenant_business_types_updated'
  });
  await eventLogsService.logEvent('tenant_business_types_updated', {
    tenantId,
    usuarioId: context.usuario?.id,
    payload: {
      principal_tipo_negocio_id: principalId,
      tipo_negocio_ids: complementaryIds,
      descricao_tipo_negocio: input.descricao_tipo_negocio || null
    }
  }).catch(() => null);
  return result.map(sanitizeTenantType);
}

function addCatalogItem(map, catalog, source) {
  if (!catalog || catalog.ativo === false) return;
  const current = map.get(catalog.id) || {
    ...catalog,
    recomendado: false,
    aplicavel: false,
    tipo_negocio_ids: [],
    tipos_negocio: []
  };
  current.aplicavel = true;
  current.recomendado = current.recomendado || source.recomendado === true;
  current.tipo_negocio_ids = [...new Set([...current.tipo_negocio_ids, source.tipo.id])];
  current.tipos_negocio = [
    ...current.tipos_negocio.filter((item) => item.id !== source.tipo.id),
    source.tipo
  ];
  map.set(catalog.id, current);
}

async function listTenantApplicableCatalog(tenantId) {
  const { tenantTypes, catalog: applicable } = await resolveTenantAllowedCatalog(tenantId);
  const recommendedIds = new Set(applicable.filter((item) => item.recomendado).map((item) => item.id));

  return {
    tipos_tenant: tenantTypes.map(sanitizeTenantType),
    recomendados: applicable.filter((item) => recommendedIds.has(item.id)).sort((a, b) => a.nome.localeCompare(b.nome)),
    aplicaveis: applicable.filter((item) => !recommendedIds.has(item.id)).sort((a, b) => a.nome.localeCompare(b.nome)),
    catalogo_adicional: []
  };
}

module.exports = {
  listActiveTypes,
  listAdminTypes,
  getAdminType,
  createAdminType,
  updateAdminType,
  updateAdminStatus,
  listAdminCatalog,
  createAdminCatalog,
  updateAdminCatalog,
  listAdminSpecialties,
  listAdminRoles,
  createAdminRole,
  updateAdminRole,
  listAdminGlobalSpecialties,
  createAdminSpecialty,
  updateAdminSpecialty,
  listAdminCatalogSpecialties,
  replaceAdminCatalogSpecialties,
  listAdminTypeServices,
  replaceAdminTypeServices,
  listTenantTypes,
  replaceTenantTypes,
  listTenantApplicableCatalog,
  resolveTenantAllowedCatalog,
  ensureCatalogAllowedForTenant
};
