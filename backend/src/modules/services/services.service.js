const crypto = require('node:crypto');
const servicesRepository = require('./services.repository');
const teamRepository = require('../team/team.repository');
const businessTypesService = require('../business-types/business-types.service');
const tenantServiceCatalogSync = require('./tenant-service-catalog-sync.service');
const { isValidServiceCategory, normalizeServiceCategory } = require('../../constants/service-categories');
const { AppError } = require('../../utils/errors');

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeCodePart(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').toUpperCase();
}

function sanitizeSpecialty(specialty) {
  if (!specialty) return null;
  return {
    id: specialty.id,
    cargo_id: specialty.cargo_id,
    nome: specialty.nome,
    descricao: specialty.descricao,
    ativo: specialty.ativo !== false,
    tenant_id: specialty.tenant_id || null,
    taxonomy_category_key: normalizeServiceCategory(specialty.taxonomy_category_key),
    is_official: specialty.is_official !== false,
    is_custom: specialty.is_custom === true,
    cargo: specialty.cargo ? {
      id: specialty.cargo.id,
      nome: specialty.cargo.nome,
      descricao: specialty.cargo.descricao,
      categoria_profissional: specialty.cargo.categoria_profissional,
      ativo: specialty.cargo.ativo !== false && !specialty.cargo.deleted_at
    } : null
  };
}

function activeSpecialtyFromConfig(config) {
  const specialty = sanitizeSpecialty(config.especialidade);
  if (!specialty || specialty.ativo === false || specialty.cargo?.ativo === false) return null;
  return specialty;
}

function sanitizeCatalog(catalog) {
  const compatibilities = (catalog.compatibilidades || [])
    .filter((item) => item && item.ativo !== false)
    .map((item) => ({
      id: item.id,
      especialidade_id: item.especialidade_id,
      ativo: item.ativo !== false,
      metadata: item.metadata || {},
      especialidade: sanitizeSpecialty(item.especialidade)
    }))
    .filter((item) => item.especialidade && item.especialidade.ativo !== false && item.especialidade.cargo?.ativo !== false);

  return {
    id: catalog.id,
    servico_catalogo_id: catalog.id,
    codigo_canonico: catalog.codigo_canonico,
    nome: catalog.nome,
    descricao: catalog.descricao,
    categoria: normalizeServiceCategory(catalog.categoria_key),
    categoria_key: normalizeServiceCategory(catalog.categoria_key),
    natureza: catalog.natureza,
    servico_ocasional: catalog.natureza === 'ocasional',
    ativo: catalog.ativo !== false,
    recomendado: catalog.recomendado === true,
    aplicavel: catalog.aplicavel === true,
    tipo_negocio_ids: catalog.tipo_negocio_ids || [],
    tipos_negocio: catalog.tipos_negocio || [],
    metadata: catalog.metadata || {},
    especialidades_compativeis: compatibilities.map((item) => item.especialidade),
    compatibilidades: compatibilities
  };
}

function sanitizeOffer(offer) {
  const catalog = offer.servico_catalogo || {};
  const configs = (offer.configuracoes || [])
    .filter((item) => item && item.especialidade)
    .map((item) => ({
      id: item.id,
      servico_tenant_especialidade_id: item.id,
      servico_tenant_id: item.servico_tenant_id,
      especialidade_id: item.especialidade_id,
      preco: item.preco ?? null,
      duracao_minutos: item.duracao_minutos ?? null,
      dias_retorno_recomendado: item.dias_retorno_recomendado ?? null,
      aceita_agendamento_online: item.ativo === false ? false : item.aceita_agendamento_online !== false,
      ativo: item.ativo !== false,
      metadata: item.metadata || {},
      especialidade: activeSpecialtyFromConfig(item),
      source: {
        preco: 'servico_tenant_especialidades',
        duracao_minutos: 'servico_tenant_especialidades',
        dias_retorno_recomendado: 'servico_tenant_especialidades',
        aceita_agendamento_online: 'servico_tenant_especialidades'
      }
    }))
    .filter((item) => item.especialidade);
  const activeConfigs = configs.filter((item) => item.ativo !== false);
  const firstConfig = activeConfigs[0] || configs[0] || {};

  return {
    id: offer.id,
    servico_tenant_id: offer.id,
    tenant_id: offer.tenant_id,
    servico_catalogo_id: offer.servico_catalogo_id,
    codigo_canonico: catalog.codigo_canonico,
    nome: catalog.nome,
    descricao: catalog.descricao,
    categoria: normalizeServiceCategory(catalog.categoria_key),
    categoria_key: normalizeServiceCategory(catalog.categoria_key),
    taxonomy_category_key: normalizeServiceCategory(catalog.categoria_key),
    natureza: catalog.natureza,
    servico_ocasional: catalog.natureza === 'ocasional',
    ativo: offer.ativo !== false,
    oferta_ativa: offer.ativo !== false,
    disponivel_ao_tenant: true,
    catalogo_ativo: catalog.ativo !== false,
    metadata: offer.metadata || {},
    catalogo_metadata: catalog.metadata || {},
    preco: firstConfig.preco ?? null,
    duracao_minutos: firstConfig.duracao_minutos ?? null,
    dias_retorno_recomendado: firstConfig.dias_retorno_recomendado ?? null,
    permite_online: firstConfig.aceita_agendamento_online !== false,
    especialidades: activeConfigs.map((item) => item.especialidade),
    especialidade_ids: activeConfigs.map((item) => item.especialidade_id),
    especialidades_config: configs,
    created_at: offer.created_at,
    legacy: offer.metadata?.legacy_servico_ids ? {
      servico_ids: offer.metadata.legacy_servico_ids
    } : null
  };
}

