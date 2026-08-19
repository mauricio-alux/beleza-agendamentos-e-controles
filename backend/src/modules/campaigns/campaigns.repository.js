const { supabaseAdmin } = require('../../config/supabase');
const INTERNAL_TENANT_ROLES = new Set(['Administrador', 'Funcionario', 'Autonomo', 'Terceiro']);
const PLATFORM_CAMPAIGN_USER_ROLES = new Set(['Administrador', 'Autonomo']);

const CAMPAIGN_SELECT = `
  *,
  tenant:tenants(id, nome_fantasia, slug),
  template:templates_mensagem(id, nome, canal, tipo, conteudo, variaveis, aprovado_provider, metadata, ativo),
  servico_tenant:servico_tenants(id, tenant_id, servico_catalogo_id, ativo, servico_catalogo:servicos_catalogo(id, codigo_canonico, nome, categoria_key, natureza)),
  cupom:cupons(*)
`;

function endOfDayIso(date) {
  return `${date}T23:59:59.999Z`;
}

function startOfDayIso(date) {
  return `${date}T00:00:00.000Z`;
}

async function listCampaigns(tenantId, filters = {}) {
  const page = Number(filters.page || 1);
  const pageSize = Number(filters.page_size || 8);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from('campanhas')
    .select(CAMPAIGN_SELECT, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .is('deleted_at', null);

  if (filters.search) {
    query = query.ilike('nome', `%${filters.search}%`);
  }
  if (filters.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters.tipo && filters.tipo !== 'all') {
    query = query.eq('tipo', filters.tipo);
  }
  if (filters.ativo === 'true') {
    query = query.eq('ativo', true);
  }
  if (filters.ativo === 'false') {
    query = query.eq('ativo', false);
  }
  if (filters.created_from) {
    query = query.gte('created_at', startOfDayIso(filters.created_from));
  }
  if (filters.created_to) {
    query = query.lte('created_at', endOfDayIso(filters.created_to));
  }
  if (filters.send_from) {
    query = query.gte('agendada_para', startOfDayIso(filters.send_from));
  }
  if (filters.send_to) {
    query = query.lte('agendada_para', endOfDayIso(filters.send_to));
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return {
    rows: data || [],
    count: count || 0,
    page,
    page_size: pageSize
  };
}

async function listEquivalentCampaigns(tenantId, { tipo, tipoPublico, suggestionKey, statuses = [] } = {}) {
  let query = supabaseAdmin
    .from('campanhas')
    .select('id, tenant_id, tipo, status, data_inicio, data_fim, metadata, created_at')
    .eq('tenant_id', tenantId)
    .eq('tipo', tipo)
    .is('deleted_at', null);

  if (statuses.length) query = query.in('status', statuses);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;

  return (data || []).filter((campaign) => {
    const metadata = campaign.metadata || {};
    if (tipoPublico && (metadata.tipo_publico || 'clientes') !== tipoPublico) return false;
    if (suggestionKey && metadata.suggestion_key !== suggestionKey) return false;
    return true;
  });
}

async function getCampaign(tenantId, id) {
  const { data, error } = await supabaseAdmin
    .from('campanhas')
    .select(CAMPAIGN_SELECT)
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function createCampaign(payload) {
  const { data, error } = await supabaseAdmin
    .from('campanhas')
    .insert(payload)
    .select(CAMPAIGN_SELECT)
    .single();
  if (error) throw error;
  return data;
}

async function updateCampaign(tenantId, id, payload) {
  const { data, error } = await supabaseAdmin
    .from('campanhas')
    .update(payload)
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .is('deleted_at', null)
    .select(CAMPAIGN_SELECT)
    .single();
  if (error) throw error;
  return data;
}

async function listMarketingTemplates(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('templates_mensagem')
    .select('id, tenant_id, nome, canal, tipo, conteudo, variaveis, aprovado_provider, metadata, ativo, updated_at')
    .eq('canal', 'whatsapp')
    .eq('ativo', true)
    .is('deleted_at', null)
    .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).filter((item) => (
    item.tipo === 'marketing'
    || item.metadata?.categoria === 'campanha'
    || item.metadata?.categoria_provider === 'Marketing'
  ));
}

async function getTemplate(tenantId, id) {
  const { data, error } = await supabaseAdmin
    .from('templates_mensagem')
    .select('id, tenant_id, nome, canal, tipo, conteudo, variaveis, aprovado_provider, metadata, ativo')
    .eq('id', id)
    .eq('canal', 'whatsapp')
    .eq('ativo', true)
    .is('deleted_at', null)
    .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function listAudienceBase(tenantId) {
  const { data: links, error } = await supabaseAdmin
    .from('cliente_tenants')
    .select(`
      *,
      cliente:clientes(*)
    `)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null);
  if (error) throw error;

  const clienteIds = (links || [])
    .map((row) => row.cliente_id)
    .filter(Boolean);

  if (!clienteIds.length) return links || [];

  const [historyResult, appointmentsResult, internalUsers] = await Promise.all([
    supabaseAdmin
      .from('cliente_historico_atendimentos')
        .select(`
          id,
          cliente_id,
          status,
          data_atendimento,
          agendamento_id,
          servico_id,
          servico_catalogo_id,
          servico_tenant_id,
          servico_tenant_especialidade_id,
          especialidade_id,
          servico_especialidade_id,
          nome_especialidade,
          profissional_id,
          deleted_at,
          metadata,
          servico_tenant:servico_tenants(id, tenant_id, servico_catalogo_id, ativo, servico_catalogo:servicos_catalogo(id, codigo_canonico, nome, categoria_key, natureza)),
          servico_tenant_especialidade:servico_tenant_especialidades(id, servico_tenant_id, especialidade_id, dias_retorno_recomendado, preco, duracao_minutos, ativo, aceita_agendamento_online, metadata),
          especialidade:especialidades(id, nome, metadata)
        `)
      .eq('tenant_id', tenantId)
      .in('cliente_id', clienteIds)
      .is('deleted_at', null),
    supabaseAdmin
      .from('agendamentos')
      .select('id, cliente_id, status, data_inicio, deleted_at')
      .eq('tenant_id', tenantId)
      .in('cliente_id', clienteIds)
      .is('deleted_at', null),
    listInternalTenantUsers(tenantId)
  ]);

  if (historyResult.error) throw historyResult.error;
  if (appointmentsResult.error) throw appointmentsResult.error;

  const historyByClient = groupByClient(historyResult.data || []);
  const appointmentsByClient = groupByClient(appointmentsResult.data || []);
  const internalIdentity = buildInternalIdentityIndex(internalUsers || []);

  return (links || []).map((row) => ({
    ...row,
    internal_user_roles: internalRolesForClient(row, internalIdentity),
    historico: historyByClient.get(row.cliente_id) || [],
    agendamentos: appointmentsByClient.get(row.cliente_id) || []
  }));
}

async function listInternalTenantUsers(tenantId) {
  const { data: memberships, error: membershipError } = await supabaseAdmin
    .from('tenant_memberships')
    .select('usuario_id, role, status, profissional_id')
    .eq('tenant_id', tenantId)
    .eq('status', 'ativo');
  if (membershipError) throw membershipError;

  const internalMemberships = (memberships || []).filter((item) => INTERNAL_TENANT_ROLES.has(item.role));
  const userIds = internalMemberships.map((item) => item.usuario_id).filter(Boolean);

  const [membershipUsersResult, tenantUsersResult] = await Promise.all([
    userIds.length
      ? supabaseAdmin
        .from('usuarios')
        .select('id, nome, email, telefone, tipo_usuario, tenant_id, ativo, deleted_at')
        .in('id', userIds)
        .eq('ativo', true)
        .is('deleted_at', null)
      : Promise.resolve({ data: [], error: null }),
    supabaseAdmin
      .from('usuarios')
      .select('id, nome, email, telefone, tipo_usuario, tenant_id, ativo, deleted_at')
      .eq('tenant_id', tenantId)
      .eq('ativo', true)
      .is('deleted_at', null)
  ]);

  if (membershipUsersResult.error) throw membershipUsersResult.error;
  if (tenantUsersResult.error) throw tenantUsersResult.error;

  const rolesByUserId = new Map(internalMemberships.map((item) => [item.usuario_id, item.role]));
  const professionalByUserId = new Map(internalMemberships.map((item) => [item.usuario_id, item.profissional_id]).filter(([, professionalId]) => Boolean(professionalId)));
  const users = [...(membershipUsersResult.data || []), ...(tenantUsersResult.data || [])];
  const byId = new Map();
  users.forEach((user) => {
    const role = rolesByUserId.get(user.id) || user.tipo_usuario;
    if (!INTERNAL_TENANT_ROLES.has(role)) return;
    byId.set(user.id, { ...user, role, profissional_id: professionalByUserId.get(user.id) || null });
  });
  return [...byId.values()];
}

async function listSaasUsers(criteria = {}) {
  const requestedRoles = Array.isArray(criteria.roles) && criteria.roles.length
    ? criteria.roles
    : [...PLATFORM_CAMPAIGN_USER_ROLES];
  const allowedRoles = requestedRoles.filter((role) => PLATFORM_CAMPAIGN_USER_ROLES.has(role));

  if (!allowedRoles.length) return [];

  let query = supabaseAdmin
    .from('usuarios')
    .select('id, nome, email, telefone, tipo_usuario, tenant_id, ativo, deleted_at')
    .in('tipo_usuario', allowedRoles)
    .eq('ativo', true)
    .is('deleted_at', null);

  if (criteria.tenant_id) query = query.eq('tenant_id', criteria.tenant_id);

  const { data, error } = await query.order('nome');
  if (error) throw error;
  return data || [];
}

function buildInternalIdentityIndex(users) {
  const byId = new Map();
  const byProfessionalId = new Map();

  users.forEach((user) => {
    byId.set(user.id, user.role);
    if (user.profissional_id) byProfessionalId.set(user.profissional_id, user.role);
  });

  return { byId, byProfessionalId };
}

function internalRolesForClient(row, internalIdentity) {
  const roles = new Set();
  const client = row.cliente || {};

  [
    row.metadata?.internal_usuario_id,
    row.metadata?.internal_user_id,
    client.metadata?.internal_usuario_id,
    client.metadata?.internal_user_id
  ].filter(Boolean).forEach((userId) => {
    const role = internalIdentity.byId.get(userId);
    if (role) roles.add(role);
  });

  [
    row.metadata?.internal_profissional_id,
    client.metadata?.internal_profissional_id
  ].filter(Boolean).forEach((professionalId) => {
    const role = internalIdentity.byProfessionalId.get(professionalId);
    if (role) roles.add(role);
  });

  const explicitRoles = [
    row.metadata?.tipo_usuario,
    row.metadata?.tipo_usuario_operacional,
    row.metadata?.role,
    row.metadata?.user_role,
    client.metadata?.tipo_usuario,
    client.metadata?.tipo_usuario_operacional,
    client.metadata?.role,
    client.metadata?.user_role
  ].filter(Boolean);
  explicitRoles.forEach((role) => {
    if (INTERNAL_TENANT_ROLES.has(role)) roles.add(role);
  });

  return [...roles];
}

function groupByClient(rows) {
  return rows.reduce((map, row) => {
    const list = map.get(row.cliente_id) || [];
    list.push(row);
    map.set(row.cliente_id, list);
    return map;
  }, new Map());
}

async function listServices(tenantId) {
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
    .order('created_at');
  if (error) throw error;
  return (data || []).map(normalizeTenantService);
}

async function getService(tenantId, id) {
  if (!id) return null;
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
    .eq('id', id)
    .eq('ativo', true)
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeTenantService(data) : null;
}

function normalizeTenantService(row) {
  const catalog = row.servico_catalogo || {};
  const configs = (row.especialidades_config || []).filter((config) => (
    config.ativo !== false
    && config.especialidade?.ativo !== false
    && !config.especialidade?.deleted_at
  ));
  const firstConfig = configs[0] || {};

  return {
    id: row.id,
    tenant_id: row.tenant_id,
    servico_tenant_id: row.id,
    servico_catalogo_id: row.servico_catalogo_id,
    codigo_canonico: catalog.codigo_canonico,
    nome: catalog.nome,
    categoria: catalog.categoria_key,
    taxonomy_category_key: catalog.categoria_key,
    natureza: catalog.natureza,
    ativo: row.ativo !== false,
    preco: firstConfig.preco ?? null,
    duracao_minutos: firstConfig.duracao_minutos ?? null,
    dias_retorno_recomendado: firstConfig.dias_retorno_recomendado ?? null,
    especialidades_config: configs.map((config) => ({
      id: config.id,
      servico_tenant_id: row.id,
      especialidade_id: config.especialidade_id,
      nome: config.especialidade?.nome || null,
      preco: config.preco,
      duracao_minutos: config.duracao_minutos,
      dias_retorno_recomendado: config.dias_retorno_recomendado ?? null,
      aceita_agendamento_online: config.aceita_agendamento_online !== false,
      ativo: config.ativo !== false
    }))
  };
}

function couponHasBenefit(coupon) {
  if (coupon.tipo_desconto === 'percentual') return Number(coupon.percentual_desconto || 0) > 0;
  return Number(coupon.valor_desconto || 0) > 0;
}

function couponIsCurrentlyAvailable(coupon) {
  if (!coupon || coupon.ativo !== true || !couponHasBenefit(coupon)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (coupon.data_inicio && new Date(`${coupon.data_inicio}T00:00:00`) > today) return false;
  if (coupon.data_fim && new Date(`${coupon.data_fim}T23:59:59`) < today) return false;
  if (coupon.limite_uso && Number(coupon.total_usos || 0) >= Number(coupon.limite_uso)) return false;
  return true;
}

async function listCoupons(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('cupons')
    .select('*, servicos:cupom_servicos(id, escopo, servico_id, servico_tenant_id, especialidade_id, servico_tenant_especialidade_id, servico_tenant:servico_tenants(id, servico_catalogo_id, servico_catalogo:servicos_catalogo(id,nome,codigo_canonico,categoria_key,natureza)), especialidade:especialidades(id,nome), servico_tenant_especialidade:servico_tenant_especialidades(id, servico_tenant_id, especialidade_id))')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).filter(couponIsCurrentlyAvailable);
}

async function getCoupon(tenantId, id) {
  if (!id) return null;
  const { data, error } = await supabaseAdmin
    .from('cupons')
    .select('*, servicos:cupom_servicos(id, escopo, servico_id, servico_tenant_id, especialidade_id, servico_tenant_especialidade_id, servico_tenant:servico_tenants(id, servico_catalogo_id, servico_catalogo:servicos_catalogo(id,nome,codigo_canonico,categoria_key,natureza)), especialidade:especialidades(id,nome), servico_tenant_especialidade:servico_tenant_especialidades(id, servico_tenant_id, especialidade_id))')
    .eq('tenant_id', tenantId)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function createCoupon(payload, scopes = []) {
  const { data, error } = await supabaseAdmin
    .from('cupons')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;

  if (scopes.length) {
    const { error: linkError } = await supabaseAdmin
      .from('cupom_servicos')
      .insert(scopes.map((scope) => ({
        tenant_id: payload.tenant_id,
        cupom_id: data.id,
        servico_id: scope.servico_id || null,
        servico_catalogo_id: scope.servico_catalogo_id || null,
        servico_tenant_id: scope.servico_tenant_id || null,
        especialidade_id: scope.especialidade_id || null,
        servico_tenant_especialidade_id: scope.servico_tenant_especialidade_id || null,
        escopo: scope.escopo,
        metadata: scope.metadata || {}
      })));
    if (linkError) throw linkError;
  }

  return getCoupon(payload.tenant_id, data.id);
}

async function createCampaignSend(payload) {
  const { data, error } = await supabaseAdmin
    .from('campanha_envios')
    .insert(payload)
    .select()
    .single();
  if (error?.code === '23505') return null;
  if (error) throw error;
  return data;
}

async function createWhatsAppCampaignMessage(payload) {
  const { data, error } = await supabaseAdmin
    .from('mensagens_whatsapp')
    .insert(payload)
    .select()
    .single();
  if (error?.code === '23505') return null;
  if (error) throw error;
  return data;
}

async function listCampaignMessages(tenantId, campaignId) {
  const { data, error } = await supabaseAdmin
    .from('mensagens_whatsapp')
    .select('*, cliente:clientes(id, nome, telefone)')
    .eq('tenant_id', tenantId)
    .eq('campanha_id', campaignId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function listRecentCommercialMessages(tenantId, clienteIds = [], sinceIso = null) {
  if (!clienteIds.length || !sinceIso) return [];

  const { data, error } = await supabaseAdmin
    .from('mensagens_whatsapp')
    .select('id, cliente_id, campanha_id, created_at, tipo_evento, payload')
    .eq('tenant_id', tenantId)
    .in('cliente_id', clienteIds)
    .eq('tipo_evento', 'campaign.message')
    .gte('created_at', sinceIso)
    .is('deleted_at', null);

  if (error) throw error;
  return (data || []).filter((message) => {
    const nature = message.payload?.natureza_campanha || message.payload?.campaign_nature || 'promocional';
    return ['promocional', 'relacionamento'].includes(nature);
  });
}

async function cancelQueuedMessages(tenantId, campaignId) {
  const { data, error } = await supabaseAdmin
    .from('mensagens_whatsapp')
    .update({ status_envio: 'cancelado', updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('campanha_id', campaignId)
    .in('status_envio', ['pendente', 'agendado', 'retry'])
    .is('deleted_at', null)
    .select('id');
  if (error) throw error;

  await supabaseAdmin
    .from('campanha_envios')
    .update({ status: 'cancelado', updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('campanha_id', campaignId)
    .in('status', ['pendente', 'agendado', 'erro']);

  return data || [];
}

async function listDueScheduledCampaigns(limit = 25) {
  const { data, error } = await supabaseAdmin
    .from('campanhas')
    .select('id, tenant_id')
    .eq('status', 'agendada')
    .lte('agendada_para', new Date().toISOString())
    .is('deleted_at', null)
    .order('agendada_para', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

module.exports = {
  listCampaigns,
  listEquivalentCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  listMarketingTemplates,
  getTemplate,
  listAudienceBase,
  listSaasUsers,
  listServices,
  getService,
  listCoupons,
  getCoupon,
  createCoupon,
  createCampaignSend,
  createWhatsAppCampaignMessage,
  listCampaignMessages,
  listRecentCommercialMessages,
  cancelQueuedMessages,
  listDueScheduledCampaigns
};
