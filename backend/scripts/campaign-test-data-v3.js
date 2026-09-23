#!/usr/bin/env node

const { supabaseAdmin } = require('../src/config/supabase');
const campaignsService = require('../src/modules/campaigns/campaigns.service');

const SEED = 'campaign_test_v3';
const LEGACY_SEEDS = ['campaign_test_seed_2026'];
const CONTROLLED_SEEDS = [SEED, ...LEGACY_SEEDS];
const TARGET_TENANTS = [
  { label: 'Espaco Vivian Beauty', slugs: ['espaco-vivian-beauty'], names: ['Espaco Vivian Beauty', 'Espaço Vivian Beauty'] },
  { label: 'Bellory Test Studio', slugs: ['bellory-test-studio'], names: ['Bellory Test Studio'] }
];
const ALLOWED_ENVS = new Set(['development', 'dev', 'test', 'local']);
const BLOCKED_ENVS = new Set(['production', 'prod', 'prd', 'homologation', 'hml']);
const ELIGIBLE_ROLES = new Set(['Funcionario', 'Terceiro', 'Autonomo', 'Administrador']);
const EXCLUDED_ROLES = new Set(['Profissional Adm']);
const CLIENTS_BY_ROLE = { Administrador: 5, Funcionario: 15, Terceiro: 15, Autonomo: 15 };
const SCENARIOS = [
  'new',
  'recurring_high',
  'recurring_medium',
  'inactive_manicure_overdue',
  'inactive_haircut_inside',
  'inactive_fallback_overdue',
  'occasional_makeup_old',
  'future_blocks_recovery',
  'cancelled_only',
  'no_show_only',
  'birthday_current',
  'birthday_other_month',
  'invalid_phone',
  'no_consent',
  'opt_out'
];
const ADMIN_SCENARIOS = ['new', 'recurring_medium', 'inactive_manicure_overdue', 'future_blocks_recovery', 'birthday_current'];
const SERVICE_SCENARIOS = {
  new: 'MANICURE',
  recurring_high: 'MANICURE',
  recurring_medium: 'HAIR_CUT',
  inactive_manicure_overdue: 'MANICURE',
  inactive_haircut_inside: 'HAIR_CUT',
  inactive_fallback_overdue: 'BROW_DESIGN',
  occasional_makeup_old: 'MAKEUP',
  future_blocks_recovery: 'MANICURE',
  cancelled_only: 'HAIR_CUT',
  no_show_only: 'HAIR_CUT',
  birthday_current: 'MANICURE',
  birthday_other_month: 'HAIR_CUT',
  invalid_phone: 'MANICURE',
  no_consent: 'MANICURE',
  opt_out: 'BROW_DESIGN'
};
const SERVICE_DEFAULTS = {
  MANICURE: { price: 50, duration: 45, returnDays: 25, specialtyHints: ['Manicure', 'Fibra', 'Banho em Gel'] },
  HAIR_CUT: { price: 80, duration: 45, returnDays: 70, specialtyHints: ['Corte Feminino', 'Corte Masculino', 'Corte Degrade'] },
  BROW_DESIGN: { price: 70, duration: 45, returnDays: null, specialtyHints: ['Design de Sobrancelhas', 'Henna'] },
  MAKEUP: { price: 80, duration: 60, returnDays: null, specialtyHints: ['Maquiagem Social', 'Maquiagem'] }
};
const COUPON_DEFS = [
  { code: 'V3GERAL10', escopo: 'geral', type: 'percentual', percent: 10, value: null, active: true, expiresIn: 30 },
  { code: 'V3SERV20', escopo: 'servico', canonical: 'MANICURE', type: 'valor', percent: null, value: 20, active: true, expiresIn: 30 },
  { code: 'V3ESP15', escopo: 'especialidade', canonical: 'HAIR_CUT', type: 'percentual', percent: 15, value: null, active: true, expiresIn: 30 },
  { code: 'V3COMBO30', escopo: 'combinacao', canonical: 'MANICURE', type: 'preco_promocional', percent: null, value: 30, active: true, expiresIn: 30 },
  { code: 'V3EXP20', escopo: 'geral', type: 'valor', percent: null, value: 20, active: true, expiresIn: -1 },
  { code: 'V3OFF10', escopo: 'geral', type: 'percentual', percent: 10, value: null, active: false, expiresIn: 30 }
];
const CAMPAIGN_DEFS = [
  { key: 'inactive', nome: 'Recuperacao de inativos MER v3', tipo: 'recuperacao_inativos', criteria: { mode: 'segment', inactive_by_service_return: true, fallback_inactive_days: 45, no_future_appointment: true } },
  { key: 'birthday', nome: 'Aniversariantes do mes MER v3', tipo: 'aniversario', criteria: { mode: 'segment', birthday_month: true } },
  { key: 'general', nome: 'Campanha geral MER v3', tipo: 'campanha_geral', criteria: { mode: 'all' } },
  { key: 'promotion', nome: 'Promocao manicure MER v3', tipo: 'promocao_servico', criteria: { mode: 'all' }, canonical: 'MANICURE' },
  { key: 'recurring', nome: 'Clientes recorrentes MER v3', tipo: 'relacionamento', criteria: { mode: 'segment', recurring: true, min_completed: 2 } }
];
const MESSAGE_STATUSES = [{ message: 'pendente', send: 'pendente' }, { message: 'agendado', send: 'agendado' }, { message: 'erro', send: 'erro' }];
const ACTIVE_FUTURE_APPOINTMENT_STATUSES = new Set(['solicitado', 'pendente', 'pendente_atendente', 'pendente_cliente', 'confirmado']);
const FUTURE_BLOCKS_RECONCILE_DAYS = 30;
const FIRST_NAMES = ['Amanda', 'Bianca', 'Camila', 'Daniela', 'Elaine', 'Fernanda', 'Gabriela', 'Helena', 'Isabela', 'Juliana', 'Karina', 'Larissa', 'Mariana', 'Natalia', 'Patricia', 'Renata', 'Sabrina', 'Tatiana', 'Vanessa', 'Yasmin'];
const LAST_NAMES = ['Almeida', 'Barbosa', 'Cardoso', 'Duarte', 'Ferreira', 'Gomes', 'Lima', 'Martins', 'Oliveira', 'Pereira', 'Ribeiro', 'Santos'];

function assertEnvironment() {
  const appEnv = String(process.env.APP_ENVIRONMENT || process.env.NODE_ENV || 'development').toLowerCase();
  if (BLOCKED_ENVS.has(appEnv) || !ALLOWED_ENVS.has(appEnv)) throw new Error(`Ambiente bloqueado para massa de campanhas: ${appEnv}. Use development/test/local.`);
  process.env.WHATSAPP_DRY_RUN = 'true';
}

function metadata(extra = {}) {
  return { ...extra, seed: SEED, seed_source: SEED, campaign_test_seed: true };
}

