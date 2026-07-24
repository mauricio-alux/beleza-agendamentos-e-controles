#!/usr/bin/env node

const { supabaseAdmin } = require('../src/config/supabase');

const SEED = 'campaign_test_seed_2026';
const ALLOWED_ENVS = new Set(['development', 'dev', 'test', 'local']);
const BLOCKED_ENVS = new Set(['production', 'prod', 'prd', 'homologation', 'hml']);
const TARGET_TENANTS = [
  {
    key: 'espaco_vivian_beauty',
    label: 'Espaco Vivian Beauty',
    names: ['Espaco Vivian Beauty', 'Espaço Vivian Beauty'],
    slugs: ['espaco-vivian-beauty', 'espaco-vivian', 'vivian-beauty']
  },
  {
    key: 'bellory_test_studio',
    label: 'Bellory Test Studio',
    names: ['Bellory Test Studio'],
    slugs: ['bellory-test-studio']
  }
];
const ELIGIBLE_ROLES = new Set(['Funcionario', 'Terceiro', 'Autonomo', 'Administrador']);
const EXCLUDED_ROLES = new Set(['Profissional Adm']);
const CLIENTS_BY_ROLE = {
  Administrador: 5,
  Funcionario: 15,
  Terceiro: 15,
  Autonomo: 15
};
const NON_ADMIN_SCENARIOS = [
  'new',
  'new',
  'recurring',
  'recurring',
  'recurring',
  'inactive_45',
  'inactive_45',
  'inactive_120',
  'inactive_120',
  'future_appointment',
  'future_appointment',
  'cancelled',
  'no_show',
  'birthday',
  'inelegible_opt_out'
];
const ADMIN_SCENARIOS = ['new', 'recurring', 'inactive_45', 'future_appointment', 'inelegible_or_birthday'];
const CAMPAIGN_DEFINITIONS = [
  ['rascunho', 'Promocao de Manicure'],
  ['pronta', 'Recuperacao de inativos'],
  ['agendada', 'Aniversario do mes'],
  ['gerando_mensagens', 'Clientes recorrentes'],
  ['em_processamento', 'Preenchimento de horarios'],
  ['concluida', 'Campanha com cupom'],
  ['cancelada', 'Campanha sem publico elegivel']
];
const MESSAGE_STATUSES = [
  { message: 'pendente', send: 'pendente' },
  { message: 'agendado', send: 'agendado' },
  { message: 'processando', send: 'processando' },
  { message: 'submetido', send: 'enviado' },
  { message: 'erro', send: 'erro' },
  { message: 'cancelado', send: 'cancelado' }
];
const FIRST_NAMES = [
  'Amanda',
  'Bianca',
  'Camila',
  'Daniela',
  'Elaine',
  'Fernanda',
  'Gabriela',
  'Helena',
  'Isabela',
  'Juliana',
  'Karina',
  'Larissa',
  'Mariana',
  'Natalia',
  'Patricia',
  'Renata',
  'Sabrina',
  'Tatiana',
  'Vanessa',
  'Yasmin'
];
const LAST_NAMES = [
  'Almeida',
  'Barbosa',
  'Cardoso',
  'Duarte',
  'Ferreira',
  'Gomes',
  'Lima',
  'Martins',
  'Oliveira',
  'Pereira',
  'Ribeiro',
  'Santos'
];

function assertEnvironment() {
  const appEnv = String(process.env.APP_ENVIRONMENT || process.env.NODE_ENV || 'development').toLowerCase();
  if (BLOCKED_ENVS.has(appEnv) || !ALLOWED_ENVS.has(appEnv)) {
    throw new Error(`Ambiente bloqueado para seed de campanhas: ${appEnv}. Use development/test/local.`);
  }
}

function metadata(extra = {}) {
  return { ...extra, seed: SEED, campaign_test_seed: true };
}

function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(days, hour = 13) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function roleName(user) {
  return user.role || user.tipo_usuario || '';
}

function isEligibleRole(user) {
  return ELIGIBLE_ROLES.has(roleName(user));
}

function isExcludedRole(user) {
  return EXCLUDED_ROLES.has(roleName(user));
}

function plannedClientCount(user) {
  return CLIENTS_BY_ROLE[roleName(user)] || 0;
}

function scenarioFor(user, index) {
  return roleName(user) === 'Administrador'
    ? ADMIN_SCENARIOS[index % ADMIN_SCENARIOS.length]
    : NON_ADMIN_SCENARIOS[index % NON_ADMIN_SCENARIOS.length];
}

function scenarioLabel(scenario) {
  return {
    new: 'Cliente novo',
    recurring: 'Cliente recorrente',
    inactive_45: 'Inativo entre 30 e 60 dias',
    inactive_120: 'Inativo ha mais de 90 dias',
    future_appointment: 'Atendimento futuro',
    cancelled: 'Cancelamento',
    no_show: 'No-show',
    birthday: 'Aniversariante proximos 7 dias',
    inelegible_opt_out: 'Opt-out',
    inelegible_or_birthday: 'Inelegivel ou aniversariante'
  }[scenario] || scenario;
}

function secondaryScenarios(scenario) {
  return {
    new: ['sem_atendimento_futuro', 'consentimento_valido'],
    recurring: ['servico_ja_utilizado', 'sem_atendimento_futuro', 'consentimento_valido'],
    inactive_45: ['servico_ja_utilizado', 'sem_atendimento_futuro', 'consentimento_valido'],
    inactive_120: ['servico_ja_utilizado', 'sem_atendimento_futuro', 'consentimento_valido'],
    future_appointment: ['com_atendimento_futuro', 'consentimento_valido'],
    cancelled: ['sem_atendimento_futuro', 'consentimento_valido'],
    no_show: ['sem_atendimento_futuro', 'consentimento_valido'],
    birthday: ['aniversariante_mes', 'sem_atendimento_futuro', 'consentimento_valido'],
    inelegible_opt_out: ['sem_consentimento', 'telefone_invalido'],
    inelegible_or_birthday: ['sem_consentimento', 'aniversariante_mes']
  }[scenario] || [];
}

function deterministicClientName(ctx, user, index) {
  const first = FIRST_NAMES[index % FIRST_NAMES.length];
  const last = LAST_NAMES[(index + roleName(user).length) % LAST_NAMES.length];
  return `${first} ${last} - ${ctx.tenant.slug} - ${roleName(user)} ${index + 1}`;
}