function resolveConfigInput(input = {}) {
  const explicitConfigs = input.especialidades_config || [];
  const ids = explicitConfigs.length
    ? explicitConfigs.map((item) => item.especialidade_id)
    : input.especialidade_ids || [];

  return ids.map((especialidadeId) => {
    const config = explicitConfigs.find((item) => item.especialidade_id === especialidadeId) || {};
    return {
      especialidade_id: especialidadeId,
      duracao_minutos: config.duracao_minutos ?? input.duracao_minutos ?? null,
      preco: config.preco ?? input.preco ?? null,
      dias_retorno_recomendado: config.dias_retorno_recomendado ?? input.dias_retorno_recomendado ?? null,
      aceita_agendamento_online: (config.ativo ?? true) === false ? false : config.aceita_agendamento_online ?? input.permite_online ?? true,
      ativo: config.ativo ?? true
    };
  });
}

function ensureCategory(category) {
  const normalized = normalizeServiceCategory(category);
  if (!isValidServiceCategory(normalized)) {
    throw new AppError('Categoria de servico invalida.', 422, 'INVALID_SERVICE_CATEGORY');
  }
  return normalized;
}

function buildCustomCode(tenantId, nome, categoria) {
  const hash = crypto.createHash('sha1').update(`${tenantId}:${categoria}:${nome}`).digest('hex').slice(0, 10).toUpperCase();
  return `CUSTOM_${normalizeCodePart(categoria)}_${normalizeCodePart(nome).slice(0, 40)}_${hash}`;
}

async function list(tenantId, filters = {}) {
  await tenantServiceCatalogSync.syncTenant(tenantId, { reason: 'services_list' });
  let offers = await servicesRepository.listByTenant(tenantId, { activeOnly: false });
  if (filters.especialidadeIds?.length) {
    const selected = new Set(filters.especialidadeIds);
    offers = offers.filter((offer) => (
      (offer.configuracoes || []).some((config) => config.ativo !== false && selected.has(config.especialidade_id))
    ));
  }
  return offers
    .map(sanitizeOffer)
    .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR', { sensitivity: 'base' }));
}

async function listCatalog(tenantId) {
  const segmented = await businessTypesService.listTenantApplicableCatalog(tenantId);
  return [...(segmented.recomendados || []), ...(segmented.aplicaveis || [])]
    .map(sanitizeCatalog)
    .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR', { sensitivity: 'base' }));
}

async function getById(tenantId, id) {
  const offer = await servicesRepository.findOfferById(tenantId, id);
  if (!offer) {
    throw new AppError('Servico nao encontrado.', 404, 'SERVICE_NOT_FOUND');
  }
  return sanitizeOffer(offer);
}

async function resolveCatalog(input) {
  if (input.servico_catalogo_id) {
    const catalog = await servicesRepository.findCatalogById(input.servico_catalogo_id);
    if (!catalog || catalog.ativo === false) {
      throw new AppError('Servico do catalogo nao encontrado.', 404, 'SERVICE_CATALOG_NOT_FOUND');
    }
    return catalog;
  }

  if (input.codigo_canonico) {
    const catalog = await servicesRepository.findCatalogByCode(input.codigo_canonico);
    if (!catalog || catalog.ativo === false) {
      throw new AppError('Servico do catalogo nao encontrado.', 404, 'SERVICE_CATALOG_NOT_FOUND');
    }
    return catalog;
  }

  throw new AppError('Tenant nao pode criar ou alterar servico canonico global. Selecione um servico permitido do catalogo.', 403, 'SERVICE_CATALOG_CREATE_FORBIDDEN');
}

async function ensureCustomCatalogCompatibilities(catalog, configurations) {
  if (catalog.metadata?.custom !== true || compatibleSpecialtyIds(catalog).size) {
    return catalog;
  }

  const uniqueIds = [...new Set(configurations.map((item) => item.especialidade_id))];
  const compatibilities = await servicesRepository.upsertCatalogCompatibilities(catalog.id, uniqueIds, {
    source: 'services_backend_phase_3',
    custom_scope: 'tenant'
  });

  return {
    ...catalog,
    compatibilidades: compatibilities
  };
}