function applySeedFilter(query, column = 'metadata') {
  return query.in(`${column}->>seed`, CONTROLLED_SEEDS);
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

function scenarioFromAudienceRow(row = {}) {
  return row.raw?.metadata?.scenario
    || row.raw?.cliente?.metadata?.scenario
    || row.raw?.cliente?.metadata?.cenario
    || row.raw?.metadata?.cenario
    || row.metadata?.scenario
    || row.cliente?.metadata?.scenario
    || null;
}

function isActiveFutureAppointment(appointment = {}, now = new Date()) {
  const date = new Date(appointment.data_inicio);
  return ACTIVE_FUTURE_APPOINTMENT_STATUSES.has(appointment.status)
    && !appointment.deleted_at
    && !Number.isNaN(date.getTime())
    && date > now;
}

function isExpiredActiveAppointment(appointment = {}, now = new Date()) {
  const date = new Date(appointment.data_inicio);
  return ACTIVE_FUTURE_APPOINTMENT_STATUSES.has(appointment.status)
    && !appointment.deleted_at
    && !Number.isNaN(date.getTime())
    && date <= now;
}

function isExpiredFutureBlocksAppointment(appointment = {}, now = new Date()) {
  const date = new Date(appointment.data_inicio);
  const seedKey = String(appointment.metadata?.seed_key || '');
  return seedKey.endsWith(':appt:future-confirmed')
    && !appointment.deleted_at
    && !Number.isNaN(date.getTime())
    && date <= now;
}

function futureBlocksRecoveryDiagnostic(rows = [], reasons = {}, now = new Date()) {
  const futureRows = rows.filter((row) => scenarioFromAudienceRow(row) === 'future_blocks_recovery');
  const activeFutureRows = futureRows.filter((row) => (row.raw?.agendamentos || []).some((appointment) => isActiveFutureAppointment(appointment, now)));
  const expiredRows = futureRows.filter((row) => (row.raw?.agendamentos || []).some((appointment) => isExpiredFutureBlocksAppointment(appointment, now)));
  const rowsWithoutActiveFuture = futureRows.filter((row) => !(row.raw?.agendamentos || []).some((appointment) => isActiveFutureAppointment(appointment, now)));
  const stale = futureRows.length > 0
    && activeFutureRows.length === 0
    && Number(reasons.possui_agendamento_futuro || 0) === 0
    && rowsWithoutActiveFuture.length > 0;
  return {
    scenario: 'future_blocks_recovery',
    total: futureRows.length,
    active_future: activeFutureRows.length,
    expired_active_future: expiredRows.length,
    without_active_future: rowsWithoutActiveFuture.length,
    stale,
    message: stale
      ? 'A massa de teste do cenario future_blocks_recovery nao possui agendamento futuro ativo. Execute a reconciliacao controlada da massa antes da validacao; se o appointment ja estiver em status nao bloqueante, uma decisao explicita de status e necessaria.'
      : null
  };
}

function inactiveRecoveryValidationSummary(result, now = new Date()) {
  const reasons = result.excluded_by_reason || {};
  const diagnostic = futureBlocksRecoveryDiagnostic(result.rows || [], reasons, now);
  return {
    found: result.found,
    eligible: result.eligible,
    excluded_by_reason: reasons,
    future_blocks_recovery: diagnostic,
    sample: (result.rows || []).slice(0, 8).map((row) => ({ nome: row.nome, eligible: row.eligible, exclusions: row.exclusions, inactive_recovery: row.stats?.inactive_recovery || null })),
    ok: result.found > 0
      && result.eligible > 0
      && Number(reasons.dentro_prazo_retorno || 0) > 0
      && Number(reasons.possui_agendamento_futuro || 0) > 0
      && Number(reasons.servico_ocasional_sem_recuperacao || 0) > 0
  };
}

function plannedFutureDate(now, index, previousDate) {
  const previous = new Date(previousDate);
  const base = new Date(now);
  const planned = new Date(base.getTime());
  planned.setUTCDate(planned.getUTCDate() + FUTURE_BLOCKS_RECONCILE_DAYS + index);
  planned.setUTCHours(
    Number.isNaN(previous.getTime()) ? 13 : previous.getUTCHours(),
    Number.isNaN(previous.getTime()) ? 0 : previous.getUTCMinutes(),
    0,
    0
  );
  return planned;
}

function normalizeText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
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
  return roleName(user) === 'Administrador' ? ADMIN_SCENARIOS[index % ADMIN_SCENARIOS.length] : SCENARIOS[index % SCENARIOS.length];
}

function scenarioServiceCode(scenario) {
  return SERVICE_SCENARIOS[scenario] || 'MANICURE';
}

function naturalClientName(index) {
  return `${FIRST_NAMES[index % FIRST_NAMES.length]} ${LAST_NAMES[index % LAST_NAMES.length]}`;
}

async function findTenant(target) {
  const bySlug = await supabaseAdmin.from('tenants').select('id,nome_fantasia,slug,status,tipo_negocio,ativo').in('slug', target.slugs).is('deleted_at', null).limit(1);
  if (bySlug.error) throw bySlug.error;
  if (bySlug.data?.[0]) return bySlug.data[0];
  const byName = await supabaseAdmin.from('tenants').select('id,nome_fantasia,slug,status,tipo_negocio,ativo').is('deleted_at', null).limit(200);
  if (byName.error) throw byName.error;
  const names = target.names.map(normalizeText);
  return (byName.data || []).find((tenant) => names.includes(normalizeText(tenant.nome_fantasia))) || null;
}

async function listUsers(tenantId) {
  const { data, error } = await supabaseAdmin.from('tenant_memberships').select('id,role,status,profissional_id,usuario:usuarios(id,nome,email,tipo_usuario,ativo)').eq('tenant_id', tenantId).eq('status', 'ativo');
  if (error) throw error;
  return (data || []).filter((item) => item.usuario).map((item) => ({ ...item.usuario, membership_id: item.id, membership_status: item.status, role: item.role, profissional_id: item.profissional_id }));
}

async function listProfessionals(tenantId) {
  const { data, error } = await supabaseAdmin.from('profissionais').select('id,usuario_id,nome_publico,cargo,ativo,profissional_especialidades(especialidade_id,ativo,deleted_at)').eq('tenant_id', tenantId).eq('ativo', true).is('deleted_at', null);
  if (error) throw error;
  return (data || []).map((item) => ({
    ...item,
    especialidade_ids: (item.profissional_especialidades || []).filter((link) => link.ativo !== false && !link.deleted_at).map((link) => link.especialidade_id)
  }));
}

async function listTemplates(tenantId) {
  const { data, error } = await supabaseAdmin.from('templates_mensagem').select('id,nome,tipo,conteudo,variaveis,metadata').eq('canal', 'whatsapp').eq('ativo', true).or(`tenant_id.is.null,tenant_id.eq.${tenantId}`).is('deleted_at', null);
  if (error) throw error;
  return (data || []).filter((item) => item.tipo === 'marketing' || item.metadata?.categoria === 'campanha');
}

async function listCatalog() {
  const { data, error } = await supabaseAdmin.from('servicos_catalogo').select('id,codigo_canonico,nome,categoria_key,natureza,ativo').eq('ativo', true);
  if (error) throw error;
  return data || [];
}

async function listCompatibility() {
  const { data, error } = await supabaseAdmin.from('servico_catalogo_especialidades').select('id,servico_catalogo_id,especialidade_id,ativo,especialidade:especialidades(id,nome,taxonomy_category_key,ativo,deleted_at)').eq('ativo', true);
  if (error) throw error;
  return (data || []).filter((item) => item.especialidade?.ativo !== false && !item.especialidade?.deleted_at);
}

async function listTenantServices(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('servico_tenants')
    .select('id,tenant_id,servico_catalogo_id,ativo,metadata,servico_catalogo:servicos_catalogo(id,codigo_canonico,nome,categoria_key,natureza,ativo),especialidades_config:servico_tenant_especialidades(id,servico_tenant_id,especialidade_id,preco,duracao_minutos,dias_retorno_recomendado,aceita_agendamento_online,ativo,metadata,especialidade:especialidades(id,nome,taxonomy_category_key,ativo,deleted_at))')
    .eq('tenant_id', tenantId)
    .eq('ativo', true);
  if (error) throw error;
  return data || [];
}

async function buildTenantContext(target) {
  const tenant = await findTenant(target);
  if (!tenant) return { target, tenant: null, users: [], eligibleUsers: [], excludedUsers: [], professionals: [], templates: [], catalog: [], compatibility: [], services: [] };
  const [users, professionals, templates, catalog, compatibility, services] = await Promise.all([listUsers(tenant.id), listProfessionals(tenant.id), listTemplates(tenant.id), listCatalog(), listCompatibility(), listTenantServices(tenant.id)]);
  return { target, tenant, users, eligibleUsers: users.filter(isEligibleRole), excludedUsers: users.filter((user) => isExcludedRole(user) || !isEligibleRole(user)), professionals, templates, catalog, compatibility, services };
}

function catalogByCode(ctx, code) {
  const catalog = ctx.catalog.find((item) => item.codigo_canonico === code);
  if (!catalog) throw new Error(`Servico canonico nao encontrado: ${code}`);
  return catalog;
}

function compatibleSpecialties(ctx, catalogId, code) {
  const hints = (SERVICE_DEFAULTS[code]?.specialtyHints || []).map(normalizeText);
  const items = ctx.compatibility.filter((item) => item.servico_catalogo_id === catalogId);
  const preferred = items.filter((item) => hints.includes(normalizeText(item.especialidade?.nome)));
  return preferred.length ? preferred : items;
}

