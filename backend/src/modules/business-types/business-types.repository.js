const { supabaseAdmin } = require('../../config/supabase');

const TYPE_SELECT = `
  id,
  nome,
  slug,
  descricao,
  icone,
  ativo,
  ordem_exibicao,
  criado_em,
  atualizado_em
`;

const ASSOCIATION_SELECT = `
  id,
  tipo_negocio_id,
  servico_catalogo_id,
  recomendado,
  ativo,
  ordem_exibicao,
  servico_catalogo:servicos_catalogo(
    id,
    codigo_canonico,
    nome,
    categoria_key,
    descricao,
    natureza,
    ativo,
    metadata
  )
`;

async function listTypes({ includeInactive = false, search = '' } = {}) {
  let query = supabaseAdmin
    .from('tipos_negocio')
    .select(`
      ${TYPE_SELECT},
      tipo_negocio_servicos_catalogo(id, ativo),
      tenant_tipos_negocio(id, ativo)
    `)
    .order('ordem_exibicao', { ascending: true })
    .order('nome', { ascending: true });

  if (!includeInactive) query = query.eq('ativo', true);
  if (search) query = query.ilike('nome', `%${search}%`);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function findTypeById(id) {
  const { data, error } = await supabaseAdmin
    .from('tipos_negocio')
    .select(TYPE_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findTypeBySlug(slug) {
  const { data, error } = await supabaseAdmin
    .from('tipos_negocio')
    .select(TYPE_SELECT)
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function createType(payload) {
  const { data, error } = await supabaseAdmin
    .from('tipos_negocio')
    .insert(payload)
    .select(TYPE_SELECT)
    .single();

  if (error) throw error;
  return data;
}

async function updateType(id, payload) {
  const { data, error } = await supabaseAdmin
    .from('tipos_negocio')
    .update(payload)
    .eq('id', id)
    .select(TYPE_SELECT)
    .single();

  if (error) throw error;
  return data;
}

async function listTypeServices(typeId) {
  const { data, error } = await supabaseAdmin
    .from('tipo_negocio_servicos_catalogo')
    .select(ASSOCIATION_SELECT)
    .eq('tipo_negocio_id', typeId)
    .order('ordem_exibicao', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function replaceTypeServices(typeId, services) {
  const existing = await listTypeServices(typeId);
  const wanted = new Map(services.map((item) => [item.servico_catalogo_id, item]));

  for (const current of existing) {
    const next = wanted.get(current.servico_catalogo_id);
    if (!next) {
      const { error } = await supabaseAdmin
        .from('tipo_negocio_servicos_catalogo')
        .update({ ativo: false })
        .eq('id', current.id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from('tipo_negocio_servicos_catalogo')
        .update({
          ativo: next.ativo !== false,
          ordem_exibicao: next.ordem_exibicao || 0
        })
        .eq('id', current.id);
      if (error) throw error;
      wanted.delete(current.servico_catalogo_id);
    }
  }

  const inserts = [...wanted.values()].map((item) => ({
    tipo_negocio_id: typeId,
    servico_catalogo_id: item.servico_catalogo_id,
    ativo: item.ativo !== false,
    ordem_exibicao: item.ordem_exibicao || 0
  }));

  if (inserts.length) {
    const { error } = await supabaseAdmin
      .from('tipo_negocio_servicos_catalogo')
      .insert(inserts);
    if (error) throw error;
  }

  return listTypeServices(typeId);
}

async function listActiveProfilesByBusinessTypeIds(typeIds) {
  const ids = [...new Set((typeIds || []).filter(Boolean))];
  if (!ids.length) return [];

  const { data, error } = await supabaseAdmin
    .from('tipo_negocio_perfis_operacionais')
    .select('id,tipo_negocio_id,nome,ativo,deleted_at')
    .in('tipo_negocio_id', ids)
    .eq('ativo', true)
    .is('deleted_at', null);

  if (error) throw error;
  return data || [];
}

async function listRecommendedProfileServicesByProfileIds(profileIds) {
  const ids = [...new Set((profileIds || []).filter(Boolean))];
  if (!ids.length) return [];

  const { data, error } = await supabaseAdmin
    .from('perfil_operacional_servicos')
    .select('id,perfil_operacional_id,servico_catalogo_id,recomendado,ativo,deleted_at')
    .in('perfil_operacional_id', ids)
    .eq('ativo', true)
    .eq('recomendado', true)
    .is('deleted_at', null);

  if (error) throw error;
  return data || [];
}

async function listTenantTypes(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('tenant_tipos_negocio')
    .select(`
      id,
      tenant_id,
      tipo_negocio_id,
      principal,
      ativo,
      descricao_tipo_negocio,
      criado_em,
      atualizado_em,
      tipo_negocio:tipos_negocio(${TYPE_SELECT})
    `)
    .eq('tenant_id', tenantId)
    .eq('ativo', true)
    .order('principal', { ascending: false })
    .order('criado_em', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function replaceTenantTypes(tenantId, rows) {
  const { error } = await supabaseAdmin.rpc('sync_tenant_business_types', {
    p_tenant_id: tenantId,
    p_rows: rows.map((row) => ({
      tipo_negocio_id: row.tipo_negocio_id,
      principal: row.principal === true,
      descricao_tipo_negocio: row.descricao_tipo_negocio || null
    }))
  });

  if (error) throw error;

  return listTenantTypes(tenantId);
}

async function listAllCatalog({ includeInactive = false } = {}) {
  let query = supabaseAdmin
    .from('servicos_catalogo')
    .select('id, codigo_canonico, nome, categoria_key, descricao, natureza, ativo, metadata')
    .order('categoria_key', { ascending: true })
    .order('nome', { ascending: true });

  if (!includeInactive) {
    query = query.eq('ativo', true);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

async function createCatalog(payload) {
  const { data, error } = await supabaseAdmin
    .from('servicos_catalogo')
    .insert(payload)
    .select('id, codigo_canonico, nome, categoria_key, descricao, natureza, ativo, metadata')
    .single();

  if (error) throw error;
  return data;
}

async function updateCatalog(id, payload) {
  const { data, error } = await supabaseAdmin
    .from('servicos_catalogo')
    .update(payload)
    .eq('id', id)
    .select('id, codigo_canonico, nome, categoria_key, descricao, natureza, ativo, metadata')
    .single();

  if (error) throw error;
  return data;
}

async function listSpecialties() {
  const { data, error } = await supabaseAdmin
    .from('especialidades')
    .select('id, nome, ativo, tenant_id, taxonomy_category_key, cargo:cargos(id,nome,ativo,deleted_at)')
    .eq('ativo', true)
    .is('tenant_id', null)
    .is('deleted_at', null)
    .order('nome', { ascending: true });

  if (error) throw error;
  return (data || []).filter((item) => item.cargo && item.cargo.ativo !== false && !item.cargo.deleted_at);
}

async function listRoles({ includeInactive = true } = {}) {
  let query = supabaseAdmin
    .from('cargos')
    .select('id, nome, descricao, categoria_profissional, ativo, created_at, updated_at, deleted_at')
    .is('deleted_at', null)
    .order('categoria_profissional', { ascending: true })
    .order('nome', { ascending: true });

  if (!includeInactive) query = query.eq('ativo', true);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function findRoleById(id) {
  const { data, error } = await supabaseAdmin
    .from('cargos')
    .select('id, nome, descricao, categoria_profissional, ativo, created_at, updated_at, deleted_at')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function createRole(payload) {
  const { data, error } = await supabaseAdmin
    .from('cargos')
    .insert(payload)
    .select('id, nome, descricao, categoria_profissional, ativo, created_at, updated_at, deleted_at')
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
    .select('id, nome, descricao, categoria_profissional, ativo, created_at, updated_at, deleted_at')
    .single();

  if (error) throw error;
  return data;
}

async function listAdminSpecialties({ includeInactive = true } = {}) {
  let query = supabaseAdmin
    .from('especialidades')
    .select('id, cargo_id, nome, descricao, ativo, tenant_id, taxonomy_category_key, is_official, is_custom, metadata, created_at, updated_at, deleted_at, cargo:cargos(id,nome,ativo,categoria_profissional,deleted_at)')
    .is('tenant_id', null)
    .is('deleted_at', null)
    .order('nome', { ascending: true });

  if (!includeInactive) query = query.eq('ativo', true);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function findSpecialtyById(id) {
  const { data, error } = await supabaseAdmin
    .from('especialidades')
    .select('id, cargo_id, nome, descricao, ativo, tenant_id, taxonomy_category_key, is_official, is_custom, metadata, created_at, updated_at, deleted_at, cargo:cargos(id,nome,ativo,categoria_profissional,deleted_at)')
    .eq('id', id)
    .is('tenant_id', null)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function createSpecialty(payload) {
  const { data, error } = await supabaseAdmin
    .from('especialidades')
    .insert(payload)
    .select('id, cargo_id, nome, descricao, ativo, tenant_id, taxonomy_category_key, is_official, is_custom, metadata, created_at, updated_at, deleted_at, cargo:cargos(id,nome,ativo,categoria_profissional,deleted_at)')
    .single();

  if (error) throw error;
  return data;
}

async function updateSpecialty(id, payload) {
  const { data, error } = await supabaseAdmin
    .from('especialidades')
    .update(payload)
    .eq('id', id)
    .is('tenant_id', null)
    .is('deleted_at', null)
    .select('id, cargo_id, nome, descricao, ativo, tenant_id, taxonomy_category_key, is_official, is_custom, metadata, created_at, updated_at, deleted_at, cargo:cargos(id,nome,ativo,categoria_profissional,deleted_at)')
    .single();

  if (error) throw error;
  return data;
}

async function listCatalogSpecialties(catalogId) {
  const { data, error } = await supabaseAdmin
    .from('servico_catalogo_especialidades')
    .select('id, servico_catalogo_id, especialidade_id, ativo, metadata, especialidade:especialidades(id,nome,ativo,tenant_id,taxonomy_category_key)')
    .eq('servico_catalogo_id', catalogId);

  if (error) throw error;
  return data || [];
}

async function replaceCatalogSpecialties(catalogId, specialtyIds) {
  const existing = await listCatalogSpecialties(catalogId);
  const wanted = new Set(specialtyIds);

  for (const current of existing) {
    const active = wanted.has(current.especialidade_id);
    const { error } = await supabaseAdmin
      .from('servico_catalogo_especialidades')
      .update({ ativo: active })
      .eq('id', current.id);
    if (error) throw error;
    wanted.delete(current.especialidade_id);
  }

  if (wanted.size) {
    const { error } = await supabaseAdmin
      .from('servico_catalogo_especialidades')
      .insert([...wanted].map((especialidadeId) => ({
        servico_catalogo_id: catalogId,
        especialidade_id: especialidadeId,
        ativo: true,
        metadata: { origem: 'masteradmin_governance' }
      })));
    if (error) throw error;
  }

  return listCatalogSpecialties(catalogId);
}

async function listTenantActiveOffers(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('servico_tenants')
    .select(`
      id,
      tenant_id,
      servico_catalogo_id,
      ativo,
      servico_catalogo:servicos_catalogo(
        id,
        codigo_canonico,
        nome,
        categoria_key,
        natureza,
        ativo
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('ativo', true);

  if (error) throw error;
  return data || [];
}

module.exports = {
  listTypes,
  findTypeById,
  findTypeBySlug,
  createType,
  updateType,
  listTypeServices,
  replaceTypeServices,
  listActiveProfilesByBusinessTypeIds,
  listRecommendedProfileServicesByProfileIds,
  listTenantTypes,
  replaceTenantTypes,
  listAllCatalog,
  createCatalog,
  updateCatalog,
  listSpecialties,
  listRoles,
  findRoleById,
  createRole,
  updateRole,
  listAdminSpecialties,
  findSpecialtyById,
  createSpecialty,
  updateSpecialty,
  listCatalogSpecialties,
  replaceCatalogSpecialties,
  listTenantActiveOffers
};
