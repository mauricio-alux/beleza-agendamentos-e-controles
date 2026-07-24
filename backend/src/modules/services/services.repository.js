const { supabaseAdmin } = require('../../config/supabase');

async function listByTenant(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('servicos')
    .select(`
      *,
      servico_especialidades(
        id,
        especialidade_id,
        ativo,
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
          cargo:cargos(id,nome,descricao,categoria_profissional,ativo)
        )
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('ativo', true)
    .is('deleted_at', null)
    .order('ordem_exibicao', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function listBySpecialtyIds(tenantId, specialtyIds = []) {
  if (!specialtyIds.length) return [];

  const { data, error } = await supabaseAdmin
    .from('servico_especialidades')
    .select(`
      servico:servicos(
        *,
        servico_especialidades(
          id,
          especialidade_id,
          ativo,
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
            cargo:cargos(id,nome,descricao,categoria_profissional,ativo)
          )
        )
      )
    `)
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

  return Array.from(servicesById.values()).sort((a, b) => {
    const orderDiff = (a.ordem_exibicao || 0) - (b.ordem_exibicao || 0);
    if (orderDiff !== 0) return orderDiff;
    return String(a.created_at || '').localeCompare(String(b.created_at || ''));
  });
}

async function create(tenantId, payload) {
  const { data, error } = await supabaseAdmin
    .from('servicos')
    .insert({ tenant_id: tenantId, ...payload })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function listActiveByCategory(tenantId, category) {
  let query = supabaseAdmin
    .from('servicos')
    .select('id,nome,categoria')
    .eq('tenant_id', tenantId)
    .eq('ativo', true)
    .is('deleted_at', null);

  query = category
    ? query.eq('categoria', category)
    : query.is('categoria', null);

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

async function replaceSpecialties(tenantId, serviceId, specialtyIds = []) {
  const now = new Date().toISOString();

  const { error: deleteError } = await supabaseAdmin
    .from('servico_especialidades')
    .update({
      ativo: false,
      deleted_at: now
    })
    .eq('tenant_id', tenantId)
    .eq('servico_id', serviceId)
    .is('deleted_at', null);

  if (deleteError) throw deleteError;

  const uniqueIds = [...new Set(specialtyIds.filter(Boolean))];
  if (!uniqueIds.length) return [];

  const { data, error } = await supabaseAdmin
    .from('servico_especialidades')
    .upsert(
      uniqueIds.map((especialidadeId) => ({
        tenant_id: tenantId,
        servico_id: serviceId,
        especialidade_id: especialidadeId,
        ativo: true,
        deleted_at: null
      })),
      { onConflict: 'tenant_id,servico_id,especialidade_id' }
    )
    .select('*, especialidade:especialidades(*)');

  if (error) throw error;
  return data || [];
}

async function findById(tenantId, id) {
  const { data, error } = await supabaseAdmin
    .from('servicos')
    .select(`
      *,
      servico_especialidades(
        id,
        especialidade_id,
        ativo,
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
          cargo:cargos(id,nome,descricao,categoria_profissional,ativo)
        )
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .eq('ativo', true)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function update(tenantId, id, payload) {
  const { data, error } = await supabaseAdmin
    .from('servicos')
    .update(payload)
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function softDelete(tenantId, id) {
  const { data, error } = await supabaseAdmin
    .from('servicos')
    .update({
      ativo: false,
      deleted_at: new Date().toISOString()
    })
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = {
  listByTenant,
  listBySpecialtyIds,
  listActiveByCategory,
  create,
  findById,
  replaceSpecialties,
  update,
  softDelete
};
