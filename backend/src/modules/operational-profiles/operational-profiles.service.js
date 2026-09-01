const crypto = require('node:crypto');
const repository = require('./operational-profiles.repository');
const { AppError, forbidden, notFound } = require('../../utils/errors');

const GENERALIST_CONFIRMATION_POLICY = 'recommended_services_only_until_user_confirmation';

function ensurePlatform(context) {
  if (context?.role !== 'MasterAdmin' && context?.usuario?.tipo_usuario !== 'MasterAdmin') {
    throw forbidden('Apenas MasterAdmin pode manter perfis operacionais.');
  }
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeLocation(tenant = {}) {
  const endereco = tenant.endereco || {};
  return {
    city: normalizeText(endereco.cidade || endereco.city),
    state: normalizeText(endereco.estado || endereco.uf || endereco.state),
    country: normalizeText(endereco.pais || endereco.country || 'BR').slice(0, 2).toUpperCase() || 'BR'
  };
}

function sanitizeProfile(profile, details = {}) {
  return {
    id: profile.id,
    tipo_negocio_id: profile.tipo_negocio_id,
    tipo_negocio: profile.tipo_negocio || null,
    classificacao: profile.classificacao,
    nome: profile.nome,
    descricao: profile.descricao || null,
    ativo: profile.ativo !== false,
    exige_confirmacao_onboarding: profile.exige_confirmacao_onboarding === true,
    taxonomy_version: profile.taxonomy_version,
    origem: profile.origem,
    metadata: profile.metadata || {},
    ...details
  };
}

function withGovernanceMetadata(current = {}, patch = {}) {
  return {
    ...(current || {}),
    ...patch,
    governance: 'masteradmin_global_template',
    tenant_overwrite_policy: 'never_auto_propagate_to_existing_tenants',
    taxonomy_version: patch.taxonomy_version || current?.taxonomy_version || '2.1.0'
  };
}

function defaultScopeScore(row, location) {
  if (row.region_scope === 'city') {
    return normalizeText(row.country) === location.country.toLowerCase()
      && normalizeText(row.state) === location.state
      && normalizeText(row.city) === location.city ? 40 : -1;
  }
  if (row.region_scope === 'state') {
    return normalizeText(row.country) === location.country.toLowerCase()
      && normalizeText(row.state) === location.state ? 30 : -1;
  }
  if (row.region_scope === 'country') {
    return normalizeText(row.country) === location.country.toLowerCase() ? 20 : -1;
  }
  return row.region_scope === 'global' ? 10 : -1;
}

function resolveDefaultForCombination(defaults, serviceId, specialtyId, location) {
  return defaults
    .filter((row) => row.servico_catalogo_id === serviceId)
    .filter((row) => !row.especialidade_id || row.especialidade_id === specialtyId)
    .map((row) => ({
      row,
      score: defaultScopeScore(row, location) + (row.especialidade_id === specialtyId ? 5 : 0)
    }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score)[0]?.row || null;
}

function getServicesForInitialization(profile, services) {
  const activeServices = services.filter((item) => item.ativo !== false && item.servico_catalogo?.ativo !== false);
  if (profile.classificacao === 'generalista') {
    return activeServices.filter((item) => item.recomendado === true);
  }
  return activeServices.filter((item) => item.recomendado === true || item.obrigatorio === true);
}

function isTenantOwnedConfig(config = {}) {
  const metadata = config.metadata || {};
  return metadata.commercial_authority === 'tenant'
    || metadata.config_origin === 'tenant_customized'
    || metadata.config_origin === 'tenant_added';
}

function recommendedProfileServices(services = []) {
  return services.filter((item) => item.recomendado === true && item.ativo !== false);
}

function recommendedProfileRoles(roles = []) {
  return roles.filter((item) => item.recomendado === true && item.ativo !== false);
}

function serviceCandidatesForProfile(compatibleServices = [], services = []) {
  const recommendedIds = new Set(recommendedProfileServices(services).map((item) => item.servico_catalogo_id));
  return compatibleServices.filter((item) => !recommendedIds.has(item.servico_catalogo_id));
}

function roleCandidatesForProfile(compatibleRoles = [], roles = []) {
  const recommendedIds = new Set(recommendedProfileRoles(roles).map((item) => item.cargo_id));
  return compatibleRoles.filter((item) => !recommendedIds.has(item.cargo_id));
}

function attachCatalogSpecialties(rows = [], catalogSpecialties = []) {
  const byCatalogId = catalogSpecialties.reduce((acc, item) => {
    const list = acc.get(item.servico_catalogo_id) || [];
    list.push(item);
    acc.set(item.servico_catalogo_id, list);
    return acc;
  }, new Map());

  return rows.map((row) => {
    const links = byCatalogId.get(row.servico_catalogo_id) || [];
    return {
      ...row,
      servico_catalogo: row.servico_catalogo ? {
        ...row.servico_catalogo,
        compatibilidades: links,
        especialidades_compativeis: links.map((link) => link.especialidade).filter(Boolean)
      } : row.servico_catalogo
    };
  });
}

function fingerprintRows(rows) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(rows || []))
    .digest('hex');
}

