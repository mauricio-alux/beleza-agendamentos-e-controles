const { supabaseAdmin } = require('../../config/supabase');

function dateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

async function countRows(tableName, builder = (query) => query) {
  const { count, error } = await builder(
    supabaseAdmin
      .from(tableName)
      .select('id', { count: 'exact', head: true })
  );

  if (error) throw error;
  return count || 0;
}

async function sumSubscriptionsRevenue() {
  const { data, error } = await supabaseAdmin
    .from('assinaturas')
    .select('valor_mensal')
    .in('status', ['trial', 'ativa'])
    .eq('ativo', true)
    .is('deleted_at', null);

  if (error) throw error;
  return (data || []).reduce((total, item) => total + Number(item.valor_mensal || 0), 0);
}

async function listTenants(limit = 20) {
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select(`
      id,
      nome_fantasia,
      slug,
      status,
      email,
      telefone,
      timezone,
      created_at,
      assinaturas(id, status, valor_mensal, trial_ate, plano:planos(nome))
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

async function listAuditLogs(limit = 50) {
  const { data, error } = await supabaseAdmin
    .from('event_logs')
    .select('id, tenant_id, usuario_id, event_type, origem, ip_address, user_agent, payload, created_at')
    .or('tenant_id.is.null,event_type.ilike.platform_%')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

async function countPlatformCampaigns(status = null) {
  return countRows('platform_campaigns', (query) => {
    let next = query.is('deleted_at', null);
    if (status) next = next.eq('status', status);
    return next;
  });
}

async function listPlatformCampaigns(limit = 50) {
  const { data, error } = await supabaseAdmin
    .from('platform_campaigns')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

async function createPlatformCampaign(payload) {
  const { data, error } = await supabaseAdmin
    .from('platform_campaigns')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updatePlatformCampaign(id, payload) {
  const { data, error } = await supabaseAdmin
    .from('platform_campaigns')
    .update(payload)
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function listCommunicationTemplates(limit = 200) {
  const { data, error } = await supabaseAdmin
    .from('templates_mensagem')
    .select('*')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

async function createCommunicationTemplate(payload) {
  const { data, error } = await supabaseAdmin
    .from('templates_mensagem')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateCommunicationTemplate(id, payload) {
  const { data, error } = await supabaseAdmin
    .from('templates_mensagem')
    .update(payload)
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function listWhatsAppMessages({ statuses = null, limit = 100 } = {}) {
  let query = supabaseAdmin
    .from('mensagens_whatsapp')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (statuses?.length) {
    query = query.in('status_envio', statuses);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function listPlans() {
  const { data, error } = await supabaseAdmin
    .from('planos')
    .select('*')
    .is('deleted_at', null)
    .order('preco_mensal', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function listSubscriptions(filters = {}) {
  let query = supabaseAdmin
    .from('assinaturas')
    .select(`
      *,
      tenant:tenants(id, nome_fantasia, slug, status, email),
      plano:planos(id, nome, preco_mensal),
      alterado_por:usuarios(id, nome, email)
    `)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.plano_id) query = query.eq('plano_id', filters.plano_id);
  if (filters.tenant_id) query = query.eq('tenant_id', filters.tenant_id);
  if (filters.expira_de) query = query.gte('expira_em', filters.expira_de);
  if (filters.expira_ate) query = query.lte('expira_em', filters.expira_ate);

  const { data, error } = await query.limit(filters.limit || 200);
  if (error) throw error;
  return data || [];
}

async function getSubscription(id) {
  const { data, error } = await supabaseAdmin
    .from('assinaturas')
    .select(`
      *,
      tenant:tenants(id, nome_fantasia, slug, status, email),
      plano:planos(id, nome, preco_mensal),
      alterado_por:usuarios(id, nome, email)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function updateSubscription(id, payload) {
  const { data, error } = await supabaseAdmin
    .from('assinaturas')
    .update(payload)
    .eq('id', id)
    .is('deleted_at', null)
    .select(`
      *,
      tenant:tenants(id, nome_fantasia, slug, status, email),
      plano:planos(id, nome, preco_mensal),
      alterado_por:usuarios(id, nome, email)
    `)
    .single();

  if (error) throw error;
  return data;
}

async function updateTenantStatus(tenantId, status) {
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', tenantId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function createSubscriptionHistory(payload) {
  const { data, error } = await supabaseAdmin
    .from('assinatura_historico')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function listSubscriptionHistory(subscriptionId) {
  const { data, error } = await supabaseAdmin
    .from('assinatura_historico')
    .select('*, usuario:usuarios(id, nome, email), plano_anterior_ref:planos!assinatura_historico_plano_anterior_fkey(id, nome), plano_novo_ref:planos!assinatura_historico_plano_novo_fkey(id, nome)')
    .eq('assinatura_id', subscriptionId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function extendSubscriptionTrial({ subscriptionId, days = null, trialUntil = null, userId, observation }) {
  const { data, error } = await supabaseAdmin.rpc('extend_subscription_trial_admin', {
    p_assinatura_id: subscriptionId,
    p_dias: days,
    p_trial_ate: trialUntil,
    p_usuario_id: userId,
    p_observacao: observation
  });

  if (error) throw error;
  return data;
}

async function getSaasMetrics() {
  const last30 = dateDaysAgo(30);
  const previous60 = dateDaysAgo(60);

  const [
    tenantsTotal,
    tenantsActive,
    tenantsTrial,
    tenantsCanceled,
    newTenants30d,
    previousTenants30d,
    subscriptionsActive,
    subscriptionsCanceled30d,
    usersTotal,
    professionalsTotal,
    clientsTotal,
    appointmentsTotal,
    globalCampaigns,
    platformMrr
  ] = await Promise.all([
    countRows('tenants', (query) => query.is('deleted_at', null)),
    countRows('tenants', (query) => query.eq('status', 'ativo').is('deleted_at', null)),
    countRows('tenants', (query) => query.eq('status', 'trial').is('deleted_at', null)),
    countRows('tenants', (query) => query.in('status', ['cancelado', 'suspenso']).is('deleted_at', null)),
    countRows('tenants', (query) => query.gte('created_at', last30).is('deleted_at', null)),
    countRows('tenants', (query) => query.gte('created_at', previous60).lt('created_at', last30).is('deleted_at', null)),
    countRows('assinaturas', (query) => query.in('status', ['trial', 'ativa']).is('deleted_at', null)),
    countRows('assinaturas', (query) => query.in('status', ['cancelada', 'suspensa']).gte('updated_at', last30).is('deleted_at', null)),
    countRows('usuarios', (query) => query.is('deleted_at', null)),
    countRows('profissionais', (query) => query.is('deleted_at', null)),
    countRows('cliente_tenants', (query) => query.is('deleted_at', null)),
    countRows('agendamentos', (query) => query.is('deleted_at', null)),
    countPlatformCampaigns(),
    sumSubscriptionsRevenue()
  ]);

  const churnRate = subscriptionsActive + subscriptionsCanceled30d === 0
    ? 0
    : Math.round((subscriptionsCanceled30d / (subscriptionsActive + subscriptionsCanceled30d)) * 10000) / 100;

  const growthRate = previousTenants30d === 0
    ? (newTenants30d > 0 ? 100 : 0)
    : Math.round(((newTenants30d - previousTenants30d) / previousTenants30d) * 10000) / 100;

  return {
    mrr: platformMrr,
    churnRate,
    growthRate,
    tenants: {
      total: tenantsTotal,
      active: tenantsActive,
      trial: tenantsTrial,
      canceledOrSuspended: tenantsCanceled,
      newLast30Days: newTenants30d
    },
    subscriptions: {
      active: subscriptionsActive,
      canceledLast30Days: subscriptionsCanceled30d
    },
    usage: {
      users: usersTotal,
      professionals: professionalsTotal,
      clientRelationships: clientsTotal,
      appointments: appointmentsTotal
    },
    campaigns: {
      global: globalCampaigns
    },
    health: {
      status: 'operational',
      supportMode: 'audit_required',
      tenantIsolation: 'membership_context'
    }
  };
}

module.exports = {
  getSaasMetrics,
  listTenants,
  listAuditLogs,
  listPlatformCampaigns,
  createPlatformCampaign,
  updatePlatformCampaign,
  listCommunicationTemplates,
  createCommunicationTemplate,
  updateCommunicationTemplate,
  listWhatsAppMessages,
  listPlans,
  listSubscriptions,
  getSubscription,
  updateSubscription,
  updateTenantStatus,
  createSubscriptionHistory,
  listSubscriptionHistory,
  extendSubscriptionTrial
};
