const { supabaseAdmin } = require('../../config/supabase');

async function createAssinatura(payload) {
  const { data, error } = await supabaseAdmin.from('assinaturas').insert(payload).select().single();
  if (error) throw error;
  return data;
}

async function createConfiguracaoTenant(payload) {
  const { data, error } = await supabaseAdmin.from('configuracoes_tenant').insert(payload).select().single();
  if (error) throw error;
  return data;
}

async function findConfiguracaoTenant(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('configuracoes_tenant')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function updateConfiguracaoTenant(tenantId, payload) {
  const { data, error } = await supabaseAdmin
    .from('configuracoes_tenant')
    .update(payload)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function createProfissional(payload) {
  const { data, error } = await supabaseAdmin.from('profissionais').insert(payload).select().single();
  if (error) throw error;
  return data;
}

async function findProfessionalByUser(tenantId, usuarioId) {
  const { data, error } = await supabaseAdmin
    .from('profissionais')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('usuario_id', usuarioId)
    .eq('ativo', true)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findServicesByTenant(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('servico_tenants')
    .select(`
      id,
      tenant_id,
      servico_catalogo_id,
      ativo,
      metadata,
      servico_catalogo:servicos_catalogo(id,codigo_canonico,nome,categoria_key,natureza,ativo,metadata),
      configuracoes:servico_tenant_especialidades(
        id,
        servico_tenant_id,
        especialidade_id,
        preco,
        duracao_minutos,
        aceita_agendamento_online,
        ativo,
        metadata,
        especialidade:especialidades(id,nome,ativo,deleted_at,tenant_id,taxonomy_category_key)
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('ativo', true)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

async function findCatalogByNameAndCategory(nome, categoriaKey) {
  const { data, error } = await supabaseAdmin
    .from('servicos_catalogo')
    .select('*')
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
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function upsertCatalogCompatibilities(catalogId, specialtyIds = [], metadata = {}) {
  const uniqueIds = [...new Set(specialtyIds.filter(Boolean))];
  if (!uniqueIds.length) return [];

  const { data, error } = await supabaseAdmin
    .from('servico_catalogo_especialidades')
    .upsert(
      uniqueIds.map((especialidadeId) => ({
        servico_catalogo_id: catalogId,
        especialidade_id: especialidadeId,
        ativo: true,
        metadata
      })),
      { onConflict: 'servico_catalogo_id,especialidade_id' }
    )
    .select();

  if (error) throw error;
  return data || [];
}

async function listCatalogCompatibilityIds(catalogId) {
  const { data, error } = await supabaseAdmin
    .from('servico_catalogo_especialidades')
    .select('especialidade_id')
    .eq('servico_catalogo_id', catalogId)
    .eq('ativo', true);

  if (error) throw error;
  return (data || []).map((item) => item.especialidade_id);
}

async function upsertServiceOffer(tenantId, catalogId, payload = {}) {
  const { data, error } = await supabaseAdmin
    .from('servico_tenants')
    .upsert({
      tenant_id: tenantId,
      servico_catalogo_id: catalogId,
      ativo: payload.ativo !== false,
      metadata: payload.metadata || {}
    }, { onConflict: 'tenant_id,servico_catalogo_id' })
    .select(`
      id,
      tenant_id,
      servico_catalogo_id,
      ativo,
      metadata,
      servico_catalogo:servicos_catalogo(id,codigo_canonico,nome,categoria_key,natureza,ativo,metadata),
      configuracoes:servico_tenant_especialidades(
        id,
        servico_tenant_id,
        especialidade_id,
        preco,
        duracao_minutos,
        aceita_agendamento_online,
        ativo,
        metadata,
        especialidade:especialidades(id,nome,ativo,deleted_at,tenant_id,taxonomy_category_key)
      )
    `)
    .single();

  if (error) throw error;
  return data;
}

async function listSpecialties() {
  const { data, error } = await supabaseAdmin
    .from('especialidades')
    .select('*, cargo:cargos(*)')
    .eq('ativo', true)
    .is('deleted_at', null);

  if (error) throw error;
  return data || [];
}

async function replaceServiceOfferConfigurations(offerId, specialtyIds = [], defaults = {}) {
  const uniqueIds = [...new Set(specialtyIds.filter(Boolean))];
  if (!uniqueIds.length) return [];

  const { data, error } = await supabaseAdmin
    .from('servico_tenant_especialidades')
    .upsert(
      uniqueIds.map((especialidadeId) => ({
        servico_tenant_id: offerId,
        especialidade_id: especialidadeId,
        preco: defaults.preco ?? null,
        duracao_minutos: defaults.duracao_minutos ?? null,
        dias_retorno_recomendado: defaults.dias_retorno_recomendado ?? null,
        aceita_agendamento_online: defaults.aceita_agendamento_online !== false,
        ativo: true,
        metadata: defaults.metadata || {}
      })),
      { onConflict: 'servico_tenant_id,especialidade_id' }
    )
    .select('*, especialidade:especialidades(*)');

  if (error) throw error;
  return data || [];
}

async function createProfissionalServiceSpecialtyLinks(payloads) {
  if (!payloads.length) return [];
  const { data, error } = await supabaseAdmin
    .from('profissional_servico_especialidades')
    .upsert(payloads, { onConflict: 'profissional_id,servico_tenant_especialidade_id' })
    .select('*, servico_tenant_especialidade:servico_tenant_especialidades(*, servico_tenant:servico_tenants(*, servico_catalogo:servicos_catalogo(*)), especialidade:especialidades(*))');
  if (error) throw error;
  return data || [];
}

async function findProfessionalServices(tenantId, profissionalId) {
  const { data, error } = await supabaseAdmin
    .from('profissional_servico_especialidades')
    .select('*, servico_tenant_especialidade:servico_tenant_especialidades(*, servico_tenant:servico_tenants(*, servico_catalogo:servicos_catalogo(*)), especialidade:especialidades(*))')
    .eq('tenant_id', tenantId)
    .eq('profissional_id', profissionalId)
    .eq('ativo', true)
    .is('deleted_at', null);

  if (error) throw error;
  return data;
}

async function deactivateProfessionalServiceSpecialtyLinks(tenantId, profissionalId, keepCombinationIds = []) {
  const now = new Date().toISOString();
  let query = supabaseAdmin
    .from('profissional_servico_especialidades')
    .update({
      ativo: false,
      deleted_at: now
    })
    .eq('tenant_id', tenantId)
    .eq('profissional_id', profissionalId)
    .is('deleted_at', null);

  if (keepCombinationIds.length) {
    query = query.not('servico_tenant_especialidade_id', 'in', `(${keepCombinationIds.join(',')})`);
  }

  const { error } = await query;
  if (error) throw error;
}

async function createLinkAgendamento(payload) {
  const { data, error } = await supabaseAdmin.from('links_agendamento').insert(payload).select().single();
  if (error) throw error;
  return data;
}

async function findBookingLinkByTenant(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('links_agendamento')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('origem', 'onboarding')
    .eq('ativo', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findScalesByProfessional(tenantId, profissionalId) {
  const { data, error } = await supabaseAdmin
    .from('escalas_semanais')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('profissional_id', profissionalId)
    .eq('ativo', true)
    .is('deleted_at', null)
    .order('dia_semana', { ascending: true });

  if (error) throw error;
  return data;
}

async function createScales(payloads) {
  if (!payloads.length) return [];
  const { data, error } = await supabaseAdmin.from('escalas_semanais').insert(payloads).select();
  if (error) throw error;
  return data;
}

async function upsertSteps(payloads) {
  const { data, error } = await supabaseAdmin
    .from('onboarding_steps')
    .upsert(payloads, { onConflict: 'tenant_id,step' })
    .select();

  if (error) throw error;
  return data;
}

async function listSteps(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('onboarding_steps')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

async function updateStep(tenantId, step, payload) {
  const { data, error } = await supabaseAdmin
    .from('onboarding_steps')
    .update(payload)
    .eq('tenant_id', tenantId)
    .eq('step', step)
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = {
  createAssinatura,
  createConfiguracaoTenant,
  findConfiguracaoTenant,
  updateConfiguracaoTenant,
  createProfissional,
  findProfessionalByUser,
  findServicesByTenant,
  findCatalogByNameAndCategory,
  createCatalog,
  upsertCatalogCompatibilities,
  listCatalogCompatibilityIds,
  upsertServiceOffer,
  listSpecialties,
  replaceServiceOfferConfigurations,
  createProfissionalServiceSpecialtyLinks,
  findProfessionalServices,
  deactivateProfessionalServiceSpecialtyLinks,
  createLinkAgendamento,
  findBookingLinkByTenant,
  findScalesByProfessional,
  createScales,
  upsertSteps,
  listSteps,
  updateStep
};