function buildPlan({ tenant, profile, services, roles, defaults, catalogSpecialties, existingOffers }) {
  const location = normalizeLocation(tenant);
  const targetServices = getServicesForInitialization(profile, services);
  const existingByCatalogId = new Map(existingOffers.map((offer) => [offer.servico_catalogo_id, offer]));
  const specialtiesByCatalogId = catalogSpecialties.reduce((acc, item) => {
    const list = acc.get(item.servico_catalogo_id) || [];
    list.push(item);
    acc.set(item.servico_catalogo_id, list);
    return acc;
  }, new Map());

  const actions = targetServices.map((service) => {
    const existingOffer = existingByCatalogId.get(service.servico_catalogo_id);
    const combinations = (specialtiesByCatalogId.get(service.servico_catalogo_id) || []).map((link) => {
      const defaultRow = resolveDefaultForCombination(defaults, service.servico_catalogo_id, link.especialidade_id, location);
      const currentConfig = (existingOffer?.configuracoes || []).find((config) => config.especialidade_id === link.especialidade_id);
      const targetDefaults = {
        preco: defaultRow?.preco_referencia ?? null,
        duracao_minutos: defaultRow?.duracao_minutos ?? null,
        dias_retorno_recomendado: defaultRow?.dias_retorno_recomendado ?? null,
        aceita_agendamento_online: defaultRow?.aceita_agendamento_online !== false,
        default_id: defaultRow?.id || null,
        fonte: defaultRow?.fonte || 'administrative_reference'
      };
      const tenantOwned = currentConfig ? isTenantOwnedConfig(currentConfig) : false;
      const effectiveDefaults = tenantOwned ? {
        preco: currentConfig.preco ?? null,
        duracao_minutos: currentConfig.duracao_minutos ?? null,
        dias_retorno_recomendado: currentConfig.dias_retorno_recomendado ?? null,
        aceita_agendamento_online: currentConfig.aceita_agendamento_online !== false,
        default_id: currentConfig.metadata?.default_id || null,
        fonte: currentConfig.metadata?.fonte_preco || 'tenant_configuration'
      } : targetDefaults;
      const isNoop = currentConfig
        && (tenantOwned
          || (Number(currentConfig.preco ?? 0) === Number(targetDefaults.preco ?? 0)
            && Number(currentConfig.duracao_minutos ?? 0) === Number(targetDefaults.duracao_minutos ?? 0)
            && Number(currentConfig.dias_retorno_recomendado ?? 0) === Number(targetDefaults.dias_retorno_recomendado ?? 0)
            && (currentConfig.aceita_agendamento_online !== false) === targetDefaults.aceita_agendamento_online))
        && currentConfig.ativo !== false;
      return {
        action: currentConfig ? (isNoop ? 'noop' : 'update') : 'create',
        current_config_id: currentConfig?.id || null,
        especialidade_id: link.especialidade_id,
        especialidade_nome: link.especialidade?.nome || null,
        defaults: effectiveDefaults,
        tenant_commercial_authority: tenantOwned
      };
    });

    return {
      action: existingOffer && existingOffer.ativo !== false ? 'noop' : existingOffer ? 'update' : 'create',
      current_offer_id: existingOffer?.id || null,
      servico_catalogo_id: service.servico_catalogo_id,
      servico_nome: service.servico_catalogo?.nome || null,
      recomendado: service.recomendado === true,
      obrigatorio: service.obrigatorio === true,
      combinations
    };
  });

  return {
    tenant_id: tenant.id,
    tipo_negocio_id: profile.tipo_negocio_id,
    perfil_operacional_id: profile.id,
    perfil_classificacao: profile.classificacao,
    confirmation_policy: profile.classificacao === 'generalista' ? GENERALIST_CONFIRMATION_POLICY : 'automated_initial_configuration',
    cargos_recomendados: roles.map((role) => ({
      cargo_id: role.cargo_id,
      nome: role.cargo?.nome || null,
      principal: role.principal === true
    })),
    planned: {
      services: actions,
      creates: actions.filter((item) => item.action === 'create').length
        + actions.reduce((total, item) => total + item.combinations.filter((combo) => combo.action === 'create').length, 0),
      updates: actions.filter((item) => item.action === 'update').length
        + actions.reduce((total, item) => total + item.combinations.filter((combo) => combo.action === 'update').length, 0),
      inactivations: 0,
      appointment_updates: 0
    }
  };
}