function compatibleSpecialtyIds(catalog) {
  return new Set((catalog.compatibilidades || [])
    .filter((item) => item && item.ativo !== false && item.especialidade?.ativo !== false)
    .map((item) => item.especialidade_id));
}

function ensureBookableDurations(configurations) {
  const invalidIds = configurations
    .filter((item) => item.ativo !== false && item.aceita_agendamento_online !== false)
    .filter((item) => !Number.isInteger(item.duracao_minutos) || item.duracao_minutos <= 0)
    .map((item) => item.especialidade_id);

  if (invalidIds.length) {
    throw new AppError('Duracao maior que zero e obrigatoria para combinacoes disponiveis no agendamento online.', 422, 'SERVICE_SPECIALTY_DURATION_REQUIRED', {
      especialidade_ids: invalidIds
    });
  }
}

async function ensureConfigurationsAreCompatible(catalog, configurations, tenantId = null) {
  if (!configurations.length) {
    throw new AppError('Selecione ao menos uma especialidade compativel para este servico.', 422, 'SERVICE_SPECIALTY_REQUIRED');
  }

  const allowed = compatibleSpecialtyIds(catalog);
  let invalidIds = configurations
    .map((item) => item.especialidade_id)
    .filter((id) => !allowed.has(id));

  if (invalidIds.length && tenantId) {
    const customSpecialties = await teamRepository.listSpecialtiesByIds(invalidIds, tenantId);
    const catalogCategory = normalizeServiceCategory(catalog.categoria_key);
    const allowedCustomIds = new Set(customSpecialties
      .filter((specialty) => specialty.tenant_id === tenantId)
      .filter((specialty) => specialty.is_custom === true && specialty.is_official === false)
      .filter((specialty) => normalizeServiceCategory(specialty.taxonomy_category_key) === catalogCategory)
      .map((specialty) => specialty.id));
    invalidIds = invalidIds.filter((id) => !allowedCustomIds.has(id));
  }

  if (invalidIds.length) {
    throw new AppError('Uma ou mais especialidades sao incompativeis com o servico informado.', 422, 'INCOMPATIBLE_SERVICE_SPECIALTY', {
      especialidade_ids: invalidIds,
      servico_catalogo_id: catalog.id
    });
  }
}

async function resolveCatalogForCompatibility(current) {
  if (current.servico_catalogo?.compatibilidades?.length) {
    return current.servico_catalogo;
  }

  const catalog = await servicesRepository.findCatalogById(current.servico_catalogo_id);
  if (!catalog || catalog.ativo === false) {
    throw new AppError('Servico do catalogo nao encontrado.', 404, 'SERVICE_CATALOG_NOT_FOUND');
  }
  return catalog;
}

function mergeConfigurations(inputConfigs, currentConfigs = []) {
  const currentBySpecialty = new Map(currentConfigs.map((item) => [item.especialidade_id, item]));
  return inputConfigs.map((item) => {
    const current = currentBySpecialty.get(item.especialidade_id) || {};
    return {
      especialidade_id: item.especialidade_id,
      duracao_minutos: item.duracao_minutos ?? current.duracao_minutos ?? null,
      preco: item.preco ?? current.preco ?? null,
      dias_retorno_recomendado: item.dias_retorno_recomendado ?? current.dias_retorno_recomendado ?? null,
      aceita_agendamento_online: (item.ativo ?? current.ativo ?? true) === false ? false : item.aceita_agendamento_online ?? current.aceita_agendamento_online ?? true,
      ativo: item.ativo ?? current.ativo ?? true,
      metadata: {
        ...(current.metadata || {}),
        source: 'services_backend_phase_3'
      }
    };
  });
}

async function create(tenantId, input) {
  let catalog = await resolveCatalog({ ...input, tenantId });
  await businessTypesService.ensureCatalogAllowedForTenant(tenantId, catalog.id);
  const existingOffer = await servicesRepository.findOfferByCatalogId(tenantId, catalog.id);
  if (existingOffer && existingOffer.ativo !== false) {
    throw new AppError('Este servico ja esta ativo para o tenant.', 409, 'SERVICE_ALREADY_EXISTS');
  }

  const configurations = resolveConfigInput(input);
  ensureBookableDurations(configurations);
  catalog = await ensureCustomCatalogCompatibilities(catalog, configurations);
  await ensureConfigurationsAreCompatible(catalog, configurations, tenantId);

  const offer = await servicesRepository.upsertOffer(tenantId, catalog.id, {
    ativo: input.ativo !== false,
    metadata: {
      ...(existingOffer?.metadata || {}),
      source: 'services_backend_phase_3'
    }
  });

  await servicesRepository.replaceConfigurations(offer.id, configurations);
  return getById(tenantId, offer.id);
}

