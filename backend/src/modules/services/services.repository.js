const { supabaseAdmin } = require('../../config/supabase');

const OFFER_SELECT = `
  id,
  tenant_id,
  servico_catalogo_id,
  ativo,
  metadata,
  created_at,
  updated_at,
  servico_catalogo:servicos_catalogo(
    id,
    codigo_canonico,
    nome,
    categoria_key,
    descricao,
    natureza,
    ativo,
    metadata,
    created_at,
    updated_at
  ),
  configuracoes:servico_tenant_especialidades(
    id,
    servico_tenant_id,
    especialidade_id,
    preco,
    duracao_minutos,
    dias_retorno_recomendado,
    aceita_agendamento_online,
    ativo,
    metadata,
    especialidade:especialidades(
      id,
      cargo_id,
      nome,
      descricao,
      ativo,
      tenant_id,
      taxonomy_category_key,
      is_official,
      is_custom,
      cargo:cargos(id,nome,descricao,categoria_profissional,ativo,deleted_at)
    )
  )
`;

const CATALOG_SELECT = `
  id,
  codigo_canonico,
  nome,
  categoria_key,
  descricao,
  natureza,
  ativo,
  metadata,
  compatibilidades:servico_catalogo_especialidades(
    id,
    especialidade_id,
    ativo,
    metadata,
    especialidade:especialidades(
      id,
      cargo_id,
      nome,
      descricao,
      ativo,
      tenant_id,
      taxonomy_category_key,
      is_official,
      is_custom,
      cargo:cargos(id,nome,descricao,categoria_profissional,ativo,deleted_at)
    )
  )
`;

async function listCatalog() {
  const { data, error } = await supabaseAdmin
    .from('servicos_catalogo')
    .select(CATALOG_SELECT)
    .eq('ativo', true)
    .order('categoria_key', { ascending: true })
    .order('nome', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function findCatalogById(id) {
  const { data, error } = await supabaseAdmin
    .from('servicos_catalogo')
    .select(CATALOG_SELECT)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findCatalogByCode(code) {
  const { data, error } = await supabaseAdmin
    .from('servicos_catalogo')
    .select(CATALOG_SELECT)
    .eq('codigo_canonico', code)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findCatalogByNameAndCategory(nome, categoriaKey) {
  const { data, error } = await supabaseAdmin
    .from('servicos_catalogo')
    .select(CATALOG_SELECT)
    .ilike('nome', nome)
    .eq('categoria_key', categoriaKey)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function createCatalog(payload) {
  const { data, error } = await supabaseAdmin
    .from('servicos_catalogo')
    .insert(payload)
    .select(CATALOG_SELECT)
    .single();

  if (error) throw error;
  return data;
}

async function upsertCatalogCompatibilities(catalogId, specialtyIds = [], metadata = {}) {
  if (!specialtyIds.length) return [];

  const { data, error } = await supabaseAdmin
    .from('servico_catalogo_especialidades')
    .upsert(
      specialtyIds.map((especialidadeId) => ({
        servico_catalogo_id: catalogId,
        especialidade_id: especialidadeId,
        ativo: true,
        metadata
      })),
      { onConflict: 'servico_catalogo_id,especialidade_id' }
    )
    .select(`
      id,
      servico_catalogo_id,
      especialidade_id,
      ativo,
      metadata,
      especialidade:especialidades(
        id,
        cargo_id,
        nome,
        descricao,
        ativo,
        tenant_id,
        taxonomy_category_key,
        is_official,
        is_custom,
        cargo:cargos(id,nome,descricao,categoria_profissional,ativo,deleted_at)
      )
    `);

  if (error) throw error;
  return data || [];
}

async function listByTenant(tenantId, options = {}) {
  let query = supabaseAdmin
    .from('servico_tenants')
    .select(OFFER_SELECT)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });

  if (options.activeOnly !== false) {
    query = query.eq('ativo', true);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

async function findOfferById(tenantId, id) {
  const { data, error } = await supabaseAdmin
    .from('servico_tenants')
    .select(OFFER_SELECT)
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findOfferByCatalogId(tenantId, catalogId) {
  const { data, error } = await supabaseAdmin
    .from('servico_tenants')
    .select(OFFER_SELECT)
    .eq('tenant_id', tenantId)
    .eq('servico_catalogo_id', catalogId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function upsertOffer(tenantId, catalogId, payload = {}) {
  const { data, error } = await supabaseAdmin
    .from('servico_tenants')
    .upsert({
      tenant_id: tenantId,
      servico_catalogo_id: catalogId,
      ativo: payload.ativo !== false,
      metadata: payload.metadata || {}
    }, { onConflict: 'tenant_id,servico_catalogo_id' })
    .select(OFFER_SELECT)
    .single();

  if (error) throw error;
  return data;
}

async function updateOffer(tenantId, offerId, payload) {
  const { data, error } = await supabaseAdmin
    .from('servico_tenants')
    .update(payload)
    .eq('tenant_id', tenantId)
    .eq('id', offerId)
    .select(OFFER_SELECT)
    .single();

  if (error) throw error;
  return data;
}

async function listCompatibleSpecialties(catalogId) {
  const { data, error } = await supabaseAdmin
    .from('servico_catalogo_especialidades')
    .select(`
      id,
      servico_catalogo_id,
      especialidade_id,
      ativo,
      metadata,
      especialidade:especialidades(
        id,
        cargo_id,
        nome,
        descricao,
        ativo,
        tenant_id,
        taxonomy_category_key,
        is_official,
        is_custom,
        cargo:cargos(id,nome,descricao,categoria_profissional,ativo,deleted_at)
      )
    `)
    .eq('servico_catalogo_id', catalogId)
    .eq('ativo', true);

  if (error) throw error;
  return data || [];
}

async function replaceConfigurations(offerId, configurations = []) {
  if (!configurations.length) return [];

  const { data, error } = await supabaseAdmin
    .from('servico_tenant_especialidades')
    .upsert(
      configurations.map((item) => ({
        servico_tenant_id: offerId,
        especialidade_id: item.especialidade_id,
        preco: item.preco ?? null,
        duracao_minutos: item.duracao_minutos ?? null,
        dias_retorno_recomendado: item.dias_retorno_recomendado ?? null,
        aceita_agendamento_online: item.aceita_agendamento_online !== false,
        ativo: item.ativo !== false,
        metadata: item.metadata || {}
      })),
      { onConflict: 'servico_tenant_id,especialidade_id' }
    )
    .select('*, especialidade:especialidades(*, cargo:cargos(*))');

  if (error) throw error;
  return data || [];
}

async function deactivateConfigurations(offerId, exceptSpecialtyIds = []) {
  let query = supabaseAdmin
    .from('servico_tenant_especialidades')
    .update({ ativo: false })
    .eq('servico_tenant_id', offerId);

  if (exceptSpecialtyIds.length) {
    query = query.not('especialidade_id', 'in', `(${exceptSpecialtyIds.join(',')})`);
  }

  const { error } = await query;
  if (error) throw error;
}

module.exports = {
  listCatalog,
  findCatalogById,
  findCatalogByCode,
  findCatalogByNameAndCategory,
  createCatalog,
  upsertCatalogCompatibilities,
  listByTenant,
  findOfferById,
  findOfferByCatalogId,
  upsertOffer,
  updateOffer,
  listCompatibleSpecialties,
  replaceConfigurations,
  deactivateConfigurations
};