async function resolveProfileByTenant(tenant) {
  const tenantTypes = await repository.listTenantTypes(tenant.id);
  const principal = tenantTypes.find((item) => item.principal === true) || tenantTypes[0];
  if (!principal?.tipo_negocio_id) return null;
  return repository.findProfileByBusinessType(principal.tipo_negocio_id);
}

async function buildTenantInitializationPlan(tenant) {
  const profile = await resolveProfileByTenant(tenant);
  if (!profile) return null;

  const [services, roles, defaults] = await Promise.all([
    repository.listProfileServices(profile.id),
    repository.listProfileRoles(profile.id),
    repository.listProfileDefaults(profile.id)
  ]);
  const catalogIds = services.map((item) => item.servico_catalogo_id);
  const [catalogSpecialties, existingOffers] = await Promise.all([
    repository.listCatalogSpecialties(catalogIds),
    repository.listTenantOffers(tenant.id)
  ]);

  return buildPlan({ tenant, profile, services, roles, defaults, catalogSpecialties, existingOffers });
}

async function applyTenantInitializationPlan(tenant, plan, options = {}) {
  if (!plan) return null;

  const savedOffers = [];
  const savedConfigs = [];
  const configIdsForProfessionalLink = [];
  for (const service of plan.planned.services) {
    let offer = service.current_offer_id ? {
      id: service.current_offer_id,
      tenant_id: tenant.id,
      servico_catalogo_id: service.servico_catalogo_id
    } : null;

    if (service.action !== 'noop') {
      offer = await repository.upsertTenantOffer(tenant.id, service.servico_catalogo_id, {
        origem: options.origin || 'operational_profile_onboarding',
        perfil_operacional_id: plan.perfil_operacional_id,
        taxonomy_version: '2.1.0'
      });
      savedOffers.push(offer);
    }

    if (!offer?.id) continue;

    for (const combination of service.combinations) {
      if (combination.action === 'noop') {
        if (combination.current_config_id) {
          configIdsForProfessionalLink.push(combination.current_config_id);
        }
        continue;
      }

      const config = await repository.upsertTenantSpecialtyConfig(
        offer.id,
        combination.especialidade_id,
        {
          preco: combination.defaults.preco,
          duracao_minutos: combination.defaults.duracao_minutos,
          dias_retorno_recomendado: combination.defaults.dias_retorno_recomendado,
          aceita_agendamento_online: combination.defaults.aceita_agendamento_online,
          metadata: {
            origem: options.origin || 'operational_profile_onboarding',
            config_origin: 'profile_default',
            commercial_authority: 'tenant_after_materialization',
            perfil_operacional_id: plan.perfil_operacional_id,
            default_id: combination.defaults.default_id,
            fonte_preco: combination.defaults.fonte,
            price_policy: 'administrative_reference_not_market_price'
          }
        }
      );
      savedConfigs.push(config);
      configIdsForProfessionalLink.push(config.id);
    }
  }

  const links = await repository.linkProfessionalToConfigs(
    tenant.id,
    options.profissionalId,
    configIdsForProfessionalLink,
    {
      origem: options.origin || 'operational_profile_onboarding',
      perfil_operacional_id: plan.perfil_operacional_id
    }
  );

  return {
    ...plan,
    materialized: {
      servico_tenants: savedOffers.length,
      servico_tenant_especialidades: savedConfigs.length,
      profissional_servico_especialidades: links.length
    }
  };
}

