const { supabaseAdmin } = require('../../config/supabase');
const clientIdentityRepository = require('./client-identity.repository');

async function findActiveLink(slug) {
  const { data, error } = await supabaseAdmin
    .from('links_agendamento')
    .select('*')
    .ilike('slug', slug)
    .eq('ativo', true)
    .eq('acesso_publico', true)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findTenant(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('id, nome_fantasia, slug, status, ativo, deleted_at')
    .eq('id', tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function listBookingProfessionals(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('profissionais')
    .select('id, tenant_id, usuario_id, nome_publico, cargo, cargo_id, ordem_exibicao, metadata')
    .eq('tenant_id', tenantId)
    .eq('ativo', true)
    .eq('aceita_agendamento_online', true)
    .is('deleted_at', null)
    .order('ordem_exibicao', { ascending: true })
    .order('nome_publico', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function listOnlineServices(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('servico_tenants')
    .select(`
      id,
      tenant_id,
      servico_catalogo_id,
      ativo,
      metadata,
      servico_catalogo:servicos_catalogo(id,codigo_canonico,nome,categoria_key,natureza,ativo),
      especialidades_config:servico_tenant_especialidades(
        id,
        servico_tenant_id,
        especialidade_id,
        preco,
        duracao_minutos,
        dias_retorno_recomendado,
        aceita_agendamento_online,
        ativo,
        especialidade:especialidades(id,nome,ativo,deleted_at)
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('ativo', true)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map((item) => {
    const catalog = item.servico_catalogo || {};
    const configs = (item.especialidades_config || []).filter((config) => (
      config.ativo !== false
      && config.aceita_agendamento_online !== false
      && Number(config.duracao_minutos) > 0
      && config.especialidade?.ativo !== false
      && !config.especialidade?.deleted_at
    ));

    return {
      id: item.id,
      tenant_id: item.tenant_id,
      servico_tenant_id: item.id,
      servico_catalogo_id: item.servico_catalogo_id,
      codigo_canonico: catalog.codigo_canonico,
      nome: catalog.nome,
      categoria: catalog.categoria_key,
      taxonomy_category_key: catalog.categoria_key,
      natureza: catalog.natureza,
      ativo: item.ativo !== false,
      permite_online: configs.length > 0,
      duracao_minutos: configs[0]?.duracao_minutos ?? null,
      preco: configs[0]?.preco ?? null,
      especialidades_config: configs
    };
  }).filter((item) => item.permite_online);
}

async function listProfessionalSpecialties(tenantId, professionalIds) {
  if (!professionalIds.length) return [];

  const { data, error } = await supabaseAdmin
    .from('profissional_especialidades')
    .select('profissional_id, especialidade_id')
    .eq('tenant_id', tenantId)
    .in('profissional_id', professionalIds)
    .eq('ativo', true)
    .is('deleted_at', null);

  if (error) throw error;
  return data || [];
}

async function listServiceSpecialties(tenantId, serviceIds) {
  if (!serviceIds.length) return [];

  const { data, error } = await supabaseAdmin
    .from('servico_tenant_especialidades')
    .select('id, servico_tenant_id, especialidade_id, duracao_minutos, preco, dias_retorno_recomendado, aceita_agendamento_online, ativo, especialidade:especialidades(id,nome)')
    .in('servico_tenant_id', serviceIds)
    .eq('ativo', true)
    .eq('aceita_agendamento_online', true);

  if (error) throw error;
  return data || [];
}

async function listSpecialties(specialtyIds, tenantId) {
  if (!specialtyIds.length) return [];

  const { data, error } = await supabaseAdmin
    .from('especialidades')
    .select('id, tenant_id, ativo, deleted_at, taxonomy_category_key, is_official, is_custom')
    .in('id', specialtyIds)
    .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);

  if (error) throw error;
  return data || [];
}

async function listTenantSpecialtyStatuses(tenantId, specialtyIds) {
  if (!specialtyIds.length) return [];

  const { data, error } = await supabaseAdmin
    .from('tenant_especialidades')
    .select('especialidade_id, ativo')
    .eq('tenant_id', tenantId)
    .in('especialidade_id', specialtyIds);

  if (error) throw error;
  return data || [];
}

async function listActiveMemberships(tenantId, userIds) {
  if (!userIds.length) return [];

  const { data, error } = await supabaseAdmin
    .from('tenant_memberships')
    .select('usuario_id, profissional_id, role, status')
    .eq('tenant_id', tenantId)
    .in('usuario_id', userIds)
    .eq('status', 'ativo');

  if (error) throw error;
  return data || [];
}

async function recordBookingAttribution(payload) {
  return clientIdentityRepository.recordAccess({
    ...payload,
    event: 'agendamento'
  });
}

module.exports = {
  findActiveLink,
  findTenant,
  listBookingProfessionals,
  listOnlineServices,
  listProfessionalSpecialties,
  listServiceSpecialties,
  listSpecialties,
  listTenantSpecialtyStatuses,
  listActiveMemberships,
  recordBookingAttribution
};
