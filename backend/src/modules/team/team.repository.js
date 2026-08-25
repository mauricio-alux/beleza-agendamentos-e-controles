const { supabaseAdmin } = require('../../config/supabase');

function isMissingTaxonomyV2Relation(error) {
  if (!error) return false;
  return error.code === '42P01'
    || error.code === 'PGRST205'
    || /cargo_especialidades/i.test(error.message || '');
}

async function listByTenant(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('profissionais')
    .select(`
      *,
      cargo_ref:cargos(*),
      profissional_especialidades(
        id,
        especialidade_id,
        ativo,
        deleted_at,
        especialidade:especialidades(*)
      ),
      profissional_servico_especialidades(
        id,
        servico_tenant_especialidade_id,
        ativo,
        deleted_at,
        servico_tenant_especialidade:servico_tenant_especialidades(
          id,
          servico_tenant_id,
          especialidade_id,
          preco,
          duracao_minutos,
          aceita_agendamento_online,
          ativo,
          especialidade:especialidades(id,nome,ativo,deleted_at,tenant_id,taxonomy_category_key),
          servico_tenant:servico_tenants(
            id,
            tenant_id,
            ativo,
            servico_catalogo:servicos_catalogo(id,nome,categoria_key,natureza,ativo)
          )
        )
      )
    `)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('ativo', { ascending: false })
    .order('ordem_exibicao', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function findById(tenantId, id) {
  const { data, error } = await supabaseAdmin
    .from('profissionais')
    .select(`
      *,
      cargo_ref:cargos(*),
      profissional_especialidades(
        id,
        especialidade_id,
        ativo,
        deleted_at,
        especialidade:especialidades(*)
      ),
      profissional_servico_especialidades(
        id,
        servico_tenant_especialidade_id,
        ativo,
        deleted_at,
        servico_tenant_especialidade:servico_tenant_especialidades(
          id,
          servico_tenant_id,
          especialidade_id,
          preco,
          duracao_minutos,
          aceita_agendamento_online,
          ativo,
          especialidade:especialidades(id,nome,ativo,deleted_at,tenant_id,taxonomy_category_key),
          servico_tenant:servico_tenants(
            id,
            tenant_id,
            ativo,
            servico_catalogo:servicos_catalogo(id,nome,categoria_key,natureza,ativo)
          )
        )
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function listServicesByIds(tenantId, ids) {
  if (!ids.length) return [];

  const { data, error } = await supabaseAdmin
    .from('servico_tenants')
    .select(`
      id,
      tenant_id,
      servico_catalogo_id,
      ativo,
      servico_catalogo:servicos_catalogo(id,nome,categoria_key,natureza,ativo),
      configuracoes:servico_tenant_especialidades(
        id,
        servico_tenant_id,
        especialidade_id,
        preco,
        duracao_minutos,
        aceita_agendamento_online,
        ativo,
        especialidade:especialidades(id,nome,ativo,deleted_at,tenant_id,taxonomy_category_key)
      )
    `)
    .eq('tenant_id', tenantId)
    .in('id', ids)
    .eq('ativo', true);

  if (error) throw error;
  return data || [];
}

async function listActiveServicesByTenant(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('servico_tenants')
    .select('id, tenant_id, ativo, servico_catalogo:servicos_catalogo(id,nome,categoria_key,natureza,ativo)')
    .eq('tenant_id', tenantId)
    .eq('ativo', true);

  if (error) throw error;
  return data || [];
}

async function listServicesBySpecialtyIds(tenantId, specialtyIds = []) {
  if (!specialtyIds.length) return [];

  const { data, error } = await supabaseAdmin
    .from('servico_tenant_especialidades')
    .select('servico_tenant:servico_tenants(id,tenant_id,ativo,servico_catalogo:servicos_catalogo(id,nome,categoria_key,natureza,ativo))')
    .in('especialidade_id', specialtyIds)
    .eq('ativo', true);

  if (error) throw error;

  const servicesById = new Map();
  (data || []).forEach((row) => {
    const service = row.servico_tenant;
    if (service && service.tenant_id === tenantId && service.ativo !== false && service.servico_catalogo?.ativo !== false) {
      servicesById.set(service.id, service);
    }
  });

  return Array.from(servicesById.values());
}

async function listServiceSpecialtyLinks(tenantId, serviceIds = []) {
  if (!serviceIds.length) return [];

  const { data, error } = await supabaseAdmin
    .from('servico_tenant_especialidades')
    .select(`
      servico_tenant_id,
      especialidade_id,
      especialidade:especialidades(
        id,
        ativo,
        deleted_at,
        tenant_id,
        taxonomy_category_key
      )
    `)
    .in('servico_tenant_id', serviceIds)
    .eq('ativo', true);

  if (error) throw error;
  return (data || []).filter((item) => (
    item.especialidade
    && item.especialidade.ativo !== false
    && !item.especialidade.deleted_at
    && (!item.especialidade.tenant_id || item.especialidade.tenant_id === tenantId)
  ));
}

async function hasServiceSpecialtyLinks(tenantId) {
  const services = await listActiveServicesByTenant(tenantId);
  if (!services.length) return false;

  const { count, error } = await supabaseAdmin
    .from('servico_tenant_especialidades')
    .select('id', { count: 'exact', head: true })
    .eq('ativo', true)
    .in('servico_tenant_id', services.map((item) => item.id));

  if (error) throw error;
  return Boolean(count);
}

async function replaceServices(tenantId, professionalId, serviceIds, options = {}) {
  const now = new Date().toISOString();

  const { error: deleteError } = await supabaseAdmin
    .from('profissional_servico_especialidades')
    .update({
      ativo: false,
      deleted_at: now
    })
    .eq('tenant_id', tenantId)
    .eq('profissional_id', professionalId)
    .is('deleted_at', null);

  if (deleteError) throw deleteError;

  if (!serviceIds.length) return [];

  const services = await listServicesByIds(tenantId, serviceIds);
  if (services.length !== serviceIds.length) {
    const error = new Error('Um ou mais servicos sao invalidos.');
    error.code = 'INVALID_SERVICE';
    throw error;
  }

  const specialtyIds = new Set((options.specialtyIds || []).filter(Boolean));
  const configurations = services.flatMap((service) => (
    (service.configuracoes || [])
      .filter((config) => config.ativo !== false)
      .filter((config) => !specialtyIds.size || specialtyIds.has(config.especialidade_id))
      .map((config) => ({ service, config }))
  ));

  if (!configurations.length) return [];

  const { data, error } = await supabaseAdmin
    .from('profissional_servico_especialidades')
    .upsert(
      configurations.map(({ service, config }) => ({
        tenant_id: tenantId,
        profissional_id: professionalId,
        servico_tenant_especialidade_id: config.id,
        metadata: {
          origem: 'team_replace_services_phase_8_1',
          servico_tenant_id: service.id,
          especialidade_id: config.especialidade_id,
          percentual_comissao: options.percentual_comissao ?? null
        },
        ativo: true,
        deleted_at: null
      })),
      { onConflict: 'profissional_id,servico_tenant_especialidade_id' }
    )
    .select('*, servico_tenant_especialidade:servico_tenant_especialidades(*, servico_tenant:servico_tenants(*, servico_catalogo:servicos_catalogo(*)), especialidade:especialidades(*))');

  if (error) throw error;
  return data || [];
}

async function create(tenantId, payload) {
  const { data, error } = await supabaseAdmin
    .from('profissionais')
    .insert({
      tenant_id: tenantId,
      ...payload
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function update(tenantId, id, payload) {
  const { data, error } = await supabaseAdmin
    .from('profissionais')
    .update(payload)
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function remove(tenantId, id) {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('profissionais')
    .update({
      ativo: false,
      deleted_at: now
    })
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function hardDelete(tenantId, id) {
  const { error } = await supabaseAdmin
    .from('profissionais')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('id', id);

  if (error) throw error;
  return { success: true };
}

async function replaceSpecialties(tenantId, professionalId, specialtyIds) {
  const now = new Date().toISOString();

  const { error: deleteError } = await supabaseAdmin
    .from('profissional_especialidades')
    .update({
      ativo: false,
      deleted_at: now
    })
    .eq('tenant_id', tenantId)
    .eq('profissional_id', professionalId)
    .is('deleted_at', null);

  if (deleteError) throw deleteError;

  if (!specialtyIds.length) return [];

  const { data, error } = await supabaseAdmin
    .from('profissional_especialidades')
    .insert(
      specialtyIds.map((especialidadeId) => ({
        tenant_id: tenantId,
        profissional_id: professionalId,
        especialidade_id: especialidadeId
      }))
    )
    .select('*, especialidade:especialidades(*)');

  if (error) throw error;
  return data || [];
}

async function updateWithOperationalLinks(
  tenantId,
  professionalId,
  professionalPatch,
  specialtyIds,
  serviceIds,
  options = {}
) {
  const { error } = await supabaseAdmin.rpc('update_professional_operational_links', {
    p_tenant_id: tenantId,
    p_profissional_id: professionalId,
    p_professional_patch: professionalPatch || {},
    p_replace_specialties: options.replaceSpecialties === true,
    p_especialidade_ids: specialtyIds || [],
    p_replace_services: options.replaceServices === true,
    p_servico_ids: serviceIds || [],
    p_percentual_comissao: options.percentualComissao ?? null
  });

  if (error) throw error;
  return findById(tenantId, professionalId);
}

async function listRoles(filters = {}) {
  let query = supabaseAdmin
    .from('cargos')
    .select('*')
    .eq('ativo', true)
    .is('deleted_at', null)
    .order('nome', { ascending: true });

  if (filters.categories?.length) {
    query = query.in('categoria_profissional', filters.categories);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

async function findRoleById(id) {
  const { data, error } = await supabaseAdmin
    .from('cargos')
    .select('*')
    .eq('id', id)
    .eq('ativo', true)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function createRole(payload) {
  const { data, error } = await supabaseAdmin
    .from('cargos')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateRole(id, payload) {
  const { data, error } = await supabaseAdmin
    .from('cargos')
    .update(payload)
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function removeRole(id) {
  const now = new Date().toISOString();

  const { count: specialtiesCount, error: specialtiesError } = await supabaseAdmin
    .from('especialidades')
    .select('id', { count: 'exact', head: true })
    .eq('cargo_id', id)
    .is('deleted_at', null);

  if (specialtiesError) throw specialtiesError;
  if (specialtiesCount) {
    const error = new Error('Cargo possui especialidades associadas.');
    error.code = 'ROLE_HAS_SPECIALTIES';
    error.details = { especialidades: specialtiesCount };
    throw error;
  }

  const { data, error } = await supabaseAdmin
    .from('cargos')
    .update({
      ativo: false,
      deleted_at: now
    })
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function queryLegacySpecialties(filters = {}) {
  let query = supabaseAdmin
    .from('especialidades')
    .select('*, cargo:cargos(*)')
    .eq('ativo', true)
    .is('deleted_at', null)
    .order('nome', { ascending: true });

  if (filters.cargoId) {
    query = query.eq('cargo_id', filters.cargoId);
  }

  if (filters.tenantId) {
    query = query.or(`tenant_id.is.null,tenant_id.eq.${filters.tenantId}`);
  } else {
    query = query.is('tenant_id', null);
  }

  if (filters.categoryKey) {
    query = query.eq('taxonomy_category_key', filters.categoryKey);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []).filter((specialty) => (
    specialty.cargo
    && specialty.cargo.ativo !== false
    && !specialty.cargo.deleted_at
  ));
}

async function querySpecialtiesByIds(ids = [], filters = {}) {
  if (!ids.length) return [];

  let query = supabaseAdmin
    .from('especialidades')
    .select('*, cargo:cargos(*)')
    .in('id', ids)
    .eq('ativo', true)
    .is('deleted_at', null)
    .order('nome', { ascending: true });

  if (filters.categoryKey) {
    query = query.eq('taxonomy_category_key', filters.categoryKey);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []).filter((specialty) => (
    specialty.cargo
    && specialty.cargo.ativo !== false
    && !specialty.cargo.deleted_at
    && (!specialty.tenant_id || specialty.tenant_id === filters.tenantId)
  ));
}

async function listCargoSpecialtyLinks(cargoId, specialtyIds = [], options = {}) {
  if (!cargoId) return [];

  let query = supabaseAdmin
    .from('cargo_especialidades')
    .select('cargo_id,especialidade_id,principal,ativo,taxonomy_version,relation_source')
    .eq('cargo_id', cargoId)
    .eq('ativo', true)
    .is('deleted_at', null);

  if (specialtyIds.length) {
    query = query.in('especialidade_id', specialtyIds);
  }

  const { data, error } = await query;

  if (error) {
    if (options.allowMissing === true && isMissingTaxonomyV2Relation(error)) {
      return null;
    }

    throw error;
  }

  return data || [];
}

async function listSpecialties(filters = {}) {
  if (filters.cargoId) {
    const links = await listCargoSpecialtyLinks(filters.cargoId, [], { allowMissing: true });

    if (links) {
      const officialSpecialties = await querySpecialtiesByIds(
        links.map((link) => link.especialidade_id),
        filters
      );
      const localSpecialties = filters.tenantId
        ? await queryLegacySpecialties({
          ...filters,
          cargoId: filters.cargoId
        }).then((rows) => rows.filter((specialty) => specialty.tenant_id === filters.tenantId))
        : [];
      const byId = new Map();

      [...officialSpecialties, ...localSpecialties].forEach((specialty) => {
        byId.set(specialty.id, specialty);
      });

      return Array.from(byId.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    }
  }

  return queryLegacySpecialties(filters);
}

async function listTenantSpecialtyStatuses(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('tenant_especialidades')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null);

  if (error) throw error;
  return data || [];
}

async function upsertTenantSpecialtyStatus(tenantId, specialtyId, ativo) {
  const { data, error } = await supabaseAdmin
    .from('tenant_especialidades')
    .upsert({
      tenant_id: tenantId,
      especialidade_id: specialtyId,
      ativo: ativo !== false,
      deleted_at: null
    }, { onConflict: 'tenant_id,especialidade_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function listSpecialtiesByIds(ids, tenantId = null) {
  if (!ids.length) return [];

  let query = supabaseAdmin
    .from('especialidades')
    .select('*, cargo:cargos(*)')
    .in('id', ids)
    .eq('ativo', true)
    .is('deleted_at', null);

  if (tenantId) {
    query = query.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []).filter((specialty) => (
    specialty.cargo
    && specialty.cargo.ativo !== false
    && !specialty.cargo.deleted_at
  ));
}

async function listSpecialtyReferencesByIds(ids, tenantId = null) {
  if (!ids.length) return [];

  let query = supabaseAdmin
    .from('especialidades')
    .select('*, cargo:cargos(*)')
    .in('id', ids);

  if (tenantId) {
    query = query.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

async function createSpecialty(payload) {
  const { data, error } = await supabaseAdmin
    .from('especialidades')
    .insert(payload)
    .select('*, cargo:cargos(*)')
    .single();

  if (error) throw error;
  return data;
}

async function updateSpecialty(id, payload, tenantId = null) {
  let query = supabaseAdmin
    .from('especialidades')
    .update(payload)
    .eq('id', id)
    .is('deleted_at', null);

  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }

  const { data, error } = await query
    .select('*, cargo:cargos(*)')
    .single();

  if (error) throw error;
  return data;
}

async function removeSpecialty(id, tenantId = null) {
  let query = supabaseAdmin
    .from('especialidades')
    .update({
      ativo: false,
      deleted_at: new Date().toISOString()
    })
    .eq('id', id)
    .is('deleted_at', null);

  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
  }

  const { data, error } = await query
    .select('*, cargo:cargos(*)')
    .single();

  if (error) throw error;
  return data;
}

async function countSpecialtyDependencies(id, tenantId = null) {
  const dependencies = {};

  let professionalQuery = supabaseAdmin
    .from('profissional_especialidades')
    .select('id', { count: 'exact', head: true })
    .eq('especialidade_id', id)
    .is('deleted_at', null);
  if (tenantId) professionalQuery = professionalQuery.eq('tenant_id', tenantId);
  const { count: professionalCount, error: professionalError } = await professionalQuery;
  if (professionalError) throw professionalError;
  if (professionalCount) dependencies.profissionais = professionalCount;

  const { count: catalogCount, error: catalogError } = await supabaseAdmin
    .from('servico_catalogo_especialidades')
    .select('id', { count: 'exact', head: true })
    .eq('especialidade_id', id)
    .eq('ativo', true);
  if (catalogError) throw catalogError;
  if (catalogCount) dependencies.compatibilidade_global_servicos = catalogCount;

  let tenantServiceQuery = supabaseAdmin
    .from('servico_tenant_especialidades')
    .select('id, servico_tenant:servico_tenants!inner(tenant_id)', { count: 'exact', head: true })
    .eq('especialidade_id', id);
  if (tenantId) {
    tenantServiceQuery = tenantServiceQuery.eq('servico_tenant.tenant_id', tenantId);
  }
  const { count: tenantServiceCount, error: tenantServiceError } = await tenantServiceQuery;
  if (tenantServiceError) throw tenantServiceError;
  if (tenantServiceCount) dependencies.configuracoes_servico_tenant = tenantServiceCount;

  return dependencies;
}

module.exports = {
  listByTenant,
  findById,
  create,
  update,
  remove,
  hardDelete,
  replaceSpecialties,
  replaceServices,
  updateWithOperationalLinks,
  listActiveServicesByTenant,
  listServicesBySpecialtyIds,
  listServiceSpecialtyLinks,
  hasServiceSpecialtyLinks,
  listServicesByIds,
  listRoles,
  findRoleById,
  createRole,
  updateRole,
  removeRole,
  listSpecialties,
  listCargoSpecialtyLinks,
  listTenantSpecialtyStatuses,
  upsertTenantSpecialtyStatus,
  listSpecialtiesByIds,
  listSpecialtyReferencesByIds,
  countSpecialtyDependencies,
  createSpecialty,
  updateSpecialty,
  removeSpecialty
};
