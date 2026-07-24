const servicesRepository = require('./services.repository');
const teamRepository = require('../team/team.repository');
const { filterCompatibleServices } = require('../../constants/team-service-compatibility');
const {
  hasExactServiceCompatibility
} = require('../team/professional-service-compatibility');
const {
  BELLORY_OFFICIAL_SERVICES,
  normalizeOfficialCategoryKey,
  getOfficialServiceByName
} = require('../../constants/bellory-taxonomy');
const {
  isValidServiceCategory,
  normalizeServiceCategory
} = require('../../constants/service-categories');
const { AppError } = require('../../utils/errors');

function normalizeTaxonomyName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeLoose(value) {
  return normalizeTaxonomyName(value).replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function toTaxonomyKey(value) {
  return normalizeLoose(value).replace(/\s+/g, '_');
}

function isValidServiceNameForCompatibility(nome) {
  return normalizeLoose(nome).length >= 2;
}

function isValidCategory(categoria) {
  return isValidServiceCategory(categoria);
}

function officialCategoryMatches(serviceCategoryKey, selectedCategory) {
  return normalizeOfficialCategoryKey(serviceCategoryKey) === normalizeOfficialCategoryKey(selectedCategory);
}

function findOfficialServiceMatches(nome, categoria) {
  const normalizedName = normalizeLoose(nome);

  return BELLORY_OFFICIAL_SERVICES.filter((service) => {
    if (!officialCategoryMatches(service.categoryKey, categoria)) {
      return false;
    }

    const serviceName = normalizeLoose(service.name);
    const serviceAction = normalizeLoose(service.action);
    const specialtyNames = service.specialties.map(normalizeLoose);

    return serviceName.includes(normalizedName)
      || normalizedName.includes(serviceName)
      || serviceAction.includes(normalizedName)
      || specialtyNames.some((specialtyName) => specialtyName.includes(normalizedName) || normalizedName.includes(specialtyName))
      || normalizedName.split(' ').some((term) => term.length >= 4 && serviceName.includes(term));
  });
}

function getOfficialSpecialtyNameSet(nome, categoria) {
  const matches = findOfficialServiceMatches(nome, categoria);
  const names = new Set();

  matches.forEach((service) => {
    (service.specialties || []).forEach((specialtyName) => {
      names.add(normalizeTaxonomyName(specialtyName));
    });
  });

  return names;
}

function matchesOfficialSpecialty(specialty, officialNames) {
  if (!officialNames.size) return false;
  return officialNames.has(normalizeTaxonomyName(specialty?.nome));
}

function uniqueSpecialties(specialties = []) {
  const byId = new Map();
  specialties.forEach((specialty) => {
    if (specialty?.id && specialty.ativo !== false) {
      byId.set(specialty.id, specialty);
    }
  });

  return Array.from(byId.values()).sort((a, b) => {
    const cargoDiff = String(a.cargo?.nome || '').localeCompare(String(b.cargo?.nome || ''));
    if (cargoDiff !== 0) return cargoDiff;
    return String(a.nome || '').localeCompare(String(b.nome || ''));
  });
}

function sanitizeSpecialty(specialty) {
  return {
    id: specialty.id,
    cargo_id: specialty.cargo_id,
    nome: specialty.nome,
    descricao: specialty.descricao,
    ativo: specialty.ativo !== false,
    catalogo_ativo: specialty.catalogo_ativo !== false,
    tenant_ativo: specialty.tenant_ativo !== false,
    tenant_id: specialty.tenant_id || null,
    taxonomy_category_key: normalizeServiceCategory(specialty.taxonomy_category_key),
    is_official: specialty.is_official !== false,
    is_custom: specialty.is_custom === true,
    cargo: specialty.cargo ? {
      id: specialty.cargo.id,
      nome: specialty.cargo.nome,
      descricao: specialty.cargo.descricao,
      categoria_profissional: specialty.cargo.categoria_profissional,
      ativo: specialty.cargo.ativo !== false
    } : null
  };
}

async function resolveCompatibleSpecialties(tenantId, input = {}) {
  const nome = input.nome;
  const categoria = input.categoria;

  if (!isValidServiceNameForCompatibility(nome) || !categoria) {
    return [];
  }

  if (!isValidCategory(categoria)) {
    throw new AppError('Categoria de servico invalida.', 422, 'INVALID_SERVICE_CATEGORY');
  }

  const specialties = (await teamRepository.listSpecialties({
    tenantId,
    categoryKey: normalizeServiceCategory(categoria)
  })).map((specialty) => sanitizeSpecialty(specialty));
  const statuses = await teamRepository.listTenantSpecialtyStatuses(tenantId);
  const statusBySpecialty = new Map(statuses.map((item) => [item.especialidade_id, item.ativo !== false]));
  const activeSpecialties = specialties
    .map((specialty) => ({
      ...specialty,
      ativo: statusBySpecialty.has(specialty.id) ? statusBySpecialty.get(specialty.id) : specialty.ativo !== false,
      tenant_ativo: statusBySpecialty.has(specialty.id) ? statusBySpecialty.get(specialty.id) : true
    }))
    .filter((specialty) => specialty.ativo !== false && specialty.catalogo_ativo !== false && specialty.tenant_ativo !== false);

  const officialNames = getOfficialSpecialtyNameSet(nome, categoria);
  const officialMatches = activeSpecialties.filter((specialty) => matchesOfficialSpecialty(specialty, officialNames));
  const categoryMatches = activeSpecialties.filter((specialty) => (
    normalizeServiceCategory(specialty.taxonomy_category_key) === normalizeServiceCategory(categoria)
  ));

  return uniqueSpecialties([...officialMatches, ...categoryMatches]);
}

function sanitize(service) {
  const links = (service.servico_especialidades || [])
    .filter((item) => (
      item
      && !item.deleted_at
      && item.ativo !== false
      && item.especialidade
      && item.especialidade.ativo !== false
      && !item.especialidade.deleted_at
      && item.especialidade.cargo
      && item.especialidade.cargo.ativo !== false
      && !item.especialidade.cargo.deleted_at
    ))
    .map((item) => item.especialidade);

  return {
    id: service.id,
    tenant_id: service.tenant_id,
    nome: service.nome,
    descricao: service.descricao,
    duracao_minutos: service.duracao_minutos,
    preco: Number(service.preco || 0),
    categoria: normalizeServiceCategory(service.categoria),
    taxonomy_category_key: normalizeServiceCategory(service.taxonomy_category_key || service.metadata?.taxonomy_category_key || service.categoria),
    taxonomy_service_key: service.taxonomy_service_key || service.metadata?.taxonomy_service_key || null,
    is_official: service.is_official === true || service.metadata?.taxonomy_origin === 'official',
    is_custom: service.is_custom !== false && service.metadata?.taxonomy_origin !== 'official',
    permite_online: service.permite_online !== false,
    ordem_exibicao: service.ordem_exibicao || 0,
    metadata: service.metadata || {},
    especialidades: links,
    especialidade_ids: links.map((item) => item.id),
    ativo: service.ativo !== false,
    created_at: service.created_at
  };
}

function sanitizePayload(input) {
  const officialService = getOfficialServiceByName(input.nome);
  const categoria = normalizeServiceCategory(input.categoria || officialService?.categoryKey);
  const isOfficial = Boolean(officialService && officialCategoryMatches(officialService.categoryKey, categoria));

  return {
    nome: input.nome,
    descricao: input.descricao || null,
    duracao_minutos: input.duracao_minutos,
    preco: input.preco ?? 0,
    categoria,
    taxonomy_category_key: categoria,
    taxonomy_service_key: isOfficial ? toTaxonomyKey(officialService.name) : null,
    is_official: isOfficial,
    is_custom: !isOfficial,
    permite_online: input.permite_online !== false,
    ordem_exibicao: input.ordem_exibicao ?? 0,
    metadata: {
      ...(input.metadata || {}),
      taxonomy_origin: isOfficial ? 'official' : 'custom',
      ...(isOfficial ? {
        taxonomy_version: 'bellory_taxonomy_v1',
        taxonomy_category_key: officialService.categoryKey,
        taxonomy_service_key: toTaxonomyKey(officialService.name),
        acao_servico: officialService.action,
        especialidades_oficiais: officialService.specialties
      } : {
        taxonomy_category_key: categoria
      })
    }
  };
}

async function list(tenantId, filters = {}) {
  let services = await servicesRepository.listByTenant(tenantId);

  if (!filters.especialidadeIds?.length) {
    return services.map(sanitize);
  }

  const explicitServices = await servicesRepository.listBySpecialtyIds(tenantId, filters.especialidadeIds);
  if (explicitServices.length) {
    const specialties = await teamRepository.listSpecialtiesByIds(filters.especialidadeIds, tenantId);
    const selectedSpecialtyIds = new Set(specialties.map((specialty) => specialty.id));
    const specialtyById = new Map(specialties.map((specialty) => [specialty.id, specialty]));

    return explicitServices
      .map(sanitize)
      .filter((service) => {
        service.especialidades.forEach((specialty) => {
          if (!specialtyById.has(specialty.id)) {
            specialtyById.set(specialty.id, specialty);
          }
        });

        return hasExactServiceCompatibility({
          service,
          professionalSpecialtyIds: selectedSpecialtyIds,
          serviceSpecialtyIds: new Set(service.especialidade_ids),
          specialtyById
        });
      });
  }

  const specialties = await teamRepository.listSpecialtiesByIds(filters.especialidadeIds, tenantId);
  return filterCompatibleServices(services, specialties).map(sanitize);
}

async function ensureSpecialtiesExist(tenantId, specialtyIds = []) {
  const uniqueIds = [...new Set(specialtyIds.filter(Boolean))];
  if (!uniqueIds.length) return [];

  const activeSpecialties = await teamRepository.listSpecialtiesByIds(uniqueIds, tenantId);
  if (activeSpecialties.length === uniqueIds.length) {
    return activeSpecialties.map(sanitizeSpecialty);
  }

  const activeById = new Map(activeSpecialties.map((specialty) => [specialty.id, specialty]));
  const missingIds = uniqueIds.filter((id) => !activeById.has(id));
  const [legacyReferences, activeCatalog] = await Promise.all([
    teamRepository.listSpecialtyReferencesByIds(missingIds, tenantId),
    teamRepository.listSpecialties({ tenantId })
  ]);
  const legacyById = new Map(legacyReferences.map((specialty) => [specialty.id, specialty]));
  const resolved = [];
  const unresolvedIds = [];

  uniqueIds.forEach((id) => {
    const active = activeById.get(id);
    if (active) {
      resolved.push(active);
      return;
    }

    const legacy = legacyById.get(id);
    const replacement = legacy
      ? activeCatalog.find((candidate) => (
        normalizeTaxonomyName(candidate.nome) === normalizeTaxonomyName(legacy.nome)
        && normalizeServiceCategory(candidate.taxonomy_category_key)
          === normalizeServiceCategory(legacy.taxonomy_category_key)
      ))
      : null;

    if (replacement) {
      resolved.push(replacement);
    } else {
      unresolvedIds.push(id);
    }
  });

  if (unresolvedIds.length) {
    throw new AppError('Uma ou mais especialidades sao invalidas.', 422, 'INVALID_SPECIALTY', {
      especialidade_ids: unresolvedIds
    });
  }

  return uniqueSpecialties(resolved).map(sanitizeSpecialty);
}

function ensureServiceCategory(serviceInput) {
  if (!isValidServiceNameForCompatibility(serviceInput.nome) || !serviceInput.categoria) {
    throw new AppError('Informe nome e categoria para vincular especialidades ao servico.', 422, 'SERVICE_COMPATIBILITY_CONTEXT_REQUIRED');
  }

  if (!isValidCategory(serviceInput.categoria)) {
    throw new AppError('Categoria de servico invalida.', 422, 'INVALID_SERVICE_CATEGORY');
  }

  return normalizeServiceCategory(serviceInput.categoria);
}

async function ensureUniqueService(tenantId, serviceInput, excludedServiceId = null) {
  const category = normalizeServiceCategory(serviceInput.categoria) || null;
  const normalizedName = normalizeTaxonomyName(serviceInput.nome);
  const services = await servicesRepository.listActiveByCategory(tenantId, category);
  const duplicate = services.find((service) => (
    service.id !== excludedServiceId
    && normalizeTaxonomyName(service.nome) === normalizedName
  ));

  if (duplicate) {
    throw new AppError(
      'Ja existe um servico ativo com este nome e categoria.',
      409,
      'SERVICE_ALREADY_EXISTS'
    );
  }
}

async function ensureCompatibleSpecialtiesForService(tenantId, serviceInput, specialtyIds = []) {
  const categoryKey = ensureServiceCategory(serviceInput);
  const specialties = await ensureSpecialtiesExist(tenantId, specialtyIds);

  if (!specialties.length) {
    throw new AppError('Selecione ao menos uma especialidade compativel para este servico.', 422, 'SERVICE_SPECIALTY_REQUIRED');
  }

  const incompatible = specialties.filter((specialty) => (
    normalizeServiceCategory(specialty.taxonomy_category_key) !== categoryKey
    || specialty.cargo?.categoria_profissional === 'administrativo'
  ));

  if (incompatible.length) {
    throw new AppError('Uma ou mais especialidades sao incompativeis com o servico informado.', 422, 'INCOMPATIBLE_SERVICE_SPECIALTY', {
      especialidade_ids: incompatible.map((specialty) => specialty.id),
      categoria: categoryKey,
      nome: serviceInput.nome
    });
  }

  return specialties.map((specialty) => specialty.id);
}

async function create(tenantId, input) {
  await ensureUniqueService(tenantId, input);
  const specialtyIds = await ensureCompatibleSpecialtiesForService(tenantId, input, input.especialidade_ids || []);
  let created;

  try {
    created = await servicesRepository.create(tenantId, sanitizePayload(input));
  } catch (error) {
    if (error.code === '23505') {
      throw new AppError(
        'Ja existe um servico ativo com este nome e categoria.',
        409,
        'SERVICE_ALREADY_EXISTS'
      );
    }
    throw error;
  }

  await servicesRepository.replaceSpecialties(tenantId, created.id, specialtyIds);
  return sanitize(await servicesRepository.findById(tenantId, created.id));
}

async function update(tenantId, id, input) {
  const current = await servicesRepository.findById(tenantId, id);
  if (!current) {
    throw new AppError('Servico nao encontrado.', 404, 'SERVICE_NOT_FOUND');
  }

  const payload = {};

  Object.entries(input).forEach(([key, value]) => {
    if (key === 'especialidade_ids') {
      return;
    }
    if (value !== undefined) {
      payload[key] = value;
    }
  });

  if (Object.prototype.hasOwnProperty.call(payload, 'categoria')) {
    payload.categoria = normalizeServiceCategory(payload.categoria) || null;
    payload.taxonomy_category_key = payload.categoria;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'descricao')) {
    payload.descricao = payload.descricao || null;
  }

  const serviceCompatibilityInput = {
    nome: input.nome !== undefined ? input.nome : current.nome,
    categoria: input.categoria !== undefined
      ? normalizeServiceCategory(input.categoria)
      : normalizeServiceCategory(
        current.categoria
        || current.taxonomy_category_key
        || current.metadata?.taxonomy_category_key
      )
  };

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[services:update]', {
      tenant_id: tenantId,
      service_id: id,
      nome: serviceCompatibilityInput.nome,
      categoria: serviceCompatibilityInput.categoria,
      especialidade_ids: input.especialidade_ids,
      validacoes: {
        contexto_compatibilidade: true,
        unicidade: true,
        especialidades: input.especialidade_ids !== undefined
      }
    });
  }

  await ensureUniqueService(tenantId, serviceCompatibilityInput, id);

  if (Object.prototype.hasOwnProperty.call(payload, 'nome') || Object.prototype.hasOwnProperty.call(payload, 'categoria')) {
    const officialService = getOfficialServiceByName(serviceCompatibilityInput.nome);
    const isOfficial = Boolean(officialService && officialCategoryMatches(officialService.categoryKey, serviceCompatibilityInput.categoria));
    payload.metadata = {
      ...(current.metadata || {}),
      ...(payload.metadata || {}),
      taxonomy_origin: isOfficial ? 'official' : 'custom',
      ...(isOfficial ? {
        taxonomy_version: 'bellory_taxonomy_v1',
        taxonomy_category_key: officialService.categoryKey,
        taxonomy_service_key: toTaxonomyKey(officialService.name),
        acao_servico: officialService.action,
        especialidades_oficiais: officialService.specialties
      } : {
        taxonomy_category_key: serviceCompatibilityInput.categoria
      })
    };
    payload.taxonomy_category_key = serviceCompatibilityInput.categoria;
    payload.taxonomy_service_key = isOfficial ? toTaxonomyKey(officialService.name) : null;
    payload.is_official = isOfficial;
    payload.is_custom = !isOfficial;
  }

  const specialtyIds = input.especialidade_ids !== undefined
    ? await ensureCompatibleSpecialtiesForService(tenantId, serviceCompatibilityInput, input.especialidade_ids)
    : null;

  if (specialtyIds === null && (Object.prototype.hasOwnProperty.call(payload, 'nome') || Object.prototype.hasOwnProperty.call(payload, 'categoria'))) {
    const currentSpecialtyIds = (current.servico_especialidades || [])
      .filter((item) => item && !item.deleted_at && item.ativo !== false && item.especialidade_id)
      .map((item) => item.especialidade_id);
    await ensureCompatibleSpecialtiesForService(tenantId, serviceCompatibilityInput, currentSpecialtyIds);
  }

  let updated;

  try {
    updated = Object.keys(payload).length
      ? await servicesRepository.update(tenantId, id, payload)
      : await servicesRepository.findById(tenantId, id);
  } catch (error) {
    if (error.code === '23505') {
      throw new AppError(
        'Ja existe um servico ativo com este nome e categoria.',
        409,
        'SERVICE_ALREADY_EXISTS'
      );
    }
    throw error;
  }

  if (specialtyIds) {
    await servicesRepository.replaceSpecialties(tenantId, id, specialtyIds);
  }

  return sanitize(await servicesRepository.findById(tenantId, updated.id));
}

async function remove(tenantId, id) {
  return servicesRepository.softDelete(tenantId, id);
}

module.exports = {
  list,
  resolveCompatibleSpecialties,
  create,
  update,
  remove
};
