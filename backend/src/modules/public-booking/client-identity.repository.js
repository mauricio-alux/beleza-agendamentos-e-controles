const { supabaseAdmin } = require('../../config/supabase');

async function identifyClient(payload) {
  const { data, error } = await supabaseAdmin.rpc('identify_public_booking_client', {
    p_tenant_id: payload.tenantId,
    p_nome: payload.nome,
    p_telefone: payload.telefone,
    p_email: payload.email || null,
    p_token_hash: payload.tokenHash,
    p_token_expires_at: payload.expiresAt,
    p_campaign_key: payload.campaignKey || null,
    p_origin: payload.origin || 'link_agendamento',
    p_link_agendamento_id: payload.linkId || null,
    p_session_id: payload.sessionId || null,
    p_metadata: payload.metadata || {}
  });

  if (error) throw error;
  return data;
}

async function findClientByPhone(tenantId, telefone) {
  const { data, error } = await supabaseAdmin
    .from('clientes')
    .select('id, vinculos:cliente_tenants!inner(id,status)')
    .eq('telefone', telefone)
    .eq('vinculos.tenant_id', tenantId)
    .is('deleted_at', null)
    .is('vinculos.deleted_at', null)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function listClientIdsByPhone(tenantId, telefone) {
  if (!telefone) return [];

  const { data, error } = await supabaseAdmin
    .from('clientes')
    .select('id, vinculos:cliente_tenants!inner(id,status)')
    .eq('telefone', telefone)
    .eq('vinculos.tenant_id', tenantId)
    .is('deleted_at', null)
    .is('vinculos.deleted_at', null);

  if (error) throw error;
  return (data || [])
    .filter((client) => !client.vinculos?.some((linkItem) => linkItem.status === 'bloqueado'))
    .map((client) => client.id);
}

async function findClientById(clientId) {
  if (!clientId) return null;

  const { data, error } = await supabaseAdmin
    .from('clientes')
    .select('*')
    .eq('id', clientId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findToken(tokenHash) {
  const { data, error } = await supabaseAdmin
    .from('tokens_cliente')
    .select('*')
    .eq('token_hash', tokenHash)
    .eq('tipo', 'agendamento_publico')
    .eq('ativo', true)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function findClientContext(tenantId, clientId) {
  const { data, error } = await supabaseAdmin
    .from('cliente_tenants')
    .select('*, cliente:clientes(*)')
    .eq('tenant_id', tenantId)
    .eq('cliente_id', clientId)
    .eq('ativo', true)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function touchIdentity(tenantId, clientId, tokenId) {
  const now = new Date().toISOString();
  const [tokenResult, linkResult] = await Promise.all([
    supabaseAdmin
      .from('tokens_cliente')
      .update({ usado_em: now, updated_at: now })
      .eq('id', tokenId)
      .eq('tenant_id', tenantId),
    supabaseAdmin
      .from('cliente_tenants')
      .update({
        data_primeiro_acesso: now,
        data_ultimo_acesso: now,
        updated_at: now
      })
      .eq('tenant_id', tenantId)
      .eq('cliente_id', clientId)
      .is('data_primeiro_acesso', null)
  ]);

  if (tokenResult.error) throw tokenResult.error;
  if (linkResult.error) throw linkResult.error;

  const { error } = await supabaseAdmin
    .from('cliente_tenants')
    .update({ data_ultimo_acesso: now, updated_at: now })
    .eq('tenant_id', tenantId)
    .eq('cliente_id', clientId)
    .is('deleted_at', null);

  if (error) throw error;
}

async function updateIdentifiedClient(tenantId, clientId, payload) {
  const context = await findClientContext(tenantId, clientId);
  if (!context) return null;

  const clientPayload = {};
  if (payload.nome) clientPayload.nome = payload.nome;
  if (payload.email) clientPayload.email = payload.email;
  if (Object.keys(clientPayload).length) {
    clientPayload.updated_at = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from('clientes')
      .update(clientPayload)
      .eq('id', clientId);
    if (error) throw error;
  }

  if (payload.nome) {
    const { error } = await supabaseAdmin
      .from('cliente_tenants')
      .update({ nome_no_tenant: payload.nome, updated_at: new Date().toISOString() })
      .eq('tenant_id', tenantId)
      .eq('cliente_id', clientId)
      .is('deleted_at', null);
    if (error) throw error;
  }

  return findClientContext(tenantId, clientId);
}

async function listRecentAppointments(tenantId, clientId) {
  const { data, error } = await supabaseAdmin
    .from('agendamentos')
    .select(`
      id,
      data_inicio,
      status,
      profissional_id,
      profissional:profissionais(id,nome_publico),
      servicos:agendamento_servicos(servico_id,nome_servico)
    `)
    .eq('tenant_id', tenantId)
    .eq('cliente_id', clientId)
    .is('deleted_at', null)
    .order('data_inicio', { ascending: false })
    .limit(10);

  if (error) throw error;
  return data || [];
}

async function recordAccess(payload) {
  let campaign = null;

  if (payload.campaignKey) {
    const bySlug = await supabaseAdmin
      .from('campanhas')
      .select('id')
      .eq('tenant_id', payload.tenantId)
      .eq('ativo', true)
      .is('deleted_at', null)
      .ilike('slug', payload.campaignKey)
      .limit(1)
      .maybeSingle();

    if (bySlug.error) throw bySlug.error;
    campaign = bySlug.data;

    if (!campaign) {
      const byName = await supabaseAdmin
        .from('campanhas')
        .select('id')
        .eq('tenant_id', payload.tenantId)
        .eq('ativo', true)
        .is('deleted_at', null)
        .ilike('nome', payload.campaignKey.replace(/-/g, ' '))
        .limit(1)
        .maybeSingle();

      if (byName.error) throw byName.error;
      campaign = byName.data;
    }
  }

  const { error } = await supabaseAdmin.from('campanha_acessos').insert({
    tenant_id: payload.tenantId,
    link_agendamento_id: payload.linkId || null,
    campanha_id: campaign?.id || null,
    cliente_id: payload.clientId || null,
    agendamento_id: payload.appointmentId || null,
    campanha_chave: payload.campaignKey || null,
    evento: payload.event,
    origem: payload.origin || 'link_agendamento',
    sessao_id: payload.sessionId || null,
    metadata: payload.metadata || {}
  });

  if (error) throw error;
}

async function findTenantClient(tenantId, clientId) {
  return findClientContext(tenantId, clientId);
}

async function revokeActiveTokens(tenantId, clientId) {
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from('tokens_cliente')
    .update({ ativo: false, deleted_at: now, updated_at: now })
    .eq('tenant_id', tenantId)
    .eq('cliente_id', clientId)
    .eq('tipo', 'agendamento_publico')
    .eq('ativo', true)
    .is('deleted_at', null);

  if (error) throw error;
}

async function createToken(payload) {
  const { error } = await supabaseAdmin.from('tokens_cliente').insert({
    tenant_id: payload.tenantId,
    cliente_id: payload.clientId,
    token_hash: payload.tokenHash,
    tipo: 'agendamento_publico',
    expira_em: payload.expiresAt,
    origem: payload.origin,
    metadata: payload.metadata || {}
  });

  if (error) throw error;
}

module.exports = {
  identifyClient,
  findClientByPhone,
  listClientIdsByPhone,
  findClientById,
  findToken,
  findClientContext,
  touchIdentity,
  updateIdentifiedClient,
  listRecentAppointments,
  recordAccess,
  findTenantClient,
  revokeActiveTokens,
  createToken
};
