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
    .select('id, nome_fantasia, slug, status')
    .eq('id', tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function listProfessionalServices(tenantId, professionalIds) {
  if (!professionalIds.length) return [];

  const { data, error } = await supabaseAdmin
    .from('profissional_servicos')
    .select('profissional_id, servico_id')
    .eq('tenant_id', tenantId)
    .in('profissional_id', professionalIds)
    .eq('ativo', true)
    .is('deleted_at', null);

  if (error) throw error;
  return data || [];
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
    .from('servicos')
    .select('id, tenant_id, nome, duracao_minutos, preco, categoria, taxonomy_category_key, taxonomy_service_key, is_official, is_custom, ordem_exibicao')
    .eq('tenant_id', tenantId)
    .eq('ativo', true)
    .eq('permite_online', true)
    .is('deleted_at', null)
    .order('ordem_exibicao', { ascending: true })
    .order('nome', { ascending: true });

  if (error) throw error;
  return data || [];
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
    .from('servico_especialidades')
    .select('servico_id, especialidade_id')
    .eq('tenant_id', tenantId)
    .in('servico_id', serviceIds)
    .eq('ativo', true)
    .is('deleted_at', null);

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
  listProfessionalServices,
  listBookingProfessionals,
  listOnlineServices,
  listProfessionalSpecialties,
  listServiceSpecialties,
  listSpecialties,
  listTenantSpecialtyStatuses,
  listActiveMemberships,
  recordBookingAttribution
};