async function findTenant(target) {
  const bySlug = await supabaseAdmin
    .from('tenants')
    .select('id, nome_fantasia, slug, status, tipo_negocio, ativo')
    .in('slug', target.slugs)
    .is('deleted_at', null)
    .limit(1);
  if (bySlug.error) throw bySlug.error;
  if (bySlug.data?.[0]) return bySlug.data[0];

  const byName = await supabaseAdmin
    .from('tenants')
    .select('id, nome_fantasia, slug, status, tipo_negocio, ativo')
    .is('deleted_at', null)
    .limit(200);
  if (byName.error) throw byName.error;
  const targetNames = (target.names || [target.label]).map(normalizeText);
  return (byName.data || []).find((tenant) => {
    const tenantName = normalizeText(tenant.nome_fantasia);
    const tenantSlug = normalizeText(tenant.slug);
    return targetNames.some((name) => tenantName === name)
      || target.slugs.some((slug) => tenantSlug === normalizeText(slug));
  }) || null;
}

async function listUsers(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('tenant_memberships')
    .select('id, role, status, profissional_id, usuario:usuarios(id, nome, email, tipo_usuario, ativo)')
    .eq('tenant_id', tenantId)
    .eq('status', 'ativo');
  if (error) throw error;
  return (data || []).filter((item) => item.usuario).map((item) => ({
    ...item.usuario,
    membership_id: item.id,
    membership_status: item.status,
    role: item.role,
    profissional_id: item.profissional_id
  }));
}

async function listProfessionals(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('profissionais')
    .select('id, usuario_id, nome_publico, cargo, ativo')
    .eq('tenant_id', tenantId)
    .eq('ativo', true)
    .is('deleted_at', null);
  if (error) throw error;
  return data || [];
}

async function listServices(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('servicos')
    .select('id, nome, preco, duracao_minutos, categoria')
    .eq('tenant_id', tenantId)
    .eq('ativo', true)
    .is('deleted_at', null)
    .order('nome');
  if (error) throw error;
  return data || [];
}

async function listProfessionalServices(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('profissional_servicos')
    .select('id, profissional_id, servico_id, preco_especifico, duracao_especifica_minutos')
    .eq('tenant_id', tenantId)
    .eq('ativo', true)
    .is('deleted_at', null);
  if (error) throw error;
  return data || [];
}

async function listTemplates(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('templates_mensagem')
    .select('id, nome, tipo, conteudo, variaveis, metadata')
    .eq('canal', 'whatsapp')
    .eq('ativo', true)
    .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
    .is('deleted_at', null);
  if (error) throw error;
  return (data || []).filter((item) => item.tipo === 'marketing' || item.metadata?.categoria === 'campanha');
}

async function buildTenantContext(target) {
  const tenant = await findTenant(target);
  if (!tenant) return { target, tenant: null, users: [], eligibleUsers: [], excludedUsers: [], professionals: [], services: [], templates: [], links: [] };
  const [users, professionals, services, templates, links] = await Promise.all([
    listUsers(tenant.id),
    listProfessionals(tenant.id),
    listServices(tenant.id),
    listTemplates(tenant.id),
    listProfessionalServices(tenant.id)
  ]);
  return {
    target,
    tenant,
    users,
    eligibleUsers: users.filter(isEligibleRole),
    excludedUsers: users.filter((user) => isExcludedRole(user) || !isEligibleRole(user)),
    professionals,
    services,
    templates,
    links
  };
}