async function ensureTenantService(ctx, code) {
  const catalog = catalogByCode(ctx, code);
  let offer = ctx.services.find((item) => item.servico_catalogo_id === catalog.id);
  if (!offer) {
    const { data, error } = await supabaseAdmin.from('servico_tenants').upsert({
      tenant_id: ctx.tenant.id,
      servico_catalogo_id: catalog.id,
      ativo: true,
      metadata: metadata({ seed_key: `${ctx.tenant.slug}:service:${code}`, created_for_campaign_test: true }),
      updated_at: new Date().toISOString()
    }, { onConflict: 'tenant_id,servico_catalogo_id' }).select('id,tenant_id,servico_catalogo_id,ativo,metadata,servico_catalogo:servicos_catalogo(id,codigo_canonico,nome,categoria_key,natureza,ativo)').single();
    if (error) throw error;
    offer = { ...data, especialidades_config: [] };
    ctx.services.push(offer);
  }
  const config = await ensureTenantServiceConfig(ctx, offer, code);
  offer.especialidades_config = [config, ...(offer.especialidades_config || []).filter((item) => item.id !== config.id)];
  return { offer, config, catalog };
}

async function ensureTenantServiceConfig(ctx, offer, code) {
  const existing = (offer.especialidades_config || []).find((item) => item.ativo !== false && item.preco !== null && item.duracao_minutos !== null);
  if (existing) return existing;
  const catalog = catalogByCode(ctx, code);
  const compat = compatibleSpecialties(ctx, catalog.id, code)[0];
  if (!compat) throw new Error(`Nenhuma especialidade compativel para ${code}.`);
  const defaults = SERVICE_DEFAULTS[code] || SERVICE_DEFAULTS.MANICURE;
  const { data, error } = await supabaseAdmin.from('servico_tenant_especialidades').upsert({
    servico_tenant_id: offer.id,
    especialidade_id: compat.especialidade_id,
    preco: defaults.price,
    duracao_minutos: defaults.duration,
    dias_retorno_recomendado: defaults.returnDays,
    aceita_agendamento_online: true,
    ativo: true,
    metadata: metadata({ seed_key: `${ctx.tenant.slug}:config:${code}:${compat.especialidade_id}`, created_for_campaign_test: true }),
    updated_at: new Date().toISOString()
  }, { onConflict: 'servico_tenant_id,especialidade_id' }).select('id,servico_tenant_id,especialidade_id,preco,duracao_minutos,dias_retorno_recomendado,aceita_agendamento_online,ativo,metadata,especialidade:especialidades(id,nome,taxonomy_category_key,ativo,deleted_at)').single();
  if (error) throw error;
  return data;
}

async function ensureRequiredMer(ctx) {
  const codes = Array.from(new Set([...Object.values(SERVICE_SCENARIOS), ...COUPON_DEFS.map((item) => item.canonical).filter(Boolean)]));
  const resolved = {};
  for (const code of codes) resolved[code] = await ensureTenantService(ctx, code);
  return resolved;
}

function pickProfessional(ctx, config, index) {
  const compatible = ctx.professionals.filter((professional) => professional.especialidade_ids.includes(config.especialidade_id));
  return compatible[index % Math.max(compatible.length, 1)] || ctx.professionals[index % Math.max(ctx.professionals.length, 1)] || null;
}

async function findByMetadata(table, tenantId, seedKey, column = 'metadata') {
  const { data, error } = await supabaseAdmin.from(table).select('*').eq('tenant_id', tenantId).eq(`${column}->>seed_key`, seedKey).maybeSingle();
  if (error) throw error;
  return data;
}

