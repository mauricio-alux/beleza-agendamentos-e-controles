const { supabaseAdmin } = require('../../config/supabase');

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
      profissional_servicos(
        id,
        servico_id,
        ativo,
        deleted_at,
        servico:servicos(id,nome,duracao_minutos,preco,categoria,ativo)
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
      profissional_servicos(
        id,
        servico_id,
        ativo,
        deleted_at,
        servico:servicos(id,nome,duracao_minutos,preco,categoria,ativo)
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
    .from('servicos')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('id', ids)
    .eq('ativo', true)
    .is('deleted_at', null);

  if (error) throw error;
  return data || [];
}

async function listActiveServicesByTenant(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('servicos')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('ativo', true)
    .is('deleted_at', null);

  if (error) throw error;
  return data || [];
}

async function listServicesBySpecialtyIds(tenantId, specialtyIds = []) {
  if (!specialtyIds.length) return [];

  const { data, error } = await supabaseAdmin
    .from('servico_especialidades')
    .select('servico:servicos(*)')
    .eq('tenant_id', tenantId)
    .in('especialidade_id', specialtyIds)
    .eq('ativo', true)
    .is('deleted_at', null);

  if (error) throw error;

  const servicesById = new Map();
  (data || []).forEach((row) => {
    const service = row.servico;
    if (service && service.ativo !== false && !service.deleted_at) {
      servicesById.set(service.id, service);
    }
  });

  return Array.from(servicesById.values());
}

async function listServiceSpecialtyLinks(tenantId, serviceIds = []) {
  if (!serviceIds.length) return [];

  const { data, error } = await supabaseAdmin
    .from('servico_especialidades')
    .select(`
      servico_id,
      especialidade_id,
      especialidade:especialidades(
        id,
        ativo,
        deleted_at,
        tenant_id,
        taxonomy_category_key
      )
    `)
    .eq('tenant_id', tenantId)
    .in('servico_id', serviceIds)
    .eq('ativo', true)
    .is('deleted_at', null);

  if (error) throw error;
  return (data || []).filter((item) => (
    item.especialidade
    && item.especialidade.ativo !== false
    && !item.especialidade.deleted_at
    && (!item.especialidade.tenant_id || item.especialidade.tenant_id === tenantId)
  ));
}

async function hasServiceSpecialtyLinks(tenantId) {
  const { count, error } = await supabaseAdmin
    .from('servico_especialidades')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('ativo', true)
    .is('deleted_at', null);

  if (error) throw error;
  return Boolean(count);
}

async function replaceServices(tenantId, professionalId, serviceIds, options = {}) {
  const now = new Date().toISOString();

  const { error: deleteError } = await supabaseAdmin
    .from('profissional_servicos')
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

  const { data, error } = await supabaseAdmin
    .from('profissional_servicos')
    .upsert(
      services.map((service) => ({
        tenant_id: tenantId,
        profissional_id: professionalId,
        servico_id: service.id,
        duracao_minutos: service.duracao_minutos,
        preco: service.preco,
        percentual_comissao: options.percentual_comissao ?? null,
        ativo: true,
        deleted_at: null
      })),
      { onConflict: 'profissional_id,servico_id' }
    )
    .select('*, servico:servicos(*)');

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

  const { error: specialtiesError } = await supabaseAdmin
    .from('especialidades')
    .update({
      ativo: false,
      deleted_at: now
    })
    .eq('cargo_id', id)
    .is('deleted_at', null);

  if (specialtiesError) throw specialtiesError;

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

async function listSpecialties(filters = {}) {
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
  listTenantSpecialtyStatuses,
  upsertTenantSpecialtyStatus,
  listSpecialtiesByIds,
  listSpecialtyReferencesByIds,
  createSpecialty,
  updateSpecialty,
  removeSpecialty
};
