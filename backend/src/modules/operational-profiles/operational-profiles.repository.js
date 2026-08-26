const { supabaseAdmin } = require('../../config/supabase');

async function findProfileByBusinessType(tipoNegocioId) {
  const { data, error } = await supabaseAdmin
    .from('tipo_negocio_perfis_operacionais')
    .select('*, tipo_negocio:tipos_negocio(id,nome,slug,ativo)')
    .eq('tipo_negocio_id', tipoNegocioId)
    .eq('ativo', true)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function listProfiles({ includeInactive = false } = {}) {
  let query = supabaseAdmin
    .from('tipo_negocio_perfis_operacionais')
    .select('*, tipo_negocio:tipos_negocio(id,nome,slug,ativo)')
    .is('deleted_at', null)
    .order('nome', { ascending: true });

  if (!includeInactive) query = query.eq('ativo', true);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function updateProfile(id, payload) {
  const { data, error } = await supabaseAdmin
    .from('tipo_negocio_perfis_operacionais')
    .update(payload)
    .eq('id', id)
    .is('deleted_at', null)
    .select('*, tipo_negocio:tipos_negocio(id,nome,slug,ativo)')
    .single();

  if (error) throw error;
  return data;
}

async function findProfileById(id) {
  const { data, error } = await supabaseAdmin
    .from('tipo_negocio_perfis_operacionais')
    .select('*, tipo_negocio:tipos_negocio(id,nome,slug,ativo)')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function listProfileServices(profileId) {
  const { data, error } = await supabaseAdmin
    .from('perfil_operacional_servicos')
    .select('*, servico_catalogo:servicos_catalogo(id,codigo_canonico,nome,categoria_key,natureza,ativo,metadata)')
    .eq('perfil_operacional_id', profileId)
    .eq('ativo', true)
    .is('deleted_at', null)
    .order('prioridade', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function listProfileRoles(profileId) {
  const { data, error } = await supabaseAdmin
    .from('perfil_operacional_cargos')
    .select('*, cargo:cargos(id,nome,categoria_profissional,ativo,deleted_at)')
    .eq('perfil_operacional_id', profileId)
    .eq('ativo', true)
    .is('deleted_at', null)
    .order('prioridade', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function listProfileDefaults(profileId) {
  const { data, error } = await supabaseAdmin
    .from('perfil_operacional_defaults')
    .select('*')
    .eq('perfil_operacional_id', profileId)
    .eq('ativo', true)
    .is('deleted_at', null);

  if (error) throw error;
  return data || [];
}

async function findCatalogServiceForProfile(profileId, catalogId) {
  const profile = await findProfileById(profileId);
  if (!profile) return null;

  const { data, error } = await supabaseAdmin
    .from('tipo_negocio_servicos_catalogo')
    .select('id,tipo_negocio_id,servico_catalogo_id,ativo,recomendado,ordem_exibicao')
    .eq('tipo_negocio_id', profile.tipo_negocio_id)
    .eq('servico_catalogo_id', catalogId)
    .eq('ativo', true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findCatalogSpecialty(catalogId, specialtyId) {
  const { data, error } = await supabaseAdmin
    .from('servico_catalogo_especialidades')
    .select('id,servico_catalogo_id,especialidade_id,ativo')
    .eq('servico_catalogo_id', catalogId)
    .eq('especialidade_id', specialtyId)
    .eq('ativo', true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findCargoSpecialty(cargoId, specialtyId) {
  const { data, error } = await supabaseAdmin
    .from('cargo_especialidades')
    .select('id,cargo_id,especialidade_id,ativo,principal,deleted_at')
    .eq('cargo_id', cargoId)
    .eq('especialidade_id', specialtyId)
    .eq('ativo', true)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function upsertProfileService(profileId, input) {
  const { data, error } = await supabaseAdmin
    .from('perfil_operacional_servicos')
    .upsert({
      perfil_operacional_id: profileId,
      servico_catalogo_id: input.servico_catalogo_id,
      recomendado: input.recomendado !== false,
      obrigatorio: input.obrigatorio === true,
      ativo: input.ativo !== false,
      prioridade: input.prioridade ?? 0,
      origem: input.origem || 'masteradmin_taxonomy_governance',
      metadata: input.metadata || {},
      deleted_at: null
    }, { onConflict: 'perfil_operacional_id,servico_catalogo_id' })
    .select('*, servico_catalogo:servicos_catalogo(id,codigo_canonico,nome,categoria_key,natureza,ativo,metadata)')
    .single();

  if (error) throw error;
  return data;
}

async function upsertProfileRole(profileId, input) {
  const { data, error } = await supabaseAdmin
    .from('perfil_operacional_cargos')
    .upsert({
      perfil_operacional_id: profileId,
      cargo_id: input.cargo_id,
      recomendado: input.recomendado !== false,
      principal: input.principal === true,
      ativo: input.ativo !== false,
      prioridade: input.prioridade ?? 0,
      origem: input.origem || 'masteradmin_taxonomy_governance',
      metadata: input.metadata || {},
      deleted_at: null
    }, { onConflict: 'perfil_operacional_id,cargo_id' })
    .select('*, cargo:cargos(id,nome,categoria_profissional,ativo,deleted_at)')
    .single();

  if (error) throw error;
  return data;
}

async function createProfileDefault(payload) {
  const { data, error } = await supabaseAdmin
    .from('perfil_operacional_defaults')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function findProfileDefaultById(id) {
  const { data, error } = await supabaseAdmin
    .from('perfil_operacional_defaults')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function updateProfileDefault(id, payload) {
  const { data, error } = await supabaseAdmin
    .from('perfil_operacional_defaults')
    .update(payload)
    .eq('id', id)
    .is('deleted_at', null)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function listCatalogSpecialties(catalogIds) {
  if (!catalogIds.length) return [];
  const { data, error } = await supabaseAdmin
    .from('servico_catalogo_especialidades')
    .select('servico_catalogo_id, especialidade_id, especialidade:especialidades(id,nome,ativo,tenant_id,taxonomy_category_key,deleted_at)')
    .in('servico_catalogo_id', catalogIds)
    .eq('ativo', true);

  if (error) throw error;
  return (data || []).filter((item) => item.especialidade?.ativo !== false && !item.especialidade?.deleted_at);
}

async function listTenantTypes(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('tenant_tipos_negocio')
    .select('tipo_negocio_id, principal, ativo, tipo_negocio:tipos_negocio(id,nome,slug,ativo)')
    .eq('tenant_id', tenantId)
    .eq('ativo', true)
    .order('principal', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function listTenantOffers(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('servico_tenants')
    .select(`
      id,
      tenant_id,
      servico_catalogo_id,
      ativo,
      metadata,
      servico_catalogo:servicos_catalogo(id,codigo_canonico,nome,categoria_key,natureza,ativo),
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
        especialidade:especialidades(id,nome,ativo,tenant_id,taxonomy_category_key,deleted_at)
      )
    `)
    .eq('tenant_id', tenantId);

  if (error) throw error;
  return data || [];
}

async function upsertTenantOffer(tenantId, catalogId, metadata = {}) {
  const { data, error } = await supabaseAdmin
    .from('servico_tenants')
    .upsert({
      tenant_id: tenantId,
      servico_catalogo_id: catalogId,
      ativo: true,
      metadata
    }, { onConflict: 'tenant_id,servico_catalogo_id' })
    .select('id,tenant_id,servico_catalogo_id,ativo,metadata')
    .single();

  if (error) throw error;
  return data;
}

async function upsertTenantSpecialtyConfig(offerId, specialtyId, defaults) {
  const { data, error } = await supabaseAdmin
    .from('servico_tenant_especialidades')
    .upsert({
      servico_tenant_id: offerId,
      especialidade_id: specialtyId,
      preco: defaults.preco ?? null,
      duracao_minutos: defaults.duracao_minutos ?? null,
      dias_retorno_recomendado: defaults.dias_retorno_recomendado ?? null,
      aceita_agendamento_online: defaults.aceita_agendamento_online !== false,
      ativo: true,
      metadata: defaults.metadata || {}
    }, { onConflict: 'servico_tenant_id,especialidade_id' })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function linkProfessionalToConfigs(tenantId, profissionalId, configIds, metadata = {}) {
  const uniqueIds = [...new Set((configIds || []).filter(Boolean))];
  if (!profissionalId || !uniqueIds.length) return [];

  const { data, error } = await supabaseAdmin
    .from('profissional_servico_especialidades')
    .upsert(uniqueIds.map((configId) => ({
      tenant_id: tenantId,
      profissional_id: profissionalId,
      servico_tenant_especialidade_id: configId,
      ativo: true,
      deleted_at: null,
      metadata
    })), { onConflict: 'profissional_id,servico_tenant_especialidade_id' })
    .select('*');

  if (error) throw error;
  return data || [];
}

async function listAppointments(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('agendamentos')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('id', { ascending: true });

  if (error) throw error;
  return data || [];
}

module.exports = {
  findProfileByBusinessType,
  findProfileById,
  listProfiles,
  updateProfile,
  listProfileServices,
  listProfileRoles,
  listProfileDefaults,
  findCatalogServiceForProfile,
  findCatalogSpecialty,
  findCargoSpecialty,
  upsertProfileService,
  upsertProfileRole,
  createProfileDefault,
  findProfileDefaultById,
  updateProfileDefault,
  listCatalogSpecialties,
  listTenantTypes,
  listTenantOffers,
  upsertTenantOffer,
  upsertTenantSpecialtyConfig,
  linkProfessionalToConfigs,
  listAppointments
};