async function update(tenantId, id, input) {
  const current = await servicesRepository.findOfferById(tenantId, id);
  if (!current) {
    throw new AppError('Servico nao encontrado.', 404, 'SERVICE_NOT_FOUND');
  }

  if (
    input.nome !== undefined
    || input.descricao !== undefined
    || input.categoria !== undefined
    || input.natureza !== undefined
    || input.servico_ocasional !== undefined
    || input.servico_catalogo_id !== undefined
    || input.codigo_canonico !== undefined
  ) {
    throw new AppError('Conceitos globais do catalogo nao podem ser alterados pelo tenant nesta fase.', 403, 'SERVICE_CATALOG_UPDATE_FORBIDDEN');
  }

  let offer = current;
  if (input.ativo !== undefined) {
    if (input.ativo !== false) {
      await businessTypesService.ensureCatalogAllowedForTenant(tenantId, current.servico_catalogo_id);
    }
    offer = await servicesRepository.updateOffer(tenantId, id, {
      ativo: input.ativo !== false,
      metadata: {
        ...(current.metadata || {}),
        source: 'services_backend_phase_3'
      }
    });
  }

  const hasConfigUpdate = input.especialidades_config !== undefined
    || input.especialidade_ids !== undefined
    || input.preco !== undefined
    || input.duracao_minutos !== undefined
    || input.dias_retorno_recomendado !== undefined
    || input.permite_online !== undefined;

  if (hasConfigUpdate) {
    await businessTypesService.ensureCatalogAllowedForTenant(tenantId, current.servico_catalogo_id);
    const requested = resolveConfigInput(input);
    const base = requested.length
      ? requested
      : (current.configuracoes || []).map((item) => ({ especialidade_id: item.especialidade_id }));
    const catalog = await resolveCatalogForCompatibility(current);
    await ensureConfigurationsAreCompatible(catalog, base, tenantId);
    const configs = mergeConfigurations(base, current.configuracoes || []);
    ensureBookableDurations(configs);
    await servicesRepository.replaceConfigurations(id, configs);
    await servicesRepository.deactivateConfigurations(id, configs.map((item) => item.especialidade_id));
  }

  return getById(tenantId, offer.id);
}

async function remove(tenantId, id) {
  const current = await servicesRepository.findOfferById(tenantId, id);
  if (!current) {
    throw new AppError('Servico nao encontrado.', 404, 'SERVICE_NOT_FOUND');
  }

  await servicesRepository.updateOffer(tenantId, id, {
    ativo: false,
    metadata: {
      ...(current.metadata || {}),
      deactivated_by: 'services_backend_phase_3'
    }
  });
  await servicesRepository.deactivateConfigurations(id);

  return { id, servico_tenant_id: id, removed: true };
}

async function resolveCompatibleSpecialties(tenantId, input = {}) {
  let catalog = null;

  if (input.servico_catalogo_id) {
    catalog = await servicesRepository.findCatalogById(input.servico_catalogo_id);
  } else if (input.codigo_canonico) {
    catalog = await servicesRepository.findCatalogByCode(input.codigo_canonico);
  } else if (input.nome && input.categoria) {
    catalog = await servicesRepository.findCatalogByNameAndCategory(input.nome, ensureCategory(input.categoria));
  }

  if (!catalog) return [];
  await businessTypesService.ensureCatalogAllowedForTenant(tenantId, catalog.id);

  const rows = await servicesRepository.listCompatibleSpecialties(catalog.id);
  const tenantSpecialties = await teamRepository.listSpecialties({ tenantId, categoryKey: normalizeServiceCategory(catalog.categoria_key) });
  const statuses = await teamRepository.listTenantSpecialtyStatuses(tenantId);
  const inactive = new Set(statuses.filter((item) => item.ativo === false).map((item) => item.especialidade_id));

  const officialSpecialties = rows
    .map((item) => sanitizeSpecialty(item.especialidade))
    .filter((specialty) => specialty && specialty.ativo !== false && !inactive.has(specialty.id))
  const customSpecialties = (tenantSpecialties || [])
    .filter((specialty) => specialty.tenant_id === tenantId)
    .filter((specialty) => specialty.is_custom === true && specialty.is_official === false)
    .filter((specialty) => specialty.ativo !== false && !inactive.has(specialty.id))
    .map(sanitizeSpecialty);
  const byId = new Map([...officialSpecialties, ...customSpecialties].map((specialty) => [specialty.id, specialty]));

  return [...byId.values()].sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || '')));
}

module.exports = {
  list,
  listCatalog,
  getById,
  resolveCompatibleSpecialties,
  create,
  update,
  remove
};