async function initializeTenantFromProfile({ tenant, profissional = null, dryRun = false, origin = 'operational_profile_onboarding' }) {
  const plan = await buildTenantInitializationPlan(tenant);
  if (!plan) return { applied: false, reason: 'operational_profile_not_found', plan: null };
  if (plan.planned.appointment_updates !== 0) {
    throw new AppError('Reconcile bloqueado: agendamentos planejados para alteracao.', 409, 'OPERATIONAL_PROFILE_APPOINTMENT_MUTATION_BLOCKED');
  }
  if (dryRun) return { applied: false, dry_run: true, plan };
  const applied = await applyTenantInitializationPlan(tenant, plan, {
    profissionalId: profissional?.id || null,
    origin
  });
  return { applied: true, dry_run: false, plan: applied };
}

async function listAdminProfiles(context) {
  ensurePlatform(context);
  const profiles = await repository.listProfiles({ includeInactive: true });
  return Promise.all(profiles.map(async (profile) => {
    const [services, roles, defaults, compatibleServices, compatibleRoles] = await Promise.all([
      repository.listProfileServices(profile.id),
      repository.listProfileRoles(profile.id),
      repository.listProfileDefaults(profile.id),
      repository.listCompatibleServicesForBusinessType(profile.tipo_negocio_id),
      repository.listCompatibleRolesForBusinessType(profile.tipo_negocio_id)
    ]);
    const catalogIds = [...new Set([
      ...services.map((item) => item.servico_catalogo_id),
      ...defaults.map((item) => item.servico_catalogo_id),
      ...compatibleServices.map((item) => item.servico_catalogo_id)
    ].filter(Boolean))];
    const catalogSpecialties = catalogIds.length ? await repository.listCatalogSpecialties(catalogIds) : [];
    const servicesWithSpecialties = attachCatalogSpecialties(services, catalogSpecialties);
    const compatibleServicesWithSpecialties = attachCatalogSpecialties(compatibleServices, catalogSpecialties);
    const recommendedServices = recommendedProfileServices(servicesWithSpecialties);
    const recommendedRoles = recommendedProfileRoles(roles);
    return sanitizeProfile(profile, {
      servicos: servicesWithSpecialties,
      cargos: roles,
      defaults,
      servicos_recomendados: recommendedServices,
      cargos_recomendados: recommendedRoles,
      servicos_candidatos: serviceCandidatesForProfile(compatibleServicesWithSpecialties, servicesWithSpecialties),
      cargos_candidatos: roleCandidatesForProfile(compatibleRoles, roles),
      metrics: {
        servicos: recommendedServices.length,
        cargos: recommendedRoles.length,
        defaults: defaults.length
      }
    });
  }));
}

async function updateAdminProfile(context, id, input) {
  ensurePlatform(context);
  const current = await repository.findProfileById(id);
  if (!current) throw notFound('Perfil operacional nao encontrado.');
  const payload = {};
  for (const key of ['classificacao', 'nome', 'descricao', 'ativo', 'exige_confirmacao_onboarding']) {
    if (Object.prototype.hasOwnProperty.call(input, key)) payload[key] = input[key];
  }
  payload.metadata = withGovernanceMetadata(current.metadata, {
    ...(input.metadata || {}),
    last_updated_by: 'masteradmin',
    last_update_scope: 'operational_profile'
  });
  if (!Object.keys(payload).length) throw new AppError('Informe ao menos um campo para atualizar.', 422, 'OPERATIONAL_PROFILE_EMPTY_UPDATE');
  const updated = await repository.updateProfile(id, payload);
  return sanitizeProfile(updated);
}

async function validateProfileService(profileId, catalogId) {
  const allowed = await repository.findCatalogServiceForProfile(profileId, catalogId);
  if (!allowed) {
    throw new AppError('Servico nao pertence aos servicos permitidos para este tipo de negocio.', 422, 'PROFILE_SERVICE_NOT_ALLOWED_FOR_BUSINESS_TYPE');
  }
  return allowed;
}

async function validateProfileDefault(profileId, input) {
  await validateProfileService(profileId, input.servico_catalogo_id);
  if (input.especialidade_id) {
    const compatible = await repository.findCatalogSpecialty(input.servico_catalogo_id, input.especialidade_id);
    if (!compatible) {
      throw new AppError('Especialidade incompativel com o servico informado.', 422, 'PROFILE_DEFAULT_INCOMPATIBLE_SPECIALTY');
    }
  }
}