async function findByMetadata(table, tenantId, seedKey, column = 'metadata') {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq(`${column}->>seed_key`, seedKey)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function upsertByMetadata(table, tenantId, seedKey, payload, column = 'metadata') {
  const existing = await findByMetadata(table, tenantId, seedKey, column);
  if (existing) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabaseAdmin.from(table).insert(payload).select().single();
  if (error) throw error;
  return data;
}

function clientPayload(ctx, user, index, scenario) {
  const seedKey = `${ctx.tenant.slug}:${user.id}:${index}`;
  const noPhone = scenario === 'inelegible_or_birthday' && index % 2 === 0;
  const invalid = scenario === 'inelegible_opt_out';
  return {
    seedKey,
    nome: deterministicClientName(ctx, user, index),
    telefone: noPhone ? '' : invalid ? '119' : `+55119${String(70000000 + index).slice(0, 8)}`,
    email: `${SEED}.${ctx.tenant.slug}.${user.id}.${index}@example.com`,
    data_nascimento: scenario.includes('birthday') || scenario === 'inelegible_or_birthday' ? dateOnly(addDays(3, 12)).replace(/^\d{4}/, '1990') : '1990-01-15',
    metadata: metadata({ seed_key: seedKey, scenario, owner_user_id: user.id, owner_role: roleName(user) }),
    ativo: true,
    updated_at: new Date().toISOString()
  };
}

async function upsertClient(ctx, user, index, scenario, professionalId) {
  const base = clientPayload(ctx, user, index, scenario);
  const existing = await supabaseAdmin.from('clientes').select('*').eq('email', base.email).maybeSingle();
  if (existing.error) throw existing.error;
  const clientData = {
    nome: base.nome,
    telefone: base.telefone || '119',
    email: base.email,
    data_nascimento: base.data_nascimento,
    metadata: base.metadata,
    ativo: true,
    updated_at: new Date().toISOString()
  };
  const client = existing.data
    ? (await supabaseAdmin.from('clientes').update(clientData).eq('id', existing.data.id).select().single()).data
    : (await supabaseAdmin.from('clientes').insert(clientData).select().single()).data;

  if (!client) throw new Error('Falha ao criar cliente de teste.');
  const allowMarketing = !['inelegible_opt_out', 'inelegible_or_birthday'].includes(scenario);
  const linkPayload = {
    tenant_id: ctx.tenant.id,
    cliente_id: client.id,
    nome_no_tenant: client.nome,
    origem: 'seed_campanhas',
    status: 'ativo',
    aceita_campanhas: allowMarketing,
    metadata: metadata({ seed_key: base.seedKey, scenario, owner_user_id: user.id, responsible_profissional_id: professionalId, permite_marketing: allowMarketing }),
    ativo: true,
    updated_at: new Date().toISOString()
  };
  const link = await supabaseAdmin
    .from('cliente_tenants')
    .upsert(linkPayload, { onConflict: 'tenant_id,cliente_id' })
    .select()
    .single();
  if (link.error) throw link.error;
  return { client, link: link.data, seedKey: base.seedKey, scenario, user, professionalId };
}

function pickAssignment(ctx, user, index) {
  const professional = ctx.professionals.find((item) => item.id === user.profissional_id)
    || ctx.professionals.find((item) => item.usuario_id === user.id)
    || ctx.professionals[index % Math.max(ctx.professionals.length, 1)];
  const allowed = professional ? ctx.links.filter((item) => item.profissional_id === professional.id) : [];
  const link = allowed[index % Math.max(allowed.length, 1)] || ctx.links[index % Math.max(ctx.links.length, 1)];
  const service = ctx.services.find((item) => item.id === link?.servico_id) || ctx.services[index % Math.max(ctx.services.length, 1)];
  return {
    professional: professional || ctx.professionals[0],
    service,
    professionalService: link || null
  };
}

async function upsertAppointment(ctx, clientInfo, assignment, suffix, status, days, hour = 13) {
  if (!assignment.professional || !assignment.service) return null;
  const start = addDays(days, hour);
  const duration = assignment.professionalService?.duracao_especifica_minutos || assignment.service.duracao_minutos || 45;
  const end = new Date(start.getTime() + duration * 60000);
  const seedKey = `${clientInfo.seedKey}:appt:${suffix}`;
  const payload = {
    tenant_id: ctx.tenant.id,
    cliente_id: clientInfo.client.id,
    profissional_id: assignment.professional.id,
    data_inicio: start.toISOString(),
    data_fim: end.toISOString(),
    status,
    origem: 'manual',
    observacoes: `Massa de teste ${SEED}`,
    valor_total: Number(assignment.professionalService?.preco_especifico || assignment.service.preco || 0),
    desconto_total: 0,
    confirmado_em: ['confirmado', 'concluido', 'no_show'].includes(status) ? start.toISOString() : null,
    concluido_em: status === 'concluido' ? end.toISOString() : null,
    cancelado_em: status === 'cancelado' ? start.toISOString() : null,
    metadata: metadata({ seed_key: seedKey, scenario: clientInfo.scenario, owner_user_id: clientInfo.user.id }),
    ativo: true,
    updated_at: new Date().toISOString()
  };
  const appointment = await upsertByMetadata('agendamentos', ctx.tenant.id, seedKey, payload);
  const servicePayload = {
    tenant_id: ctx.tenant.id,
    agendamento_id: appointment.id,
    servico_id: assignment.service.id,
    nome_servico: assignment.service.nome,
    duracao_minutos: duration,
    valor_servico: payload.valor_total,
    ativo: true,
    updated_at: new Date().toISOString()
  };
  const serviceResult = await supabaseAdmin
    .from('agendamento_servicos')
    .upsert(servicePayload, { onConflict: 'agendamento_id,servico_id' });
  if (serviceResult.error) throw serviceResult.error;
  if (['concluido', 'no_show'].includes(status)) {
    await upsertHistory(ctx, clientInfo, appointment, assignment, status);
  }
  return appointment;
}

async function upsertHistory(ctx, clientInfo, appointment, assignment, status) {
  const existing = await supabaseAdmin
    .from('cliente_historico_atendimentos')
    .select('*')
    .eq('tenant_id', ctx.tenant.id)
    .eq('agendamento_id', appointment.id)
    .maybeSingle();
  if (existing.error) throw existing.error;
  const payload = {
    tenant_id: ctx.tenant.id,
    cliente_id: clientInfo.client.id,
    agendamento_id: appointment.id,
    profissional_id: assignment.professional.id,
    servico_id: assignment.service.id,
    status,
    data_atendimento: appointment.data_inicio,
    valor_servico: appointment.valor_total,
    origem: 'agenda',
    metadata: metadata({ seed_key: `${clientInfo.seedKey}:history:${appointment.id}`, scenario: clientInfo.scenario }),
    ativo: true,
    updated_at: new Date().toISOString()
  };
  const result = existing.data
    ? await supabaseAdmin.from('cliente_historico_atendimentos').update(payload).eq('id', existing.data.id)
    : await supabaseAdmin.from('cliente_historico_atendimentos').insert(payload);
  if (result.error) throw result.error;
}

async function seedAppointments(ctx, clientInfo, assignment, localIndex) {
  const scenario = clientInfo.scenario;
  if (scenario === 'recurring') {
    await upsertAppointment(ctx, clientInfo, assignment, 'recurring-1', 'concluido', -7, 9 + (localIndex % 8));
    await upsertAppointment(ctx, clientInfo, assignment, 'recurring-2', 'concluido', -35, 9 + (localIndex % 8));
    await upsertAppointment(ctx, clientInfo, assignment, 'recurring-3', 'concluido', -95, 9 + (localIndex % 8));
  } else if (scenario === 'inactive_45') {
    await upsertAppointment(ctx, clientInfo, assignment, 'inactive-45', 'concluido', -45, 9 + (localIndex % 8));
  } else if (scenario === 'inactive_120') {
    await upsertAppointment(ctx, clientInfo, assignment, 'inactive-120', 'concluido', -120, 9 + (localIndex % 8));
  } else if (scenario === 'future_appointment') {
    await upsertAppointment(ctx, clientInfo, assignment, 'future', 'confirmado', 5 + (localIndex % 20), 9 + (localIndex % 8));
  } else if (scenario === 'cancelled') {
    await upsertAppointment(ctx, clientInfo, assignment, 'cancelled', 'cancelado', -12, 9 + (localIndex % 8));
  } else if (scenario === 'no_show') {
    await upsertAppointment(ctx, clientInfo, assignment, 'no-show', 'no_show', -10, 9 + (localIndex % 8));
  } else if (scenario === 'birthday') {
    await upsertAppointment(ctx, clientInfo, assignment, 'birthday', 'concluido', -18, 9 + (localIndex % 8));
  }
}

async function upsertCoupons(ctx, clients) {
  const manicure = ctx.services.find((item) => String(item.nome).toLowerCase().includes('manicure')) || ctx.services[0];
  const defs = [
    ['TESTE10', 'percentual', 10, null, true, 'valid'],
    ['TESTE20', 'valor', null, 20, true, 'expired'],
    ['MANI30', 'preco_promocional', null, 30, true, 'service_restricted']
  ];
  const coupons = [];
  for (const [code, type, percent, value, active, scenario] of defs) {
    const seedKey = `${ctx.tenant.slug}:coupon:${code}`;
    const payload = {
      tenant_id: ctx.tenant.id,
      codigo: code,
      nome: code,
      descricao: `Cupom de teste ${SEED}`,
      tipo_codigo: 'generico',
      tipo_desconto: type,
      percentual_desconto: percent,
      valor_desconto: value,
      data_inicio: dateOnly(addDays(-10)),
      data_fim: scenario === 'expired' ? dateOnly(addDays(-1)) : dateOnly(addDays(30)),
      limite_uso: scenario === 'valid' ? 1 : 100,
      limite_usos_por_cliente: 1,
      qtd_utilizada: scenario === 'valid' ? 1 : 0,
      ativo: active && scenario !== 'expired',
      metadata: metadata({ seed_key: seedKey, coupon_scenario: scenario }),
      updated_at: new Date().toISOString()
    };
    coupons.push(await upsertByMetadata('cupons', ctx.tenant.id, seedKey, payload));
  }
  if (manicure && coupons[2]) {
    const { error } = await supabaseAdmin.from('cupom_servicos').upsert({
      tenant_id: ctx.tenant.id,
      cupom_id: coupons[2].id,
      servico_id: manicure.id,
      ativo: true
    }, { onConflict: 'tenant_id,cupom_id,servico_id' });
    if (error) throw error;
  }
  for (let index = 0; index < Math.min(3, clients.length); index += 1) {
    const status = ['reservado', 'utilizado', 'cancelado'][index];
    await upsertByMetadata('cupom_usos', ctx.tenant.id, `${ctx.tenant.slug}:coupon-use:${status}`, {
      tenant_id: ctx.tenant.id,
      cupom_id: coupons[0].id,
      cliente_id: clients[index].client.id,
      valor_desconto: 10,
      status,
      reservado_em: status === 'reservado' ? new Date().toISOString() : null,
      utilizado_em: status === 'utilizado' ? new Date().toISOString() : null,
      cancelado_em: status === 'cancelado' ? new Date().toISOString() : null,
      metadata: metadata({ seed_key: `${ctx.tenant.slug}:coupon-use:${status}`, status }),
      ativo: status !== 'cancelado',
      updated_at: new Date().toISOString()
    });
  }
  return coupons;
}

async function upsertCampaigns(ctx, template, coupons) {
  const campaigns = [];
  for (let index = 0; index < CAMPAIGN_DEFINITIONS.length; index += 1) {
    const [status, title] = CAMPAIGN_DEFINITIONS[index];
    const seedKey = `${ctx.tenant.slug}:campaign:${index}`;
    campaigns.push(await upsertByMetadata('campanhas', ctx.tenant.id, seedKey, {
      tenant_id: ctx.tenant.id,
      nome: `[${SEED}] ${title}`,
      descricao: `Campanha de teste: ${title}`,
      tipo: 'promocao_servico',
      canal: 'whatsapp',
      template_id: template?.id || null,
      status,
      criterios_segmentacao: index === 6 ? { mode: 'manual', client_ids: [] } : { mode: 'all' },
      publico_alvo: index === 6 ? { mode: 'manual', client_ids: [] } : { mode: 'all' },
      parametros_template: {
        nome_servico: { source: 'fixed', value: 'Manicure' },
        valor_promocional: { source: 'fixed', value: 'R$ 30,00' },
        codigo_cupom: { source: 'fixed', value: coupons[index % coupons.length]?.codigo || 'TESTE10' }
      },
      agendada_para: status === 'agendada' ? addDays(2).toISOString() : null,
      metadata: metadata({ seed_key: seedKey, cupom_id: coupons[index % coupons.length]?.id || null }),
      tracking_token: `cmp_${ctx.tenant.slug}_${index}`,
      ativo: true,
      updated_at: new Date().toISOString()
    }));
  }
  return campaigns;
}

async function upsertMessages(ctx, campaign, template, clients) {
  for (let index = 0; index < Math.min(MESSAGE_STATUSES.length, clients.length); index += 1) {
    const item = MESSAGE_STATUSES[index];
    const client = clients[index].client;
    const key = `${ctx.tenant.id}:${campaign.id}:${client.id}:${template?.id || 'template'}`;
    const send = await upsertCampaignSend({
      tenant_id: ctx.tenant.id,
      campanha_id: campaign.id,
      cliente_id: client.id,
      template_id: template?.id || null,
      status: item.send,
      metadata: metadata({ seed_key: `${ctx.tenant.slug}:send:${index}`, idempotency_key: key }),
      updated_at: new Date().toISOString()
    });
    await upsertWhatsAppMessage({
      tenant_id: ctx.tenant.id,
      cliente_id: client.id,
      campanha_id: campaign.id,
      campanha_envio_id: send.id,
      telefone_destino: client.telefone,
      direcao: 'saida',
      template_nome: template?.nome || 'campaign_test_template',
      conteudo: `Mensagem de campanha de teste ${SEED}`,
      tipo_evento: 'campaign.message',
      provider: 'whatsapp_mysaas',
      status_envio: item.message,
      idempotency_key: key,
      payload: metadata({ seed_key: `${ctx.tenant.slug}:message:${index}`, dry_run: true, simulated_webhook: false }),
      updated_at: new Date().toISOString()
    });
  }
}

async function upsertCampaignSend(payload) {
  const existing = await supabaseAdmin.from('campanha_envios').select('*').eq('tenant_id', payload.tenant_id).eq('campanha_id', payload.campanha_id).eq('cliente_id', payload.cliente_id).maybeSingle();
  if (existing.error) throw existing.error;
  const result = existing.data
    ? await supabaseAdmin.from('campanha_envios').update(payload).eq('id', existing.data.id).select().single()
    : await supabaseAdmin.from('campanha_envios').insert(payload).select().single();
  if (result.error) throw result.error;
  return result.data;
}

async function upsertWhatsAppMessage(payload) {
  const existing = await supabaseAdmin.from('mensagens_whatsapp').select('id').eq('idempotency_key', payload.idempotency_key).maybeSingle();
  if (existing.error) throw existing.error;
  const result = existing.data
    ? await supabaseAdmin.from('mensagens_whatsapp').update(payload).eq('id', existing.data.id)
    : await supabaseAdmin.from('mensagens_whatsapp').insert(payload);
  if (result.error) throw result.error;
}

async function audit() {
  const contexts = await Promise.all(TARGET_TENANTS.map(buildTenantContext));
  return {
    seed: SEED,
    generated_at: new Date().toISOString(),
    restrictions: [
      'audit apenas consulta dados',
      'seed nao deve ser executado antes da revisao deste relatorio',
      'cleanup exige --confirm-campaign-test-cleanup',
      'nenhum envio real para WhatsApp ou Meta'
    ],
    tenants: await Promise.all(contexts.map(buildTenantAudit)),
    idempotency: idempotencyPlan(),
    cleanup_order: cleanupPlan(),
    future_execution_order: [
      'npm run campaign-test:audit',
      'revisar o relatorio detalhado',
      'npm run campaign-test:seed',
      'npm run campaign-test:validate',
      'executar testes funcionais de Campanhas',
      'npm run campaign-test:cleanup -- --confirm-campaign-test-cleanup'
    ]
  };
}

async function buildTenantAudit(ctx) {
  if (!ctx.tenant) {
    return {
      target: ctx.target.label,
      found: false,
      risks: ['tenant_nao_encontrado'],
      planned: emptyPlan()
    };
  }
  const plannedClients = plannedClientRows(ctx);
  const planned = plannedCounts(ctx);
  const existing = await existingSeedCounts(ctx.tenant.id, ctx.tenant.slug);
  return {
    target: ctx.target.label,
    found: true,
    tenant: ctx.tenant,
    users_found: ctx.users.length,
    users_by_profile: usersByProfile(ctx.users),
    users_eligible: ctx.eligibleUsers.length,
    users_excluded: ctx.excludedUsers.map((user) => userAuditRow(user, false)),
    users: ctx.users.map((user) => userAuditRow(user, isEligibleRole(user))),
    records_by_table: tablePlanRows(ctx, planned, existing),
    planned_clients: plannedClients,
    scenario_distribution: scenarioDistribution(plannedClients, ctx),
    appointment_history_plan: appointmentHistoryPlan(ctx, plannedClients),
    service_professional_usage: serviceProfessionalUsage(ctx, plannedClients),
    coupons: couponPlan(ctx),
    campaigns: campaignPlan(ctx),
    idempotency_summary: 'A massa usa seed, seed_key, chaves naturais e upsert/consulta previa para reaproveitar registros.',
    cleanup_summary: 'A limpeza remove apenas registros com campaign_test_seed_2026, em ordem de dependencias.',
    risks: tenantRisks(ctx)
  };
}

function userAuditRow(user, eligible) {
  return {
    user_id: user.id,
    nome: user.nome,
    email: user.email,
    perfil: roleName(user),
    status: user.membership_status || (user.ativo ? 'ativo' : 'inativo'),
    elegivel: eligible,
    motivo: eligible ? 'perfil_elegivel' : excludedReason(user),
    clientes_previstos: eligible ? plannedClientCount(user) : 0
  };
}

function excludedReason(user) {
  if (isExcludedRole(user)) return 'perfil_excluido_profissional_adm';
  if (!isEligibleRole(user)) return 'perfil_nao_previsto_na_massa';
  if (user.membership_status && user.membership_status !== 'ativo') return 'membership_inativa';
  return 'nao_elegivel';
}

function usersByProfile(users) {
  return users.reduce((acc, user) => {
    const role = roleName(user) || 'sem_perfil';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});
}

function plannedClientRows(ctx) {
  const rows = [];
  let globalIndex = 0;
  for (const user of ctx.eligibleUsers) {
    for (let userIndex = 0; userIndex < plannedClientCount(user); userIndex += 1) {
      const scenario = scenarioFor(user, userIndex);
      const assignment = pickAssignment(ctx, user, globalIndex);
      const client = clientPayload(ctx, user, globalIndex, scenario);
      rows.push({
        tenant: ctx.tenant.slug,
        usuario_responsavel: user.nome,
        usuario_id: user.id,
        perfil: roleName(user),
        cliente_previsto: client.nome,
        email_previsto: client.email,
        cenario_principal: scenarioLabel(scenario),
        cenario_codigo: scenario,
        cenarios_secundarios: secondaryScenarios(scenario),
        servico_relacionado: assignment.service?.nome || null,
        servico_id: assignment.service?.id || null,
        profissional_relacionado: assignment.professional?.nome_publico || null,
        profissional_id: assignment.professional?.id || null,
        relacionamento_modelado_por: [
          'cliente_tenants.metadata.owner_user_id',
          'cliente_tenants.metadata.responsible_profissional_id',
          'agendamentos.profissional_id',
          'cliente_historico_atendimentos.profissional_id'
        ],
        seed_key: client.seedKey
      });
      globalIndex += 1;
    }
  }
  return rows;
}

function tablePlanRows(ctx, planned, existing) {
  const withTenant = (table, newRows, marker) => ({
    tabela: table,
    tenant: ctx.tenant.slug,
    registros_existentes_considerados: existing[table] || 0,
    novos_registros_previstos: newRows,
    forma_identificacao_massa: marker
  });
  return [
    withTenant('clientes', planned.clientes, 'clientes.metadata.seed + email deterministico'),
    withTenant('cliente_tenants', planned.cliente_tenants, 'cliente_tenants.metadata.seed + unique tenant_id/cliente_id'),
    withTenant('agendamentos', planned.agendamentos, 'agendamentos.metadata.seed + metadata.seed_key'),
    withTenant('agendamento_servicos', planned.agendamentos, 'agendamento_id dos agendamentos marcados + unique agendamento_id/servico_id'),
    withTenant('cliente_historico_atendimentos', planned.cliente_historico_atendimentos, 'metadata.seed + unique tenant_id/agendamento_id'),
    withTenant('campanhas', planned.campanhas, 'campanhas.metadata.seed + metadata.seed_key + tracking_token'),
    withTenant('cupons', planned.cupons, 'cupons.metadata.seed + metadata.seed_key'),
    withTenant('cupom_servicos', ctx.services.length ? 1 : 0, 'cupom_id dos cupons marcados + unique tenant_id/cupom_id/servico_id'),
    withTenant('cupom_usos', planned.cupom_usos, 'cupom_usos.metadata.seed + metadata.seed_key'),
    withTenant('campanha_envios', planned.campanha_envios, 'campanha_envios.metadata.seed + unique tenant/campanha/cliente/template'),
    withTenant('mensagens_whatsapp', planned.mensagens_whatsapp, 'mensagens_whatsapp.payload.seed + idempotency_key')
  ];
}

function scenarioDistribution(plannedClients, ctx) {
  const rows = {};
  for (const client of plannedClients) {
    const keys = [client.cenario_codigo, ...client.cenarios_secundarios];
    for (const key of keys) rows[key] = (rows[key] || 0) + 1;
  }
  const defs = {
    new: ['sem atendimento concluido', 'clientes, cliente_tenants'],
    recurring: ['tres atendimentos concluidos', 'agendamentos, cliente_historico_atendimentos'],
    inactive_45: ['ultimo atendimento ha cerca de 45 dias', 'agendamentos, cliente_historico_atendimentos'],
    inactive_120: ['ultimo atendimento ha cerca de 120 dias', 'agendamentos, cliente_historico_atendimentos'],
    future_appointment: ['agenda futura confirmada', 'agendamentos'],
    sem_atendimento_futuro: ['nenhuma agenda futura', 'agendamentos'],
    cancelled: ['agenda cancelada', 'agendamentos'],
    no_show: ['status no_show', 'agendamentos, cliente_historico_atendimentos'],
    birthday: ['data de nascimento nos proximos 7 dias', 'clientes'],
    aniversariante_mes: ['data de nascimento no mes atual', 'clientes'],
    consentimento_valido: ['aceita_campanhas=true', 'cliente_tenants'],
    sem_consentimento: ['aceita_campanhas=false', 'cliente_tenants'],
    opt_out_marketing: ['aceita_campanhas=false por revogacao/preferencia', 'cliente_tenants'],
    telefone_invalido: ['telefone ausente ou invalido', 'clientes'],
    servico_ja_utilizado: ['historico com servico', 'agendamentos, cliente_historico_atendimentos'],
    com_atendimento_futuro: ['agenda futura confirmada', 'agendamentos']
  };
  return Object.entries(defs).map(([key, [criteria, tables]]) => ({
    cenario: key,
    tenant: ctx.tenant.slug,
    quantidade_prevista: rows[key] || 0,
    criterio_utilizado: criteria,
    tabelas_envolvidas: tables,
    sobreposicao_intencional: (rows[key] || 0) > 0 && !['new', 'recurring', 'inactive_45', 'inactive_120', 'future_appointment', 'cancelled', 'no_show', 'birthday'].includes(key)
  }));
}

function appointmentHistoryPlan(ctx, plannedClients) {
  const totals = plannedClients.reduce((acc, client) => {
    const appointments = appointmentsForScenario(client.cenario_codigo);
    const history = historyForScenario(client.cenario_codigo);
    acc.total_agendas += appointments;
    acc.total_historicos += history;
    acc.agendas_futuras += client.cenario_codigo === 'future_appointment' ? 1 : 0;
    acc.agendas_canceladas += client.cenario_codigo === 'cancelled' ? 1 : 0;
    acc.agendas_no_show += client.cenario_codigo === 'no_show' ? 1 : 0;
    acc.agendas_concluidas += history - (client.cenario_codigo === 'no_show' ? 1 : 0);
    acc.agendas_passadas += appointments - (client.cenario_codigo === 'future_appointment' ? 1 : 0);
    return acc;
  }, {
    total_agendas: 0,
    agendas_passadas: 0,
    agendas_futuras: 0,
    agendas_concluidas: 0,
    agendas_canceladas: 0,
    agendas_no_show: 0,
    total_historicos: 0
  });
  return {
    tenant: ctx.tenant.slug,
    ...totals,
    regras_coerencia: [
      'agenda concluida gera historico concluido',
      'agenda cancelada nao gera historico concluido',
      'agenda no_show gera historico no_show',
      'agenda futura nao gera historico de atendimento concluido'
    ],
    periodos_relativos: {
      recorrente: ['-7 dias', '-35 dias', '-95 dias'],
      inativo_45: '-45 dias',
      inativo_120: '-120 dias',
      futuro: '+5 a +24 dias',
      cancelado: '-12 dias',
      no_show: '-10 dias',
      aniversariante: '-18 dias para historico e aniversario em +3 dias'
    }
  };
}

function serviceProfessionalUsage(ctx, plannedClients) {
  const map = new Map();
  for (const client of plannedClients) {
    const key = `${client.profissional_id || 'none'}:${client.servico_id || 'none'}`;
    const current = map.get(key) || {
      tenant: ctx.tenant.slug,
      servico: client.servico_relacionado,
      categoria: ctx.services.find((service) => service.id === client.servico_id)?.categoria || null,
      profissional: client.profissional_relacionado,
      vinculo_valido: Boolean(ctx.links.find((link) => link.profissional_id === client.profissional_id && link.servico_id === client.servico_id)),
      quantidade_agendas_prevista: 0
    };
    current.quantidade_agendas_prevista += appointmentsForScenario(client.cenario_codigo);
    map.set(key, current);
  }
  return Array.from(map.values());
}

function couponPlan(ctx) {
  const manicure = ctx.services.find((item) => String(item.nome).toLowerCase().includes('manicure')) || ctx.services[0];
  return [
    { tenant: ctx.tenant.slug, codigo: 'TESTE10', tipo_beneficio: 'percentual', valor: '10%', status: 'valido_com_limite_atingido', servico_restrito: null, limite_total: 1, limite_por_cliente: 1, cenario: 'cupom_valido_limite' },
    { tenant: ctx.tenant.slug, codigo: 'TESTE20', tipo_beneficio: 'valor', valor: '20', status: 'expirado_inativo', servico_restrito: null, limite_total: 100, limite_por_cliente: 1, cenario: 'cupom_expirado' },
    { tenant: ctx.tenant.slug, codigo: 'MANI30', tipo_beneficio: 'preco_promocional', valor: '30', status: 'valido', servico_restrito: manicure?.nome || null, limite_total: 100, limite_por_cliente: 1, cenario: 'restrito_a_servico' }
  ];
}

function campaignPlan(ctx) {
  const template = ctx.templates[0];
  return CAMPAIGN_DEFINITIONS.map(([status, title], index) => ({
    tenant: ctx.tenant.slug,
    nome_campanha: `[${SEED}] ${title}`,
    tipo: 'promocao_servico',
    status,
    template: template?.nome || null,
    publico_alvo: index === 6 ? 'manual_sem_publico' : 'todos_clientes_da_massa',
    cupom: ['TESTE10', 'TESTE20', 'MANI30'][index % 3],
    quantidade_estimada: index === 6 ? 0 : plannedCounts(ctx).clientes,
    dry_run: true
  }));
}

function idempotencyPlan() {
  return [
    { entidade: 'clientes', identificador_deterministico: 'email campaign_test_seed_2026.tenant.usuario.indice@example.com', chave: 'consulta por email', segunda_execucao: 'atualiza/reutiliza o cliente existente' },
    { entidade: 'cliente_tenants', identificador_deterministico: 'tenant_id + cliente_id', chave: 'unique tenant_id,cliente_id', segunda_execucao: 'upsert atualiza o vinculo' },
    { entidade: 'agendamentos', identificador_deterministico: 'metadata.seed_key tenant:usuario:indice:appt:sufixo', chave: 'consulta previa por metadata.seed_key', segunda_execucao: 'atualiza/reutiliza o agendamento existente' },
    { entidade: 'agendamento_servicos', identificador_deterministico: 'agendamento_id + servico_id', chave: 'unique agendamento_id,servico_id', segunda_execucao: 'upsert atualiza/reutiliza o item' },
    { entidade: 'cliente_historico_atendimentos', identificador_deterministico: 'tenant_id + agendamento_id', chave: 'unique tenant_id,agendamento_id', segunda_execucao: 'atualiza/reutiliza o historico' },
    { entidade: 'campanhas', identificador_deterministico: 'metadata.seed_key e tracking_token', chave: 'consulta por metadata.seed_key e indice unico de tracking_token', segunda_execucao: 'atualiza/reutiliza a campanha' },
    { entidade: 'cupons', identificador_deterministico: 'metadata.seed_key tenant:coupon:codigo', chave: 'consulta por metadata.seed_key', segunda_execucao: 'atualiza/reutiliza o cupom' },
    { entidade: 'cupom_servicos', identificador_deterministico: 'tenant_id + cupom_id + servico_id', chave: 'unique tenant_id,cupom_id,servico_id', segunda_execucao: 'upsert reutiliza o vinculo' },
    { entidade: 'cupom_usos', identificador_deterministico: 'metadata.seed_key tenant:coupon-use:status', chave: 'consulta por metadata.seed_key', segunda_execucao: 'atualiza/reutiliza a utilizacao' },
    { entidade: 'campanha_envios', identificador_deterministico: 'tenant_id + campanha_id + cliente_id + template_id', chave: 'unique tenant/campanha/cliente/template', segunda_execucao: 'atualiza/reutiliza o envio' },
    { entidade: 'mensagens_whatsapp', identificador_deterministico: 'idempotency_key tenant:campaign:client:template', chave: 'unique idempotency_key', segunda_execucao: 'atualiza/reutiliza a mensagem' }
  ];
}

function cleanupPlan() {
  return [
    'mensagens_whatsapp por payload.seed',
    'campanha_envios por metadata.seed',
    'cupom_usos por metadata.seed',
    'campanhas por metadata.seed',
    'cupom_servicos por cupom_id dos cupons marcados',
    'cupons por metadata.seed',
    'cliente_historico_atendimentos por metadata.seed',
    'agendamento_servicos por agendamento_id dos agendamentos marcados',
    'agendamentos por metadata.seed',
    'cliente_tenants por metadata.seed',
    'clientes por metadata.seed e email deterministico'
  ];
}

function tenantRisks(ctx) {
  const risks = [];
  if (!ctx.eligibleUsers.length) risks.push('nenhum_usuario_elegivel');
  if (!ctx.professionals.length) risks.push('nenhum_profissional_ativo');
  if (!ctx.services.length) risks.push('nenhum_servico_ativo');
  if (!ctx.links.length) risks.push('nenhum_vinculo_profissional_servico_ativo');
  if (!ctx.templates.length) risks.push('nenhum_template_marketing_ativo_para_mensagens');
  return risks;
}

function emptyPlan() {
  return {
    records_by_table: [],
    planned_clients: [],
    scenario_distribution: [],
    appointment_history_plan: null,
    service_professional_usage: [],
    coupons: [],
    campaigns: []
  };
}

function plannedCounts(ctx) {
  const clients = ctx.eligibleUsers.reduce((total, user) => total + plannedClientCount(user), 0);
  const appointments = ctx.eligibleUsers.reduce((total, user) => {
    const matrix = roleName(user) === 'Administrador' ? ADMIN_SCENARIOS : NON_ADMIN_SCENARIOS;
    return total + matrix.slice(0, plannedClientCount(user)).reduce((sum, scenario) => sum + appointmentsForScenario(scenario), 0);
  }, 0);
  const history = ctx.eligibleUsers.reduce((total, user) => {
    const matrix = roleName(user) === 'Administrador' ? ADMIN_SCENARIOS : NON_ADMIN_SCENARIOS;
    return total + matrix.slice(0, plannedClientCount(user)).reduce((sum, scenario) => sum + historyForScenario(scenario), 0);
  }, 0);
  return {
    clientes: clients,
    cliente_tenants: clients,
    agendamentos: appointments,
    cliente_historico_atendimentos: history,
    campanhas: ctx.tenant ? CAMPAIGN_DEFINITIONS.length : 0,
    cupons: ctx.tenant ? 3 : 0,
    cupom_usos: ctx.tenant ? 3 : 0,
    campanha_envios: ctx.templates.length && clients ? MESSAGE_STATUSES.length : 0,
    mensagens_whatsapp: ctx.templates.length && clients ? MESSAGE_STATUSES.length : 0
  };
}

function appointmentsForScenario(scenario) {
  return { recurring: 3, inactive_45: 1, inactive_120: 1, future_appointment: 1, cancelled: 1, no_show: 1, birthday: 1 }[scenario] || 0;
}

function historyForScenario(scenario) {
  return { recurring: 3, inactive_45: 1, inactive_120: 1, no_show: 1, birthday: 1 }[scenario] || 0;
}

async function seed() {
  const contexts = await Promise.all(TARGET_TENANTS.map(buildTenantContext));
  const result = [];
  for (const ctx of contexts) {
    if (!ctx.tenant) throw new Error(`Tenant de teste nao encontrado: ${ctx.target.label}`);
    if (!ctx.eligibleUsers.length) throw new Error(`Nenhum usuario elegivel em ${ctx.tenant.slug}`);
    if (!ctx.professionals.length || !ctx.services.length) throw new Error(`Profissionais/servicos insuficientes em ${ctx.tenant.slug}`);
    const createdClients = [];
    let globalIndex = 0;
    for (const user of ctx.eligibleUsers) {
      for (let index = 0; index < plannedClientCount(user); index += 1) {
        const scenario = scenarioFor(user, index);
        const assignment = pickAssignment(ctx, user, globalIndex);
        const client = await upsertClient(ctx, user, globalIndex, scenario, assignment.professional?.id || null);
        await seedAppointments(ctx, client, assignment, globalIndex);
        createdClients.push(client);
        globalIndex += 1;
      }
    }
    const coupons = await upsertCoupons(ctx, createdClients);
    const campaigns = await upsertCampaigns(ctx, ctx.templates[0] || null, coupons);
    if (campaigns[0] && ctx.templates[0]) await upsertMessages(ctx, campaigns[0], ctx.templates[0], createdClients);
    result.push({ tenant: ctx.tenant.slug, ...plannedCounts(ctx) });
  }
  return { seed: SEED, tenants: result };
}

async function validate() {
  const contexts = await Promise.all(TARGET_TENANTS.map(buildTenantContext));
  const result = [];
  for (const ctx of contexts) {
    if (!ctx.tenant) {
      result.push({ target: ctx.target.label, found: false, ok: false });
      continue;
    }
    const counts = await actualCounts(ctx.tenant.id, ctx.tenant.slug);
    const planned = plannedCounts(ctx);
    const checks = Object.fromEntries(Object.entries(planned).map(([key, value]) => [key, counts[key] >= value]));
    result.push({ tenant: ctx.tenant.slug, planned, actual: counts, checks, ok: Object.values(checks).every(Boolean) });
  }
  return { seed: SEED, tenants: result };
}

async function actualCounts(tenantId, tenantSlug) {
  return {
    clientes: await countClientsMarked(tenantSlug),
    cliente_tenants: await countMarked('cliente_tenants', tenantId),
    agendamentos: await countMarked('agendamentos', tenantId),
    cliente_historico_atendimentos: await countMarked('cliente_historico_atendimentos', tenantId),
    campanhas: await countMarked('campanhas', tenantId),
    cupons: await countMarked('cupons', tenantId),
    cupom_usos: await countMarked('cupom_usos', tenantId),
    campanha_envios: await countMarked('campanha_envios', tenantId),
    mensagens_whatsapp: await countMarked('mensagens_whatsapp', tenantId, 'payload')
  };
}

async function existingSeedCounts(tenantId, tenantSlug) {
  const counts = await actualCounts(tenantId, tenantSlug);
  return {
    ...counts,
    agendamento_servicos: await countAppointmentServicesMarked(tenantId),
    cupom_servicos: await countCouponServicesMarked(tenantId)
  };
}

async function countClientsMarked(tenantSlug) {
  const { count, error } = await supabaseAdmin
    .from('clientes')
    .select('id', { count: 'exact', head: true })
    .eq('metadata->>seed', SEED)
    .ilike('email', `${SEED}.${tenantSlug}.%`);
  if (error) throw error;
  return count || 0;
}

async function countAppointmentServicesMarked(tenantId) {
  const { data: appointments, error } = await supabaseAdmin
    .from('agendamentos')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('metadata->>seed', SEED);
  if (error) throw error;
  if (!appointments?.length) return 0;
  const { count, error: countError } = await supabaseAdmin
    .from('agendamento_servicos')
    .select('id', { count: 'exact', head: true })
    .in('agendamento_id', appointments.map((item) => item.id));
  if (countError) throw countError;
  return count || 0;
}

async function countCouponServicesMarked(tenantId) {
  const { data: coupons, error } = await supabaseAdmin
    .from('cupons')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('metadata->>seed', SEED);
  if (error) throw error;
  if (!coupons?.length) return 0;
  const { count, error: countError } = await supabaseAdmin
    .from('cupom_servicos')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .in('cupom_id', coupons.map((item) => item.id));
  if (countError) throw countError;
  return count || 0;
}

async function countMarked(table, tenantId, column = 'metadata', tenantScoped = true) {
  let query = supabaseAdmin.from(table).select('id', { count: 'exact', head: true }).eq(`${column}->>seed`, SEED);
  if (tenantScoped) query = query.eq('tenant_id', tenantId);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function cleanup() {
  if (!process.argv.includes('--confirm-campaign-test-cleanup')) {
    throw new Error('Confirme a limpeza com --confirm-campaign-test-cleanup.');
  }
  const contexts = await Promise.all(TARGET_TENANTS.map(buildTenantContext));
  const result = [];
  for (const ctx of contexts.filter((item) => item.tenant)) {
    const tenantId = ctx.tenant.id;
    const deleted = {};
    deleted.mensagens_whatsapp = await deleteMarked('mensagens_whatsapp', tenantId, 'payload');
    deleted.campanha_envios = await deleteMarked('campanha_envios', tenantId);
    deleted.cupom_usos = await deleteMarked('cupom_usos', tenantId);
    deleted.campanhas = await deleteMarked('campanhas', tenantId);
    deleted.cupom_servicos = await deleteCouponServices(tenantId);
    deleted.cupons = await deleteMarked('cupons', tenantId);
    deleted.cliente_historico_atendimentos = await deleteMarked('cliente_historico_atendimentos', tenantId);
    deleted.agendamento_servicos = await deleteAppointmentServices(tenantId);
    deleted.agendamentos = await deleteMarked('agendamentos', tenantId);
    deleted.cliente_tenants = await deleteMarked('cliente_tenants', tenantId);
    deleted.clientes = await deleteClients(ctx.tenant.slug);
    result.push({ tenant: ctx.tenant.slug, deleted });
  }
  return { seed: SEED, tenants: result };
}

async function deleteMarked(table, tenantId, column = 'metadata') {
  const { data, error } = await supabaseAdmin.from(table).delete().eq('tenant_id', tenantId).eq(`${column}->>seed`, SEED).select('id');
  if (error) throw error;
  return (data || []).length;
}

async function deleteAppointmentServices(tenantId) {
  const { data: appointments, error } = await supabaseAdmin.from('agendamentos').select('id').eq('tenant_id', tenantId).eq('metadata->>seed', SEED);
  if (error) throw error;
  if (!appointments?.length) return 0;
  const { data, error: deleteError } = await supabaseAdmin.from('agendamento_servicos').delete().in('agendamento_id', appointments.map((item) => item.id)).select('id');
  if (deleteError) throw deleteError;
  return (data || []).length;
}

async function deleteCouponServices(tenantId) {
  const { data: coupons, error } = await supabaseAdmin.from('cupons').select('id').eq('tenant_id', tenantId).eq('metadata->>seed', SEED);
  if (error) throw error;
  if (!coupons?.length) return 0;
  const { data, error: deleteError } = await supabaseAdmin.from('cupom_servicos').delete().eq('tenant_id', tenantId).in('cupom_id', coupons.map((item) => item.id)).select('id');
  if (deleteError) throw deleteError;
  return (data || []).length;
}

async function deleteClients(tenantSlug) {
  const { data, error } = await supabaseAdmin.from('clientes').delete().eq('metadata->>seed', SEED).ilike('email', `${SEED}.${tenantSlug}.%`).select('id');
  if (error) throw error;
  return (data || []).length;
}

async function main() {
  assertEnvironment();
  const command = process.argv[2] || 'audit';
  const handlers = { audit, seed, validate, cleanup };
  if (!handlers[command]) throw new Error(`Comando invalido: ${command}`);
  console.log(JSON.stringify(await handlers[command](), null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
