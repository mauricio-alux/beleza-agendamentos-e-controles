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

async function createServicos(payloads) {
  if (!payloads.length) return [];
  const { data, error } = await supabaseAdmin.from('servicos').insert(payloads).select();
  if (error) throw error;
  return data;
}

async function updateServico(tenantId, id, payload) {
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

async function updateProfissionalServico(tenantId, id, payload) {
  const { data, error } = await supabaseAdmin
    .from('profissional_servicos')
    .update(payload)
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateProfissionalServicoByService(tenantId, profissionalId, servicoId, payload) {
  const { data, error } = await supabaseAdmin
    .from('profissional_servicos')
    .update(payload)
    .eq('tenant_id', tenantId)
    .eq('profissional_id', profissionalId)
    .eq('servico_id', servicoId)
    .is('deleted_at', null)
    .select();

  if (error) throw error;
  return data || [];
}

async function findServicesByTenant(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('servicos')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('ativo', true)
    .is('deleted_at', null)
    .order('ordem_exibicao', { ascending: true });

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

async function replaceServicoEspecialidades(tenantId, serviceId, specialtyIds = []) {
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
    .select();

  if (error) throw error;
  return data || [];
}

async function createProfissionalServicos(payloads) {
  if (!payloads.length) return [];
  const { data, error } = await supabaseAdmin.from('profissional_servicos').insert(payloads).select();
  if (error) throw error;
  return data;
}

async function findProfessionalServices(tenantId, profissionalId) {
  const { data, error } = await supabaseAdmin
    .from('profissional_servicos')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('profissional_id', profissionalId)
    .eq('ativo', true)
    .is('deleted_at', null);

  if (error) throw error;
  return data;
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
  createServicos,
  updateServico,
  findServicesByTenant,
  listSpecialties,
  replaceServicoEspecialidades,
  createProfissionalServicos,
  updateProfissionalServico,
  updateProfissionalServicoByService,
  findProfessionalServices,
  createLinkAgendamento,
  findBookingLinkByTenant,
  findScalesByProfessional,
  createScales,
  upsertSteps,
  listSteps,
  updateStep
};
