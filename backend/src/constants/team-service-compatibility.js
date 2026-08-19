const {
  BELLORY_OFFICIAL_OPERATIONAL_CARGOS,
  BELLORY_OFFICIAL_SERVICES,
  normalizeTaxonomyKey,
  normalizeOfficialCategoryKey,
  getOfficialCategoryLabel
} = require('./bellory-taxonomy');

const ROLE_CATEGORY_COMPATIBILITY = {
  barbeiro: ['cabelo', 'barba'],
  cabeleireira: ['cabelo', 'terapia_capilar'],
  cabeleireiro: ['cabelo', 'terapia_capilar'],
  manicure: ['unhas'],
  pedicure: ['unhas', 'podologia'],
  podologa: ['podologia'],
  podologo: ['podologia'],
  esteticista: ['estetica_facial', 'estetica_corporal'],
  maquiadora: ['maquiagem'],
  maquiador: ['maquiagem'],
  massoterapeuta: ['massoterapia', 'estetica_corporal'],
  'lash designer': ['cilios'],
  'designer de sobrancelhas': ['sobrancelhas', 'cilios'],
  'terapeuta capilar': ['cabelo', 'terapia_capilar'],
  depiladora: ['depilacao'],
  depilador: ['depilacao']
};

function normalizeName(value) {
  return normalizeTaxonomyKey(value);
}

function getServiceCategory(service) {
  return normalizeOfficialCategoryKey(
    service?.metadata?.taxonomy_category_key
    || service?.categoria
    || getOfficialServiceForService(service)?.categoryKey
  );
}

function getOfficialServiceForService(service) {
  const normalizedName = normalizeName(service?.nome);
  return BELLORY_OFFICIAL_SERVICES.find((officialService) => {
    const officialName = normalizeName(officialService.name);
    const officialSpecialtyMatches = officialService.specialties.some((specialty) => {
      const officialSpecialty = normalizeName(specialty);
      return officialSpecialty === normalizedName
        || officialSpecialty.includes(normalizedName)
        || normalizedName.includes(officialSpecialty);
    });

    return officialName === normalizedName
      || officialName.includes(normalizedName)
      || normalizedName.includes(officialName)
      || officialSpecialtyMatches;
  }) || null;
}

function getCargoCategory(cargoName) {
  const normalizedCargo = normalizeName(cargoName);
  const officialCargo = BELLORY_OFFICIAL_OPERATIONAL_CARGOS.find((cargo) => normalizeName(cargo.name) === normalizedCargo);
  return officialCargo ? normalizeOfficialCategoryKey(officialCargo.categoryKey) : null;
}

function getAllowedCategoryKeysForRole(role) {
  const roleName = typeof role === 'string' ? role : role?.nome;
  const normalizedCargo = normalizeName(roleName);
  const configured = ROLE_CATEGORY_COMPATIBILITY[normalizedCargo];

  if (configured) {
    return configured.map(normalizeOfficialCategoryKey).filter(Boolean);
  }

  const fallbackCategory = getCargoCategory(roleName);
  return fallbackCategory ? [fallbackCategory] : [];
}

function isRoleCategoryCompatible(role, categoryKey) {
  const normalizedCategory = normalizeOfficialCategoryKey(categoryKey);
  if (!normalizedCategory) return false;
  return getAllowedCategoryKeysForRole(role).includes(normalizedCategory);
}

function describeAllowedCategoriesForRole(role) {
  return getAllowedCategoryKeysForRole(role)
    .map((categoryKey) => getOfficialCategoryLabel(categoryKey) || categoryKey)
    .join(', ');
}

function getOfficialServicesForSpecialty(specialtyName) {
  const normalizedSpecialty = normalizeName(specialtyName);
  return BELLORY_OFFICIAL_SERVICES.filter((service) =>
    service.specialties.some((officialSpecialty) => normalizeName(officialSpecialty) === normalizedSpecialty)
  );
}

function buildCompatibilityContext(specialties = []) {
  const categories = new Set();
  const serviceNames = new Set();
  const specialtyNames = new Set();

  specialties.forEach((specialty) => {
    const cargoCategory = getCargoCategory(specialty?.cargo?.nome);
    if (cargoCategory) {
      categories.add(cargoCategory);
    }

    getOfficialServicesForSpecialty(specialty?.nome).forEach((service) => {
      categories.add(normalizeOfficialCategoryKey(service.categoryKey));
      serviceNames.add(normalizeName(service.name));
      service.specialties.forEach((officialSpecialty) => specialtyNames.add(normalizeName(officialSpecialty)));
    });
  });

  return {
    categories: Array.from(categories),
    serviceNames: Array.from(serviceNames),
    specialtyNames: Array.from(specialtyNames)
  };
}

function isServiceCompatibleWithContext(service, context) {
  if (!service || !context) return false;

  const category = getServiceCategory(service);
  const officialService = getOfficialServiceForService(service);
  const normalizedServiceName = normalizeName(service.nome);

  if (officialService && context.serviceNames.includes(normalizeName(officialService.name))) {
    return true;
  }

  return Boolean(category && context.categories.includes(category) && context.serviceNames.includes(normalizedServiceName));
}

function filterCompatibleServices(services = [], specialties = []) {
  if (!specialties.length) return [];
  const context = buildCompatibilityContext(specialties);
  return services.filter((service) => isServiceCompatibleWithContext(service, context));
}

function roleHasCompatibleTenantServices(role, specialties = [], services = []) {
  if (!role || !services.length) return false;

  const roleSpecialties = specialties.filter((specialty) => specialty.cargo_id === role.id);
  if (!roleSpecialties.length) return false;

  return roleSpecialties.some((specialty) => filterCompatibleServices(services, [specialty]).length > 0);
}

function filterRolesWithCompatibleTenantServices(roles = [], specialties = [], services = []) {
  return roles.filter((role) => roleHasCompatibleTenantServices(role, specialties, services));
}

module.exports = {
  ROLE_CATEGORY_COMPATIBILITY,
  buildCompatibilityContext,
  describeAllowedCategoriesForRole,
  filterRolesWithCompatibleTenantServices,
  filterCompatibleServices,
  getAllowedCategoryKeysForRole,
  isServiceCompatibleWithContext,
  isRoleCategoryCompatible,
  roleHasCompatibleTenantServices
};