async function updateAdminProfileService(context, profileId, input) {
  ensurePlatform(context);
  const current = await repository.findProfileById(profileId);
  if (!current) throw notFound('Perfil operacional nao encontrado.');
  await validateProfileService(profileId, input.servico_catalogo_id);
  return repository.upsertProfileService(profileId, {
    ...input,
    origem: 'masteradmin_taxonomy_governance',
    metadata: withGovernanceMetadata(input.metadata, {
      managed_entity: 'perfil_operacional_servicos',
      no_auto_tenant_propagation: true
    })
  });
}

async function updateAdminProfileRole(context, profileId, input) {
  ensurePlatform(context);
  const current = await repository.findProfileById(profileId);
  if (!current) throw notFound('Perfil operacional nao encontrado.');
  const compatibleRole = await repository.findCargoForProfile(profileId, input.cargo_id);
  if (!compatibleRole) {
    throw new AppError('Cargo nao pertence aos cargos permitidos para este tipo de negocio.', 422, 'PROFILE_ROLE_NOT_ALLOWED_FOR_BUSINESS_TYPE');
  }
  if (input.especialidade_id) {
    const compatible = await repository.findCargoSpecialty(input.cargo_id, input.especialidade_id);
    if (!compatible) {
      throw new AppError('Cargo incompativel com a especialidade informada.', 422, 'PROFILE_ROLE_INCOMPATIBLE_SPECIALTY');
    }
  }
  return repository.upsertProfileRole(profileId, {
    ...input,
    origem: 'masteradmin_taxonomy_governance',
    metadata: withGovernanceMetadata(input.metadata, {
      managed_entity: 'perfil_operacional_cargos',
      principal_policy: 'recommendation_ordering_only_never_execution_restriction',
      no_auto_tenant_propagation: true
    })
  });
}

async function createAdminDefault(context, input) {
  ensurePlatform(context);
  await validateProfileDefault(input.perfil_operacional_id, input);
  const saved = await repository.createProfileDefault({
    ...input,
    fonte: input.fonte || 'administrative_reference',
    metadata: {
      ...withGovernanceMetadata(input.metadata, {
        managed_entity: 'perfil_operacional_defaults',
        price_policy: 'administrative_reference_not_market_price',
        fallback_policy: 'city_state_country_global',
        no_auto_tenant_propagation: true
      })
    }
  });
  return saved;
}

async function updateAdminDefault(context, id, input) {
  ensurePlatform(context);
  const current = await repository.findProfileDefaultById(id);
  if (!current) throw notFound('Default operacional nao encontrado.');
  const merged = { ...current, ...input };
  await validateProfileDefault(merged.perfil_operacional_id, merged);
  const payload = { ...input };
  payload.metadata = withGovernanceMetadata(current.metadata, {
    ...(input.metadata || {}),
    managed_entity: 'perfil_operacional_defaults',
    price_policy: 'administrative_reference_not_market_price',
    fallback_policy: 'city_state_country_global',
    no_auto_tenant_propagation: true
  });
  return repository.updateProfileDefault(id, payload);
}

async function reconcileTenant(tenant, options = {}) {
  const beforeAppointments = await repository.listAppointments(tenant.id);
  const beforeHash = fingerprintRows(beforeAppointments);
  const result = await initializeTenantFromProfile({
    tenant,
    profissional: options.profissional || null,
    dryRun: options.dryRun !== false,
    origin: 'development_test_data_reconciliation'
  });
  const afterAppointments = await repository.listAppointments(tenant.id);
  const afterHash = fingerprintRows(afterAppointments);
  if (beforeHash !== afterHash) {
    throw new AppError('Reconcile bloqueado: agendamentos historicos foram alterados.', 409, 'APPOINTMENT_FINGERPRINT_CHANGED');
  }
  return {
    ...result,
    appointments: {
      before: beforeAppointments.length,
      after: afterAppointments.length,
      changed: 0,
      fingerprint_before: beforeHash,
      fingerprint_after: afterHash
    }
  };
}

module.exports = {
  buildPlan,
  resolveDefaultForCombination,
  buildTenantInitializationPlan,
  initializeTenantFromProfile,
  listAdminProfiles,
  updateAdminProfile,
  updateAdminProfileService,
  updateAdminProfileRole,
  createAdminDefault,
  updateAdminDefault,
  reconcileTenant,
  isTenantOwnedConfig,
  recommendedProfileServices,
  recommendedProfileRoles,
  serviceCandidatesForProfile,
  roleCandidatesForProfile,
  GENERALIST_CONFIRMATION_POLICY
};