async function upsertByMetadata(table, tenantId, seedKey, payload, column = 'metadata') {
  const existing = await findByMetadata(table, tenantId, seedKey, column);
  if (existing) {
    const { data, error } = await supabaseAdmin.from(table).update(payload).eq('id', existing.id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabaseAdmin.from(table).insert(payload).select().single();
  if (error) throw error;
  return data;
}

function clientSeedKey(ctx, user, index) {
  return `${ctx.tenant.slug}:${user.id}:${index}`;
}

function clientPayload(ctx, user, index, scenario) {
  const seedKey = clientSeedKey(ctx, user, index);
  const invalidPhone = scenario === 'invalid_phone' || scenario === 'opt_out';
  return {
    seedKey,
    nome: naturalClientName(index),
    telefone: require('./campaign-test-phone').campaignTestPhone(index, invalidPhone),
    email: `${SEED}.${ctx.tenant.slug}.${user.id}.${index}@example.com`,
    data_nascimento: scenario === 'birthday_current' ? dateOnly(addDays(3)).replace(/^\d{4}/, '1990') : scenario === 'birthday_other_month' ? '1990-01-15' : '1990-07-15',
    metadata: metadata({ seed_key: seedKey, scenario, owner_user_id: user.id, owner_role: roleName(user), trace_label: `${ctx.tenant.slug}:${roleName(user)}:${index}` }),
    ativo: true,
    updated_at: new Date().toISOString()
  };
}

async function upsertClient(ctx, user, index, scenario, professionalId) {
  const base = clientPayload(ctx, user, index, scenario);
  const existing = await supabaseAdmin.from('clientes').select('*').eq('email', base.email).maybeSingle();
  if (existing.error) throw existing.error;
  const collision = await supabaseAdmin.from('clientes')
    .select('id, vinculos:cliente_tenants!inner(tenant_id)')
    .eq('telefone', base.telefone).eq('vinculos.tenant_id', ctx.tenant.id).is('deleted_at', null);
  if (collision.error) throw collision.error;
  if ((collision.data || []).some(row => row.id !== existing.data?.id)) {
    throw new Error('Seed phone collision inside tenant; review controlled data before retrying.');
  }
  const clientResult = existing.data
    ? await supabaseAdmin.from('clientes').update({ nome: base.nome, telefone: base.telefone, email: base.email, data_nascimento: base.data_nascimento, metadata: base.metadata, ativo: true, updated_at: new Date().toISOString() }).eq('id', existing.data.id).select().single()
    : await supabaseAdmin.from('clientes').insert({ nome: base.nome, telefone: base.telefone, email: base.email, data_nascimento: base.data_nascimento, metadata: base.metadata, ativo: true }).select().single();
  if (clientResult.error) throw clientResult.error;
  const client = clientResult.data;
  const allowMarketing = !['no_consent', 'opt_out'].includes(scenario);
  const link = await supabaseAdmin.from('cliente_tenants').upsert({
    tenant_id: ctx.tenant.id,
    cliente_id: client.id,
    nome_no_tenant: client.nome,
    origem: SEED,
    status: 'ativo',
    aceita_campanhas: allowMarketing,
    metadata: metadata({ seed_key: base.seedKey, scenario, owner_user_id: user.id, owner_role: roleName(user), responsible_profissional_id: professionalId, permite_marketing: allowMarketing, opt_out_marketing: scenario === 'opt_out' }),
    ativo: true,
    updated_at: new Date().toISOString()
  }, { onConflict: 'tenant_id,cliente_id' }).select().single();
  if (link.error) throw link.error;
  return { client, link: link.data, seedKey: base.seedKey, scenario, user, professionalId };
}

async function upsertAppointment(ctx, clientInfo, assignment, suffix, status, days, hour = 13) {
  const { offer, config, catalog, professional } = assignment;
  if (!professional) return null;
  const start = addDays(days, hour);
  const duration = Number(config.duracao_minutos || 45);
  const value = Number(config.preco || 0);
  const end = new Date(start.getTime() + duration * 60000);
  const seedKey = `${clientInfo.seedKey}:appt:${suffix}`;
  const appointment = await upsertByMetadata('agendamentos', ctx.tenant.id, seedKey, {
    tenant_id: ctx.tenant.id,
    cliente_id: clientInfo.client.id,
    profissional_id: professional.id,
    data_inicio: start.toISOString(),
    data_fim: end.toISOString(),
    status,
    origem: 'manual',
    observacoes: `Massa controlada ${SEED}`,
    valor_total: value,
    desconto_total: 0,
    confirmado_em: ['confirmado', 'concluido', 'no_show'].includes(status) ? start.toISOString() : null,
    concluido_em: status === 'concluido' ? end.toISOString() : null,
    cancelado_em: status === 'cancelado' ? start.toISOString() : null,
    metadata: metadata({ seed_key: seedKey, scenario: clientInfo.scenario, owner_user_id: clientInfo.user.id, servico_catalogo_id: catalog.id, servico_tenant_id: offer.id, servico_tenant_especialidade_id: config.id, especialidade_id: config.especialidade_id }),
    ativo: true,
    updated_at: new Date().toISOString()
  });
  await replaceAppointmentService(ctx, appointment, assignment, value, duration);
  if (status === 'concluido' || status === 'no_show') await upsertHistory(ctx, clientInfo, appointment, assignment, status);
  return appointment;
}

async function replaceAppointmentService(ctx, appointment, assignment, value, duration) {
  const { offer, config, catalog } = assignment;
  const existing = await supabaseAdmin.from('agendamento_servicos').select('id').eq('agendamento_id', appointment.id);
  if (existing.error) throw existing.error;
  if (existing.data?.length) {
    const deleted = await supabaseAdmin.from('agendamento_servicos').delete().in('id', existing.data.map((item) => item.id));
    if (deleted.error) throw deleted.error;
  }
  const { error } = await supabaseAdmin.from('agendamento_servicos').insert({
    tenant_id: ctx.tenant.id,
    agendamento_id: appointment.id,
    servico_id: null,
    servico_catalogo_id: catalog.id,
    servico_tenant_id: offer.id,
    servico_tenant_especialidade_id: config.id,
    especialidade_id: config.especialidade_id,
    nome_servico: catalog.nome,
    nome_especialidade: config.especialidade?.nome || null,
    duracao_minutos: duration,
    valor_servico: value,
    ativo: true,
    updated_at: new Date().toISOString()
  });
  if (error) throw error;
}

async function upsertHistory(ctx, clientInfo, appointment, assignment, status) {
  const { offer, config, catalog, professional } = assignment;
  const existing = await supabaseAdmin.from('cliente_historico_atendimentos').select('*').eq('tenant_id', ctx.tenant.id).eq('agendamento_id', appointment.id).maybeSingle();
  if (existing.error) throw existing.error;
  const payload = {
    tenant_id: ctx.tenant.id,
    cliente_id: clientInfo.client.id,
    agendamento_id: appointment.id,
    profissional_id: professional.id,
    servico_id: null,
    servico_catalogo_id: catalog.id,
    servico_tenant_id: offer.id,
    servico_tenant_especialidade_id: config.id,
    especialidade_id: config.especialidade_id,
    nome_especialidade: config.especialidade?.nome || null,
    status,
    data_atendimento: appointment.data_inicio,
    valor_servico: appointment.valor_total,
    duracao_minutos: Number(config.duracao_minutos || 45),
    origem: 'agenda',
    metadata: metadata({ seed_key: `${clientInfo.seedKey}:history:${appointment.id}`, scenario: clientInfo.scenario, servico_catalogo_id: catalog.id, servico_tenant_id: offer.id, servico_tenant_especialidade_id: config.id, especialidade_id: config.especialidade_id, nome_servico: catalog.nome, nome_especialidade: config.especialidade?.nome || null }),
    ativo: true,
    updated_at: new Date().toISOString()
  };
  const result = existing.data ? await supabaseAdmin.from('cliente_historico_atendimentos').update(payload).eq('id', existing.data.id) : await supabaseAdmin.from('cliente_historico_atendimentos').insert(payload);
  if (result.error) throw result.error;
}

async function seedAppointments(ctx, mer, clientInfo, index) {
  const code = scenarioServiceCode(clientInfo.scenario);
  const base = mer[code];
  const assignment = { ...base, professional: pickProfessional(ctx, base.config, index) };
  const hour = 9 + (index % 8);
  if (clientInfo.scenario === 'recurring_high') {
    await upsertAppointment(ctx, clientInfo, assignment, 'recurring-1', 'concluido', -7, hour);
    await upsertAppointment(ctx, clientInfo, assignment, 'recurring-2', 'concluido', -28, hour);
    await upsertAppointment(ctx, clientInfo, assignment, 'recurring-3', 'concluido', -60, hour);
  } else if (clientInfo.scenario === 'recurring_medium') {
    await upsertAppointment(ctx, clientInfo, assignment, 'recurring-1', 'concluido', -35, hour);
    await upsertAppointment(ctx, clientInfo, assignment, 'recurring-2', 'concluido', -90, hour);
  } else if (clientInfo.scenario === 'inactive_manicure_overdue') await upsertAppointment(ctx, clientInfo, assignment, 'inactive-manicure-overdue', 'concluido', -40, hour);
  else if (clientInfo.scenario === 'inactive_haircut_inside') await upsertAppointment(ctx, clientInfo, assignment, 'inactive-haircut-inside', 'concluido', -60, hour);
  else if (clientInfo.scenario === 'inactive_fallback_overdue') await upsertAppointment(ctx, clientInfo, assignment, 'inactive-fallback-overdue', 'concluido', -50, hour);
  else if (clientInfo.scenario === 'occasional_makeup_old') await upsertAppointment(ctx, clientInfo, assignment, 'occasional-makeup-old', 'concluido', -100, hour);
  else if (clientInfo.scenario === 'future_blocks_recovery') {
    await upsertAppointment(ctx, clientInfo, assignment, 'future-history', 'concluido', -40, hour);
    await upsertAppointment(ctx, clientInfo, assignment, 'future-confirmed', 'confirmado', 8 + (index % 10), hour);
  } else if (clientInfo.scenario === 'cancelled_only') await upsertAppointment(ctx, clientInfo, assignment, 'cancelled', 'cancelado', -12, hour);
  else if (clientInfo.scenario === 'no_show_only') await upsertAppointment(ctx, clientInfo, assignment, 'no-show', 'no_show', -10, hour);
  else if (clientInfo.scenario === 'birthday_current') await upsertAppointment(ctx, clientInfo, assignment, 'birthday-history', 'concluido', -18, hour);
}

async function replaceCouponScope(ctx, coupon, def, mer) {
  const existing = await supabaseAdmin.from('cupom_servicos').select('id').eq('tenant_id', ctx.tenant.id).eq('cupom_id', coupon.id);
  if (existing.error) throw existing.error;
  if (existing.data?.length) {
    const deleted = await supabaseAdmin.from('cupom_servicos').delete().eq('tenant_id', ctx.tenant.id).in('id', existing.data.map((item) => item.id));
    if (deleted.error) throw deleted.error;
  }
  const target = def.canonical ? mer[def.canonical] : null;
  const { error } = await supabaseAdmin.from('cupom_servicos').insert({
    tenant_id: ctx.tenant.id,
    cupom_id: coupon.id,
    escopo: def.escopo,
    servico_id: null,
    servico_catalogo_id: target?.catalog?.id || null,
    servico_tenant_id: ['servico', 'combinacao'].includes(def.escopo) ? target?.offer?.id || null : null,
    especialidade_id: ['especialidade', 'combinacao'].includes(def.escopo) ? target?.config?.especialidade_id || null : null,
    servico_tenant_especialidade_id: def.escopo === 'combinacao' ? target?.config?.id || null : null,
    metadata: metadata({ seed_key: `${ctx.tenant.slug}:coupon-scope:${coupon.codigo}`, coupon_code: coupon.codigo })
  });
  if (error) throw error;
}

async function upsertCoupons(ctx, mer, clients) {
  const coupons = [];
  for (const def of COUPON_DEFS) {
    const seedKey = `${ctx.tenant.slug}:coupon:${def.code}`;
    const coupon = await upsertByMetadata('cupons', ctx.tenant.id, seedKey, {
      tenant_id: ctx.tenant.id,
      codigo: def.code,
      nome: def.code,
      descricao: `Cupom controlado ${SEED}`,
      tipo_codigo: 'generico',
      tipo_desconto: def.type,
      percentual_desconto: def.percent,
      valor_desconto: def.value,
      data_inicio: dateOnly(addDays(-10)),
      data_fim: dateOnly(addDays(def.expiresIn)),
      limite_uso: 100,
      limite_usos_por_cliente: 1,
      qtd_utilizada: 0,
      ativo: def.active,
      metadata: metadata({ seed_key: seedKey, coupon_scenario: def.code, escopo: def.escopo }),
      updated_at: new Date().toISOString()
    });
    await replaceCouponScope(ctx, coupon, def, mer);
    coupons.push(coupon);
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

async function upsertCampaigns(ctx, mer, template, coupons) {
  const campaigns = [];
  for (const [index, def] of CAMPAIGN_DEFS.entries()) {
    const target = def.canonical ? mer[def.canonical] : null;
    const coupon = coupons[index % coupons.length];
    campaigns.push(await upsertByMetadata('campanhas', ctx.tenant.id, `${ctx.tenant.slug}:campaign:${def.key}`, {
      tenant_id: ctx.tenant.id,
      nome: `[${SEED}] ${def.nome}`,
      descricao: `Campanha controlada Fase 7: ${def.nome}`,
      tipo: def.tipo,
      canal: 'whatsapp',
      template_id: template?.id || null,
      servico_id: null,
      servico_catalogo_id: target?.catalog?.id || null,
      servico_tenant_id: target?.offer?.id || null,
      servico_tenant_especialidade_id: target?.config?.id || null,
      especialidade_id: target?.config?.especialidade_id || null,
      status: index === 0 ? 'pronta' : 'rascunho',
      criterios_segmentacao: def.criteria,
      publico_alvo: def.criteria,
      parametros_template: { nome_servico: { source: 'fixed', value: target?.catalog?.nome || 'Servicos do salao' }, valor_promocional: { source: 'fixed', value: 'R$ 30,00' }, codigo_cupom: { source: 'fixed', value: coupon?.codigo || 'V3GERAL10' }, validade_promocao: { source: 'fixed', value: dateOnly(addDays(30)) } },
      data_inicio: dateOnly(addDays(-1)),
      data_fim: dateOnly(addDays(30)),
      metadata: metadata({ seed_key: `${ctx.tenant.slug}:campaign:${def.key}`, cupom_id: coupon?.id || null, dry_run: true, servico_tenant_id: target?.offer?.id || null, servico_tenant_especialidade_id: target?.config?.id || null, status_campanha: 'PARAMETRIZADA', status_processamento: 'PENDENTE' }),
      tracking_token: `cmp_${SEED}_${ctx.tenant.slug}_${def.key}`,
      ativo: true,
      updated_at: new Date().toISOString()
    }));
  }
  return campaigns;
}

async function upsertCampaignSend(payload) {
  const existing = await supabaseAdmin.from('campanha_envios').select('*').eq('tenant_id', payload.tenant_id).eq('metadata->>seed_key', payload.metadata.seed_key).maybeSingle();
  if (existing.error) throw existing.error;
  const result = existing.data ? await supabaseAdmin.from('campanha_envios').update(payload).eq('id', existing.data.id).select().single() : await supabaseAdmin.from('campanha_envios').insert(payload).select().single();
  if (result.error) throw result.error;
  return result.data;
}

async function upsertWhatsAppMessage(payload) {
  const existing = await supabaseAdmin.from('mensagens_whatsapp').select('id').eq('idempotency_key', payload.idempotency_key).maybeSingle();
  if (existing.error) throw existing.error;
  const result = existing.data ? await supabaseAdmin.from('mensagens_whatsapp').update(payload).eq('id', existing.data.id) : await supabaseAdmin.from('mensagens_whatsapp').insert(payload);
  if (result.error) throw result.error;
}

async function upsertMessages(ctx, campaign, template, clients) {
  for (let index = 0; index < Math.min(MESSAGE_STATUSES.length, clients.length); index += 1) {
    const item = MESSAGE_STATUSES[index];
    const client = clients[index].client;
    const key = `${ctx.tenant.id}:${campaign.id}:${client.id}:${template?.id || 'template'}:${SEED}:${index}`;
    const send = await upsertCampaignSend({ tenant_id: ctx.tenant.id, campanha_id: campaign.id, cliente_id: client.id, template_id: template?.id || null, status: item.send, metadata: metadata({ seed_key: `${ctx.tenant.slug}:send:${index}`, idempotency_key: key }), updated_at: new Date().toISOString() });
    await upsertWhatsAppMessage({ tenant_id: ctx.tenant.id, cliente_id: client.id, campanha_id: campaign.id, campanha_envio_id: send.id, telefone_destino: client.telefone, direcao: 'saida', template_nome: template?.nome || 'campaign_test_template', conteudo: `Mensagem dry-run de campanha ${SEED}`, tipo_evento: 'campaign.message', provider: 'whatsapp_mysaas', status_envio: item.message, idempotency_key: key, payload: metadata({ seed_key: `${ctx.tenant.slug}:message:${index}`, dry_run: true, simulated_webhook: false }), updated_at: new Date().toISOString() });
  }
}

function plannedClients(ctx) {
  const rows = [];
  let globalIndex = 0;
  for (const user of ctx.eligibleUsers) {
    for (let userIndex = 0; userIndex < plannedClientCount(user); userIndex += 1) {
      const scenario = scenarioFor(user, userIndex);
      const code = scenarioServiceCode(scenario);
      rows.push({ tenant: ctx.tenant.slug, usuario_id: user.id, usuario_responsavel: user.nome, perfil: roleName(user), cliente_previsto: naturalClientName(globalIndex), email_previsto: `${SEED}.${ctx.tenant.slug}.${user.id}.${globalIndex}@example.com`, cenario_codigo: scenario, servico_canonico: code, rastreabilidade: `metadata.seed_source=${SEED}`, seed_key: clientSeedKey(ctx, user, globalIndex) });
      globalIndex += 1;
    }
  }
  return rows;
}

function appointmentsForScenario(scenario) {
  return { recurring_high: 3, recurring_medium: 2, inactive_manicure_overdue: 1, inactive_haircut_inside: 1, inactive_fallback_overdue: 1, occasional_makeup_old: 1, future_blocks_recovery: 2, cancelled_only: 1, no_show_only: 1, birthday_current: 1 }[scenario] || 0;
}

function historyForScenario(scenario) {
  return { recurring_high: 3, recurring_medium: 2, inactive_manicure_overdue: 1, inactive_haircut_inside: 1, inactive_fallback_overdue: 1, occasional_makeup_old: 1, future_blocks_recovery: 1, no_show_only: 1, birthday_current: 1 }[scenario] || 0;
}

function plannedCounts(ctx) {
  const clients = ctx.eligibleUsers.reduce((total, user) => total + plannedClientCount(user), 0);
  const rows = plannedClients(ctx);
  const appointments = rows.reduce((total, row) => total + appointmentsForScenario(row.cenario_codigo), 0);
  const history = rows.reduce((total, row) => total + historyForScenario(row.cenario_codigo), 0);
  return { clientes: clients, cliente_tenants: clients, agendamentos: appointments, agendamento_servicos: appointments, cliente_historico_atendimentos: history, campanhas: CAMPAIGN_DEFS.length, cupons: COUPON_DEFS.length, cupom_servicos: COUPON_DEFS.length, cupom_usos: 3, campanha_envios: ctx.templates.length && clients ? MESSAGE_STATUSES.length : 0, mensagens_whatsapp: ctx.templates.length && clients ? MESSAGE_STATUSES.length : 0 };
}

async function countMarked(table, tenantId, column = 'metadata') {
  let query = supabaseAdmin.from(table).select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId);
  query = applySeedFilter(query, column);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function idsMarked(table, tenantId, column = 'metadata') {
  let query = supabaseAdmin.from(table).select('id').eq('tenant_id', tenantId);
  query = applySeedFilter(query, column);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((item) => item.id);
}

async function countClientsMarked(tenantSlug) {
  let query = supabaseAdmin.from('clientes').select('id', { count: 'exact', head: true }).ilike('email', `%${tenantSlug}.%`);
  query = applySeedFilter(query);
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

async function countAppointmentServicesMarked(tenantId) {
  const ids = await idsMarked('agendamentos', tenantId);
  if (!ids.length) return 0;
  const { count, error } = await supabaseAdmin.from('agendamento_servicos').select('id', { count: 'exact', head: true }).in('agendamento_id', ids);
  if (error) throw error;
  return count || 0;
}

async function countCouponServicesMarked(tenantId) {
  const ids = await idsMarked('cupons', tenantId);
  if (!ids.length) return 0;
  const { count, error } = await supabaseAdmin.from('cupom_servicos').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).in('cupom_id', ids);
  if (error) throw error;
  return count || 0;
}

async function actualCounts(tenantId, tenantSlug) {
  return { clientes: await countClientsMarked(tenantSlug), cliente_tenants: await countMarked('cliente_tenants', tenantId), agendamentos: await countMarked('agendamentos', tenantId), agendamento_servicos: await countAppointmentServicesMarked(tenantId), cliente_historico_atendimentos: await countMarked('cliente_historico_atendimentos', tenantId), campanhas: await countMarked('campanhas', tenantId), cupons: await countMarked('cupons', tenantId), cupom_servicos: await countCouponServicesMarked(tenantId), cupom_usos: await countMarked('cupom_usos', tenantId), campanha_envios: await countMarked('campanha_envios', tenantId), mensagens_whatsapp: await countMarked('mensagens_whatsapp', tenantId, 'payload') };
}

function usersByProfile(users) {
  return users.reduce((acc, user) => {
    const role = roleName(user) || 'sem_perfil';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});
}

function tenantRisks(ctx) {
  const risks = [];
  if (!ctx.eligibleUsers.length) risks.push('nenhum_usuario_elegivel');
  if (!ctx.professionals.length) risks.push('nenhum_profissional_ativo');
  if (!ctx.templates.length) risks.push('nenhum_template_marketing_ativo');
  for (const code of Array.from(new Set(Object.values(SERVICE_SCENARIOS)))) {
    const catalog = ctx.catalog.find((item) => item.codigo_canonico === code);
    if (!catalog) risks.push(`catalogo_ausente_${code}`);
    else if (!compatibleSpecialties(ctx, catalog.id, code).length) risks.push(`sem_especialidade_compativel_${code}`);
  }
  return risks;
}

async function audit() {
  const contexts = await Promise.all(TARGET_TENANTS.map(buildTenantContext));
  return {
    seed: SEED,
    controlled_seeds_for_cleanup: CONTROLLED_SEEDS,
    generated_at: new Date().toISOString(),
    restrictions: ['audit apenas consulta dados', 'cleanup exige --confirm-campaign-test-cleanup', 'seed usa somente novo MER como fonte oficial', 'WHATSAPP_DRY_RUN preservado e nenhum envio real e disparado'],
    script_dependency_audit: [
      { script: 'campaign-test-data-v2.js', dependencia_antiga: 'removida fisicamente na Fase 8.3', nova_fonte: 'campaign-test-data-v3.js', acao: 'package.json aponta para v3' },
      { script: 'campaign-test-data.js', dependencia_antiga: 'removida fisicamente na Fase 8.3', nova_fonte: 'campaign-test-data-v3.js', acao: 'package.json aponta para v3' }
    ],
    tenants: await Promise.all(contexts.map(async (ctx) => {
      if (!ctx.tenant) return { target: ctx.target.label, found: false, risks: ['tenant_nao_encontrado'] };
      const planned = plannedCounts(ctx);
      const existing = await actualCounts(ctx.tenant.id, ctx.tenant.slug);
      const rows = plannedClients(ctx);
      return {
        target: ctx.target.label,
        found: true,
        tenant: ctx.tenant,
        users_found: ctx.users.length,
        users_by_profile: usersByProfile(ctx.users),
        users_eligible: ctx.eligibleUsers.length,
        users_excluded: ctx.excludedUsers.map((user) => ({ user_id: user.id, nome: user.nome, perfil: roleName(user), motivo: isExcludedRole(user) ? 'perfil_excluido_profissional_adm' : 'perfil_nao_previsto_na_massa' })),
        records_by_table: Object.keys(planned).map((key) => ({ tabela: key, tenant: ctx.tenant.slug, registros_controlados_existentes: existing[key] || 0, registros_previstos_pos_seed: planned[key], forma_identificacao_massa: key === 'mensagens_whatsapp' ? 'payload.seed/payload.seed_source' : 'metadata.seed/metadata.seed_source' })),
        planned_clients: rows,
        scenario_distribution: Object.entries(rows.reduce((acc, row) => { acc[row.cenario_codigo] = (acc[row.cenario_codigo] || 0) + 1; return acc; }, {})).map(([cenario, quantidade]) => ({ cenario, quantidade, servico_canonico: scenarioServiceCode(cenario) })),
        mer_usage: Array.from(new Set(Object.values(SERVICE_SCENARIOS))).map((code) => {
          const catalog = ctx.catalog.find((item) => item.codigo_canonico === code);
          const offers = ctx.services.filter((item) => item.servico_catalogo_id === catalog?.id);
          const compat = catalog ? compatibleSpecialties(ctx, catalog.id, code) : [];
          return { codigo_canonico: code, catalogo_existe: Boolean(catalog), oferta_existente: offers.length > 0, combinacoes_existentes: offers.reduce((total, offer) => total + (offer.especialidades_config || []).length, 0), especialidades_compativeis: compat.map((item) => item.especialidade?.nome).filter(Boolean) };
        }),
        coupons: COUPON_DEFS.map((def) => ({ codigo: def.code, escopo: def.escopo, servico_canonico: def.canonical || null, status: def.expiresIn < 0 ? 'expirado' : def.active ? 'ativo' : 'inativo' })),
        campaigns: CAMPAIGN_DEFS.map((def) => ({ nome_campanha: `[${SEED}] ${def.nome}`, tipo: def.tipo, publico: def.criteria, servico_canonico: def.canonical || null, dry_run: true })),
        risks: tenantRisks(ctx)
      };
    })),
    idempotency: ['clientes por email deterministico', 'cliente_tenants por tenant_id+cliente_id', 'agendamentos/campanhas/cupons por metadata.seed_key', 'snapshots e escopos substituidos apenas dentro de registros marcados'],
    cleanup_order: ['mensagens_whatsapp', 'campanha_envios', 'cupom_usos', 'campanhas', 'cupom_servicos', 'cupons', 'cliente_historico_atendimentos', 'agendamento_servicos', 'agendamentos', 'cliente_tenants', 'clientes', 'configs/ofertas criadas pela massa v3']
  };
}

async function seed() {
  const contexts = await Promise.all(TARGET_TENANTS.map(buildTenantContext));
  const result = [];
  for (const ctx of contexts) {
    if (!ctx.tenant) throw new Error(`Tenant de teste nao encontrado: ${ctx.target.label}`);
    if (!ctx.eligibleUsers.length) throw new Error(`Nenhum usuario elegivel em ${ctx.tenant.slug}`);
    if (!ctx.professionals.length) throw new Error(`Nenhum profissional ativo em ${ctx.tenant.slug}`);
    if (!ctx.templates.length) throw new Error(`Nenhum template marketing ativo em ${ctx.tenant.slug}`);
    const mer = await ensureRequiredMer(ctx);
    const clients = [];
    let globalIndex = 0;
    for (const user of ctx.eligibleUsers) {
      for (let index = 0; index < plannedClientCount(user); index += 1) {
        const scenario = scenarioFor(user, index);
        const professional = pickProfessional(ctx, mer[scenarioServiceCode(scenario)].config, globalIndex);
        const client = await upsertClient(ctx, user, globalIndex, scenario, professional?.id || null);
        await seedAppointments(ctx, mer, client, globalIndex);
        clients.push(client);
        globalIndex += 1;
      }
    }
    const coupons = await upsertCoupons(ctx, mer, clients);
    const campaigns = await upsertCampaigns(ctx, mer, ctx.templates[0], coupons);
    if (campaigns[0]) await upsertMessages(ctx, campaigns[0], ctx.templates[0], clients);
    result.push({ tenant: ctx.tenant.slug, planned: plannedCounts(ctx), actual: await actualCounts(ctx.tenant.id, ctx.tenant.slug) });
  }
  return { seed: SEED, tenants: result };
}

async function validateMerSnapshots(ctx) {
  const { data, error } = await supabaseAdmin.from('agendamento_servicos').select('id,servico_id,servico_catalogo_id,servico_tenant_id,servico_tenant_especialidade_id,especialidade_id,duracao_minutos,valor_servico,agendamento:agendamentos!inner(tenant_id,metadata)').eq('agendamento.tenant_id', ctx.tenant.id).in('agendamento.metadata->>seed', CONTROLLED_SEEDS);
  if (error) throw error;
  const rows = data || [];
  const invalid = rows.filter((item) => !item.servico_tenant_id || !item.servico_tenant_especialidade_id || !item.servico_catalogo_id || !item.especialidade_id || item.servico_id);
  return { checked: rows.length, invalid: invalid.length, ok: rows.length > 0 && invalid.length === 0 };
}

async function validateInactiveRecovery(ctx) {
  const now = new Date();
  const result = await campaignsService.estimate(ctx.tenant.id, { criterios_segmentacao: { mode: 'segment', inactive_by_service_return: true, fallback_inactive_days: 45, no_future_appointment: true } }, { now });
  return inactiveRecoveryValidationSummary(result, now);
}

async function validateBirthday(ctx) {
  const result = await campaignsService.estimate(ctx.tenant.id, { criterios_segmentacao: { mode: 'segment', birthday_month: true } }, { now: new Date() });
  return { found: result.found, eligible: result.eligible, excluded_by_reason: result.excluded_by_reason, ok: result.found > 0 && result.eligible > 0 && Number(result.excluded_by_reason.fora_mes_aniversario || 0) > 0 && (Number(result.excluded_by_reason.sem_consentimento || 0) > 0 || Number(result.excluded_by_reason.telefone_invalido || 0) > 0) };
}

async function validateCoupons(ctx) {
  const { data, error } = await supabaseAdmin.from('cupons').select('id,codigo,ativo,data_fim,metadata,servicos:cupom_servicos(escopo,servico_id,servico_tenant_id,especialidade_id,servico_tenant_especialidade_id)').eq('tenant_id', ctx.tenant.id).eq('metadata->>seed', SEED);
  if (error) throw error;
  const coupons = data || [];
  const byCode = Object.fromEntries(coupons.map((item) => [item.codigo, item]));
  const combo = byCode.V3COMBO30?.servicos?.[0];
  return { total: coupons.length, scopes: coupons.map((item) => ({ codigo: item.codigo, escopo: item.servicos?.[0]?.escopo || null })), ok: coupons.length >= COUPON_DEFS.length && byCode.V3GERAL10?.servicos?.[0]?.escopo === 'geral' && byCode.V3SERV20?.servicos?.[0]?.servico_tenant_id && byCode.V3ESP15?.servicos?.[0]?.especialidade_id && combo?.servico_tenant_especialidade_id && byCode.V3EXP20?.data_fim < dateOnly(new Date()) && byCode.V3OFF10?.ativo === false };
}

async function validateTenantIsolation(ctx) {
  const otherSlugs = TARGET_TENANTS.map((item) => item.slugs[0]).filter((slug) => slug !== ctx.tenant.slug);
  const checks = [];
  for (const slug of otherSlugs) {
    const { data: otherClients, error: otherClientsError } = await supabaseAdmin.from('clientes').select('id').eq('metadata->>seed', SEED).ilike('email', `${SEED}.${slug}.%`);
    if (otherClientsError) throw otherClientsError;
    const otherIds = (otherClients || []).map((item) => item.id);
    let linkedToCurrentTenant = 0;
    if (otherIds.length) {
      const { count, error } = await supabaseAdmin.from('cliente_tenants').select('id', { count: 'exact', head: true }).eq('tenant_id', ctx.tenant.id).in('cliente_id', otherIds);
      if (error) throw error;
      linkedToCurrentTenant = count || 0;
    }

    const { count: ownLinksToOtherTenant, error: ownLinksError } = await supabaseAdmin
      .from('cliente_tenants')
      .select('id,cliente:clientes!inner(email,metadata)', { count: 'exact', head: true })
      .neq('tenant_id', ctx.tenant.id)
      .eq('cliente.metadata->>seed', SEED)
      .ilike('cliente.email', `${SEED}.${ctx.tenant.slug}.%`);
    if (ownLinksError) throw ownLinksError;

    const { count: sameSlugCampaigns, error: campaignsError } = await supabaseAdmin.from('campanhas').select('id', { count: 'exact', head: true }).eq('tenant_id', ctx.tenant.id).eq('metadata->>seed', SEED).neq('metadata->>tenant_slug', ctx.tenant.slug);
    if (campaignsError) throw campaignsError;

    const { count: sameSlugCoupons, error: couponsError } = await supabaseAdmin.from('cupons').select('id', { count: 'exact', head: true }).eq('tenant_id', ctx.tenant.id).eq('metadata->>seed', SEED).neq('metadata->>tenant_slug', ctx.tenant.slug);
    if (couponsError) throw couponsError;

    checks.push({
      other_slug: slug,
      other_marked_clients_global: otherIds.length,
      other_clients_linked_to_current_tenant: linkedToCurrentTenant,
      current_clients_linked_to_other_tenant: ownLinksToOtherTenant || 0,
      current_campaigns_with_wrong_slug: sameSlugCampaigns || 0,
      current_coupons_with_wrong_slug: sameSlugCoupons || 0
    });
  }
  return {
    checked_against: checks,
    ok: checks.every((item) => item.other_clients_linked_to_current_tenant === 0 && item.current_clients_linked_to_other_tenant === 0 && item.current_campaigns_with_wrong_slug === 0 && item.current_coupons_with_wrong_slug === 0)
  };
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
    const countChecks = Object.fromEntries(Object.entries(planned).map(([key, value]) => [key, counts[key] >= value]));
    const [mer, inactive, birthday, coupons, multiTenant] = await Promise.all([validateMerSnapshots(ctx), validateInactiveRecovery(ctx), validateBirthday(ctx), validateCoupons(ctx), validateTenantIsolation(ctx)]);
    const ok = Object.values(countChecks).every(Boolean) && mer.ok && inactive.ok && birthday.ok && coupons.ok && multiTenant.ok;
    result.push({ tenant: ctx.tenant.slug, planned, actual: counts, count_checks: countChecks, mer, inactive_recovery: inactive, birthday, coupons, multi_tenant: multiTenant, ok });
  }
  return { seed: SEED, tenants: result, ok: result.every((item) => item.ok) };
}

async function listFutureBlocksRecoveryRows(ctx, now = new Date()) {
  const { data: links, error: linkError } = await supabaseAdmin
    .from('cliente_tenants')
    .select('id,cliente_id,nome_no_tenant,metadata,cliente:clientes(id,nome,email,metadata)')
    .eq('tenant_id', ctx.tenant.id)
    .eq('metadata->>seed', SEED)
    .eq('metadata->>scenario', 'future_blocks_recovery')
    .is('deleted_at', null);
  if (linkError) throw linkError;

  const clienteIds = (links || []).map((item) => item.cliente_id).filter(Boolean);
  if (!clienteIds.length) return [];

  const { data: appointments, error: appointmentError } = await supabaseAdmin
    .from('agendamentos')
    .select('id,cliente_id,status,data_inicio,data_fim,profissional_id,metadata,deleted_at')
    .eq('tenant_id', ctx.tenant.id)
    .in('cliente_id', clienteIds)
    .eq('metadata->>seed', SEED)
    .eq('metadata->>scenario', 'future_blocks_recovery')
    .is('deleted_at', null);
  if (appointmentError) throw appointmentError;

  const byClient = new Map();
  (appointments || []).forEach((appointment) => {
    const list = byClient.get(appointment.cliente_id) || [];
    list.push(appointment);
    byClient.set(appointment.cliente_id, list);
  });

  return (links || [])
    .map((link) => {
      const clientAppointments = (byClient.get(link.cliente_id) || []).sort((left, right) => {
        const leftKey = left.metadata?.seed_key || '';
        const rightKey = right.metadata?.seed_key || '';
        return leftKey.localeCompare(rightKey);
      });
      const activeFuture = clientAppointments.filter((appointment) => isActiveFutureAppointment(appointment, now));
      const candidate = clientAppointments.find((appointment) => {
        const seedKey = String(appointment.metadata?.seed_key || '');
        return seedKey.endsWith(':appt:future-confirmed');
      }) || clientAppointments.find((appointment) => isExpiredActiveAppointment(appointment, now));
      return {
        tenant: ctx.tenant.slug,
        tenant_id: ctx.tenant.id,
        cliente_id: link.cliente_id,
        cliente: link.nome_no_tenant || link.cliente?.nome || 'Cliente',
        seed_key: link.metadata?.seed_key || link.cliente?.metadata?.seed_key || null,
        has_active_future: activeFuture.length > 0,
        candidate,
        appointments: clientAppointments
      };
    })
    .sort((left, right) => String(left.seed_key || '').localeCompare(String(right.seed_key || '')));
}

function buildFutureBlocksRecoveryPlan(rows, now = new Date()) {
  let updateIndex = 0;
  return rows.map((row) => {
    if (row.has_active_future) {
      return { ...row, action: 'noop', reason: 'ja_possui_agendamento_futuro_valido' };
    }
    if (!row.candidate) {
      return { ...row, action: 'skip', reason: 'sem_agendamento_confirmado_do_cenario' };
    }
    if (!ACTIVE_FUTURE_APPOINTMENT_STATUSES.has(row.candidate.status)) {
      return { ...row, action: 'skip', reason: 'agendamento_do_cenario_em_status_nao_bloqueante' };
    }
    const oldStart = new Date(row.candidate.data_inicio);
    const oldEnd = new Date(row.candidate.data_fim);
    const duration = Number.isNaN(oldEnd.getTime()) || Number.isNaN(oldStart.getTime())
      ? 45 * 60_000
      : Math.max(15 * 60_000, oldEnd.getTime() - oldStart.getTime());
    const newStart = plannedFutureDate(now, updateIndex, row.candidate.data_inicio);
    updateIndex += 1;
    return {
      ...row,
      action: 'update',
      appointment_id: row.candidate.id,
      status: row.candidate.status,
      previous_data_inicio: row.candidate.data_inicio,
      planned_data_inicio: newStart.toISOString(),
      planned_data_fim: new Date(newStart.getTime() + duration).toISOString(),
      reason: 'agendamento_confirmado_expirado'
    };
  });
}

async function reconcileFutureBlocksRecovery(ctx, now = new Date(), dryRun = false) {
  const rows = await listFutureBlocksRecoveryRows(ctx, now);
  const plan = buildFutureBlocksRecoveryPlan(rows, now);
  const changes = [];
  for (const item of plan.filter((entry) => entry.action === 'update')) {
    if (!dryRun) {
      const { error } = await supabaseAdmin
        .from('agendamentos')
        .update({
          data_inicio: item.planned_data_inicio,
          data_fim: item.planned_data_fim,
          updated_at: now.toISOString()
        })
        .eq('tenant_id', ctx.tenant.id)
        .eq('id', item.appointment_id)
        .eq('metadata->>seed', SEED)
        .eq('metadata->>scenario', 'future_blocks_recovery');
      if (error) throw error;
    }
    changes.push({
      cliente: item.cliente,
      tenant: item.tenant,
      appointment_id: item.appointment_id,
      status: item.status,
      data_anterior: item.previous_data_inicio,
      nova_data: item.planned_data_inicio,
      cenario: 'future_blocks_recovery',
      applied: !dryRun
    });
  }
  return {
    tenant: ctx.tenant.slug,
    dry_run: dryRun,
    found: rows.length,
    planned_updates: plan.filter((item) => item.action === 'update').length,
    noops: plan.filter((item) => item.action === 'noop').length,
    skipped: plan.filter((item) => item.action === 'skip').length,
    changes,
    plan: plan.map((item) => ({
      cliente: item.cliente,
      tenant: item.tenant,
      appointment_id: item.appointment_id || item.candidate?.id || null,
      status: item.status || item.candidate?.status || null,
      data_atual: item.previous_data_inicio || item.candidate?.data_inicio || null,
      nova_data_planejada: item.planned_data_inicio || null,
      cenario: 'future_blocks_recovery',
      action: item.action,
      reason: item.reason
    }))
  };
}

async function reconcile() {
  const now = new Date();
  const dryRun = process.argv.includes('--dry-run');
  const contexts = await Promise.all(TARGET_TENANTS.map(buildTenantContext));
  const tenants = [];
  for (const ctx of contexts.filter((item) => item.tenant)) {
    tenants.push(await reconcileFutureBlocksRecovery(ctx, now, dryRun));
  }
  return {
    seed: SEED,
    command: 'reconcile',
    scenario: 'future_blocks_recovery',
    generated_at: now.toISOString(),
    dry_run: dryRun,
    rule: `Atualiza somente agendamentos confirmados expirados do cenario para now + ${FUTURE_BLOCKS_RECONCILE_DAYS} dias + indice deterministico, preservando horario UTC original e duracao.`,
    tenants
  };
}

async function deleteMarked(table, tenantId, column = 'metadata') {
  let query = supabaseAdmin.from(table).delete().eq('tenant_id', tenantId);
  query = applySeedFilter(query, column);
  const { data, error } = await query.select('id');
  if (error) throw error;
  return (data || []).length;
}

async function deleteAppointmentServices(tenantId) {
  const ids = await idsMarked('agendamentos', tenantId);
  if (!ids.length) return 0;
  const { data, error } = await supabaseAdmin.from('agendamento_servicos').delete().in('agendamento_id', ids).select('id');
  if (error) throw error;
  return (data || []).length;
}

async function deleteCouponServices(tenantId) {
  const ids = await idsMarked('cupons', tenantId);
  if (!ids.length) return 0;
  const { data, error } = await supabaseAdmin.from('cupom_servicos').delete().eq('tenant_id', tenantId).in('cupom_id', ids).select('id');
  if (error) throw error;
  return (data || []).length;
}

async function deleteClients(tenantSlug) {
  let query = supabaseAdmin.from('clientes').delete().ilike('email', `%${tenantSlug}.%`);
  query = applySeedFilter(query);
  const { data, error } = await query.select('id');
  if (error) throw error;
  return (data || []).length;
}

async function cleanup() {
  if (!process.argv.includes('--confirm-campaign-test-cleanup')) throw new Error('Confirme a limpeza com --confirm-campaign-test-cleanup.');
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
    const seededOffers = await supabaseAdmin.from('servico_tenants').select('id').eq('tenant_id', tenantId).eq('metadata->>seed', SEED);
    if (seededOffers.error) throw seededOffers.error;
    const seededOfferIds = (seededOffers.data || []).map((item) => item.id);
    if (seededOfferIds.length) {
      const configs = await supabaseAdmin.from('servico_tenant_especialidades').delete().in('servico_tenant_id', seededOfferIds).eq('metadata->>seed', SEED).select('id');
      if (configs.error) throw configs.error;
      deleted.servico_tenant_especialidades = (configs.data || []).length;
    } else {
      deleted.servico_tenant_especialidades = 0;
    }
    const offers = await supabaseAdmin.from('servico_tenants').delete().eq('tenant_id', tenantId).eq('metadata->>seed', SEED).select('id');
    if (offers.error) throw offers.error;
    deleted.servico_tenants = (offers.data || []).length;
    result.push({ tenant: ctx.tenant.slug, deleted });
  }
  return { seed: SEED, controlled_seeds: CONTROLLED_SEEDS, tenants: result };
}

async function main() {
  assertEnvironment();
  const command = process.argv[2] || 'audit';
  const handlers = { audit, seed, validate, cleanup, reconcile };
  if (!handlers[command]) throw new Error(`Comando invalido: ${command}`);
  console.log(JSON.stringify(await handlers[command](), null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}

module.exports = {
  ACTIVE_FUTURE_APPOINTMENT_STATUSES,
  FUTURE_BLOCKS_RECONCILE_DAYS,
  buildFutureBlocksRecoveryPlan,
  futureBlocksRecoveryDiagnostic,
  inactiveRecoveryValidationSummary,
  isActiveFutureAppointment,
  isExpiredActiveAppointment,
  plannedFutureDate,
  scenarioFromAudienceRow
};
