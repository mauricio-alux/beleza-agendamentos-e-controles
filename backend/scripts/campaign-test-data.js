#!/usr/bin/env node

const { supabaseAdmin } = require('../src/config/supabase');

const SEED = 'campaign_test_seed_2026';
const TENANT_SLUG = process.env.CAMPAIGN_TEST_TENANT_SLUG || 'bellory-test-studio';
const CLIENTS_PER_USER = Number(process.env.CAMPAIGN_TEST_CLIENTS_PER_USER || 25);
const CLIENTS_PER_ADMIN = Number(process.env.CAMPAIGN_TEST_CLIENTS_PER_ADMIN || 8);
const ALLOWED_ENVS = new Set(['development', 'dev', 'test', 'local', 'homologation', 'hml']);
const BLOCKED_ENVS = new Set(['production', 'prod', 'prd']);

const SCENARIOS = [
  'new',
  'recurring',
  'inactive_45',
  'inactive_120',
  'future_appointment',
  'cancelled',
  'no_show',
  'birthday',
  'opt_out',
  'invalid_phone'
];

const CAMPAIGN_STATUSES = [
  'rascunho',
  'pronta',
  'agendada',
  'gerando_mensagens',
  'em_processamento',
  'concluida',
  'cancelada'
];

const MESSAGE_STATUSES = [
  { message: 'pendente', send: 'pendente' },
  { message: 'agendado', send: 'agendado' },
  { message: 'processando', send: 'processando' },
  { message: 'submetido', send: 'enviado' },
  { message: 'erro', send: 'erro' },
  { message: 'cancelado', send: 'cancelado' }
];

function assertEnvironment() {
  const appEnv = String(process.env.APP_ENVIRONMENT || process.env.NODE_ENV || 'development').toLowerCase();
  if (BLOCKED_ENVS.has(appEnv) || !ALLOWED_ENVS.has(appEnv)) {
    throw new Error(`Ambiente bloqueado para seed de campanhas: ${appEnv}. Use development/test/local/hml.`);
  }
}

function seedMetadata(extra = {}) {
  return {
    ...extra,
    seed: SEED,
    campaign_test_seed: true
  };
}

