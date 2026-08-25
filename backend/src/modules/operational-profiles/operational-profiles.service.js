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
      const isNoop = currentConfig
        && Number(currentConfig.preco ?? 0) === Number(targetDefaults.preco ?? 0)
        && Number(currentConfig.duracao_minutos ?? 0) === Number(targetDefaults.duracao_minutos ?? 0)
        && Number(currentConfig.dias_retorno_recomendado ?? 0) === Number(targetDefaults.dias_retorno_recomendado ?? 0)
        && currentConfig.aceita_agendamento_online !== false === targetDefaults.aceita_agendamento_online
        && currentConfig.ativo !== false;
      return {
        action: currentConfig ? (isNoop ? 'noop' : 'update') : 'create',
        current_config_id: currentConfig?.id || null,
        especialidade_id: link.especialidade_id,
        especialidade_nome: link.especialidade?.nome || null,
        defaults: targetDefaults
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
    const [services, roles, defaults] = await Promise.all([
      repository.listProfileServices(profile.id),
      repository.listProfileRoles(profile.id),
      repository.listProfileDefaults(profile.id)
    ]);
    return sanitizeProfile(profile, {
      servicos: services,
      cargos: roles,
      defaults,
      metrics: {
        servicos: services.length,
        cargos: roles.length,
        defaults: defaults.length
      }
    });
  }));
}

async function updateAdminProfile(context, id, input) {
  ensurePlatform(context);
  const payload = {};
  for (const key of ['classificacao', 'nome', 'descricao', 'ativo', 'exige_confirmacao_onboarding', 'metadata']) {
    if (Object.prototype.hasOwnProperty.call(input, key)) payload[key] = input[key];
  }
  if (!Object.keys(payload).length) throw new AppError('Informe ao menos um campo para atualizar.', 422, 'OPERATIONAL_PROFILE_EMPTY_UPDATE');
  const updated = await repository.updateProfile(id, payload);
  return sanitizeProfile(updated);
}

async function updateAdminDefault(context, input) {
  ensurePlatform(context);
  const saved = await repository.createProfileDefault({
    ...input,
    fonte: input.fonte || 'administrative_reference',
    metadata: {
      ...(input.metadata || {}),
      price_policy: 'administrative_reference_not_market_price'
    }
  });
  return saved;
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
  updateAdminDefault,
  reconcileTenant,
  GENERALIST_CONFIRMATION_POLICY
};