async function selectTenant() {
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('slug', TENANT_SLUG)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Tenant de testes nao encontrado: ${TENANT_SLUG}`);
  return data;
}

async function listTenantUsers(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('tenant_memberships')
    .select('role, status, usuario:usuarios(id, nome, email, tipo_usuario)')
    .eq('tenant_id', tenantId)
    .eq('status', 'ativo');
  if (error) throw error;
  return (data || [])
    .filter((item) => item.usuario)
    .map((item) => ({
      ...item.usuario,
      role: item.role
    }));
}

async function listServices(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('servicos')
    .select('id, nome, preco, duracao_minutos')
    .eq('tenant_id', tenantId)
    .eq('ativo', true)
    .is('deleted_at', null)
    .limit(5);
  if (error) throw error;
  return data || [];
}

async function listProfessionals(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('profissionais')
    .select('id, nome_publico')
    .eq('tenant_id', tenantId)
    .eq('ativo', true)
    .is('deleted_at', null)
    .limit(5);
  if (error) throw error;
  return data || [];
}

async function listTemplates(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('templates_mensagem')
    .select('id, nome, tipo, conteudo, variaveis, metadata, aprovado_provider')
    .eq('canal', 'whatsapp')
    .eq('ativo', true)
    .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
    .is('deleted_at', null);
  if (error) throw error;
  return (data || []).filter((item) => item.tipo === 'marketing' || item.metadata?.categoria === 'campanha');
}

async function findByMetadata(table, tenantId, key) {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('metadata->>seed_key', key)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function upsertClient(tenantId, user, index) {
  const scenario = SCENARIOS[index % SCENARIOS.length];
  const seedKey = `${user.id}-${index}`;
  const email = `${SEED}.${seedKey}@example.com`;
  const phone = scenario === 'invalid_phone'
    ? '119'
    : `+55119${String(index + 10000000).slice(0, 8)}`;
  const existing = await findSeedClient(email);
  const payload = {
    nome: `Cliente Campanha ${index + 1}`,
    telefone: phone,
    email,
    data_nascimento: scenario === 'birthday' ? '1990-07-15' : '1990-01-15',
    metadata: seedMetadata({ seed_key: seedKey, scenario, owner_user_id: user.id }),
    ativo: scenario !== 'inactive_120',
    updated_at: new Date().toISOString()
  };

  let client = existing;
  if (client) {
    const { data, error } = await supabaseAdmin
      .from('clientes')
      .update(payload)
      .eq('id', client.id)
      .select()
      .single();
    if (error) throw error;
    client = data;
  } else {
    const { data, error } = await supabaseAdmin
      .from('clientes')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    client = data;
  }

  const linkPayload = {
    tenant_id: tenantId,
    cliente_id: client.id,
    nome_no_tenant: client.nome,
    origem: 'seed_campanhas',
    status: scenario === 'inactive_120' ? 'inativo' : 'ativo',
    aceita_campanhas: scenario !== 'opt_out',
    qtd_atendimentos: scenario === 'recurring' ? 4 : 0,
    metadata: seedMetadata({ seed_key: seedKey, scenario, owner_user_id: user.id }),
    ativo: true,
    updated_at: new Date().toISOString()
  };

  const { error: linkError } = await supabaseAdmin
    .from('cliente_tenants')
    .upsert(linkPayload, { onConflict: 'tenant_id,cliente_id' });
  if (linkError) throw linkError;

  return { client, scenario, seedKey };
}

async function findSeedClient(email) {
  const { data, error } = await supabaseAdmin
    .from('clientes')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function upsertCoupon(tenantId, campanhaId, code, status) {
  const existing = await findCoupon(tenantId, code);
  const today = new Date();
  const future = new Date(today.getTime() + 30 * 86_400_000).toISOString().slice(0, 10);
  const past = new Date(today.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);
  const payload = {
    tenant_id: tenantId,
    campanha_id: campanhaId || null,
    codigo: code,
    nome: code,
    descricao: `Cupom de teste ${SEED}`,
    tipo_codigo: 'generico',
    tipo_desconto: status === 'price' ? 'preco_promocional' : 'percentual',
    percentual_desconto: status === 'price' ? null : 15,
    valor_desconto: status === 'price' ? 49.9 : null,
    data_inicio: past,
    data_fim: status === 'expired' ? past : future,
    limite_uso: 100,
    limite_usos_por_cliente: 1,
    ativo: status !== 'expired',
    metadata: seedMetadata({ seed_key: code, coupon_status: status }),
    updated_at: new Date().toISOString()
  };

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from('cupons')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabaseAdmin
    .from('cupons')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function findCoupon(tenantId, code) {
  const { data, error } = await supabaseAdmin
    .from('cupons')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('codigo', code)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function upsertCampaign(tenantId, template, coupon, index) {
  const status = CAMPAIGN_STATUSES[index % CAMPAIGN_STATUSES.length];
  const seedKey = `${SEED}-campaign-${index}`;
  const name = `[${SEED}] ${status} ${index + 1}`;
  const existing = await findByMetadata('campanhas', tenantId, seedKey);
  const payload = {
    tenant_id: tenantId,
    nome: name,
    descricao: `Campanha de teste ${status}`,
    tipo: 'promocao_servico',
    canal: 'whatsapp',
    template_id: template?.id || null,
    status,
    criterios_segmentacao: { mode: index % 2 ? 'inactive' : 'all', inactive_days: index % 2 ? 45 : null },
    publico_alvo: { mode: index % 2 ? 'inactive' : 'all' },
    parametros_template: {
      nome_servico: { source: 'fixed', value: 'Manicure' },
      valor_promocional: { source: 'fixed', value: 'R$ 49,90' },
      codigo_cupom: { source: 'dynamic', field: 'codigo_cupom' }
    },
    agendada_para: status === 'agendada' ? new Date(Date.now() + 86_400_000).toISOString() : null,
    metadata: seedMetadata({ seed_key: seedKey, cupom_id: coupon?.id || null }),
    tracking_token: `cmp_test_${index}`,
    ativo: true,
    updated_at: new Date().toISOString()
  };

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from('campanhas')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabaseAdmin
    .from('campanhas')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function seedMessages(tenantId, campaign, template, clients) {
  for (let index = 0; index < Math.min(clients.length, MESSAGE_STATUSES.length); index += 1) {
    const status = MESSAGE_STATUSES[index];
    const client = clients[index].client;
    const idempotencyKey = `${tenantId}:${campaign.id}:${client.id}:${template?.id || 'template'}`;
    const sendPayload = {
      tenant_id: tenantId,
      campanha_id: campaign.id,
      cliente_id: client.id,
      template_id: template?.id || null,
      status: status.send,
      metadata: seedMetadata({ seed_key: idempotencyKey, status: status.send }),
      updated_at: new Date().toISOString()
    };
    const send = await upsertCampaignSend(sendPayload);

    const message = {
      tenant_id: tenantId,
      cliente_id: client.id,
      campanha_id: campaign.id,
      campanha_envio_id: send.id,
      telefone_destino: client.telefone,
      direcao: 'saida',
      template_nome: template?.nome || 'campaign_test_template',
      conteudo: `Mensagem de teste ${SEED}`,
      tipo_evento: 'campaign.message',
      provider: 'whatsapp_mysaas',
      status_envio: status.message,
      idempotency_key: idempotencyKey,
      payload: seedMetadata({ seed_key: idempotencyKey, dry_run: true, status: status.message }),
      updated_at: new Date().toISOString()
    };
    await upsertWhatsAppMessage(message);
  }
}

async function upsertCampaignSend(payload) {
  let query = supabaseAdmin
    .from('campanha_envios')
    .select('*')
    .eq('tenant_id', payload.tenant_id)
    .eq('campanha_id', payload.campanha_id)
    .eq('cliente_id', payload.cliente_id);
  query = payload.template_id ? query.eq('template_id', payload.template_id) : query.is('template_id', null);

  const { data: existing, error: findError } = await query.maybeSingle();
  if (findError) throw findError;
  if (existing) {
    const { data, error } = await supabaseAdmin
      .from('campanha_envios')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabaseAdmin
    .from('campanha_envios')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function upsertWhatsAppMessage(payload) {
  const { data: existing, error: findError } = await supabaseAdmin
    .from('mensagens_whatsapp')
    .select('id')
    .eq('idempotency_key', payload.idempotency_key)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) {
    const { error } = await supabaseAdmin
      .from('mensagens_whatsapp')
      .update(payload)
      .eq('id', existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabaseAdmin
    .from('mensagens_whatsapp')
    .insert(payload);
  if (error) throw error;
}

async function audit() {
  const tenant = await selectTenant();
  const [users, services, professionals, templates] = await Promise.all([
    listTenantUsers(tenant.id),
    listServices(tenant.id),
    listProfessionals(tenant.id),
    listTemplates(tenant.id)
  ]);
  const nonAdmins = users.filter((user) => !String(user.role || user.tipo_usuario || '').toLowerCase().includes('admin'));
  const admins = users.length - nonAdmins.length;
  return {
    tenant: { id: tenant.id, slug: tenant.slug, nome: tenant.nome_fantasia || tenant.nome },
    users: users.length,
    estimated_clients: nonAdmins.length * CLIENTS_PER_USER + admins * CLIENTS_PER_ADMIN,
    services: services.length,
    professionals: professionals.length,
    marketing_templates: templates.length,
    seed: SEED
  };
}

async function seed() {
  const tenant = await selectTenant();
  const [users, templates] = await Promise.all([
    listTenantUsers(tenant.id),
    listTemplates(tenant.id)
  ]);
  if (!users.length) throw new Error('Nenhum usuario ativo encontrado para distribuir clientes de teste.');
  const template = templates[0] || null;
  const clients = [];

  for (const user of users) {
    const isAdmin = String(user.role || user.tipo_usuario || '').toLowerCase().includes('admin');
    const amount = isAdmin ? CLIENTS_PER_ADMIN : CLIENTS_PER_USER;
    for (let index = 0; index < amount; index += 1) {
      clients.push(await upsertClient(tenant.id, user, clients.length));
    }
  }

  const coupons = [
    await upsertCoupon(tenant.id, null, 'CAMPTEST15', 'valid'),
    await upsertCoupon(tenant.id, null, 'CAMPTESTEXP', 'expired'),
    await upsertCoupon(tenant.id, null, 'CAMPTESTPRECO', 'price')
  ];

  const campaigns = [];
  for (let index = 0; index < CAMPAIGN_STATUSES.length; index += 1) {
    campaigns.push(await upsertCampaign(tenant.id, template, coupons[index % coupons.length], index));
  }

  if (campaigns[0] && template) {
    await seedMessages(tenant.id, campaigns[0], template, clients);
  }

  return {
    tenant: tenant.slug,
    clients: clients.length,
    coupons: coupons.length,
    campaigns: campaigns.length,
    messages: template ? Math.min(clients.length, MESSAGE_STATUSES.length) : 0,
    seed: SEED
  };
}

async function cleanup() {
  if (!process.argv.includes('--confirm-campaign-test-cleanup')) {
    throw new Error('Confirme a limpeza com --confirm-campaign-test-cleanup.');
  }
  const tenant = await selectTenant();
  const result = {};

  result.messages = await deleteMarked('mensagens_whatsapp', tenant.id, 'payload');
  result.sends = await deleteMarked('campanha_envios', tenant.id, 'metadata');
  result.couponUses = await deleteMarked('cupom_usos', tenant.id, 'metadata');
  result.campaigns = await deleteMarked('campanhas', tenant.id, 'metadata');
  result.coupons = await deleteMarked('cupons', tenant.id, 'metadata');
  result.links = await deleteMarked('cliente_tenants', tenant.id, 'metadata');
  result.clients = await deleteClients();

  return { ...result, seed: SEED };
}

async function deleteMarked(table, tenantId, jsonColumn) {
  const { data, error } = await supabaseAdmin
    .from(table)
    .delete()
    .eq('tenant_id', tenantId)
    .eq(`${jsonColumn}->>seed`, SEED)
    .select('id');
  if (error) throw error;
  return (data || []).length;
}

async function deleteClients() {
  const { data, error } = await supabaseAdmin
    .from('clientes')
    .delete()
    .eq('metadata->>seed', SEED)
    .select('id');
  if (error) throw error;
  return (data || []).length;
}

async function validate() {
  const tenant = await selectTenant();
  const [campaigns, coupons, messages, clients] = await Promise.all([
    countMarked('campanhas', tenant.id, 'metadata'),
    countMarked('cupons', tenant.id, 'metadata'),
    countMarked('mensagens_whatsapp', tenant.id, 'payload'),
    countClients()
  ]);
  return {
    tenant: tenant.slug,
    campaigns,
    coupons,
    messages,
    clients,
    ok: campaigns >= CAMPAIGN_STATUSES.length && coupons >= 3,
    seed: SEED
  };
}

async function countMarked(table, tenantId, jsonColumn) {
  const { count, error } = await supabaseAdmin
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq(`${jsonColumn}->>seed`, SEED);
  if (error) throw error;
  return count || 0;
}

async function countClients() {
  const { count, error } = await supabaseAdmin
    .from('clientes')
    .select('id', { count: 'exact', head: true })
    .eq('metadata->>seed', SEED);
  if (error) throw error;
  return count || 0;
}

async function main() {
  assertEnvironment();
  const command = process.argv[2] || 'audit';
  const handlers = { audit, seed, cleanup, validate };
  if (!handlers[command]) throw new Error(`Comando invalido: ${command}`);
  const result = await handlers[command]();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
