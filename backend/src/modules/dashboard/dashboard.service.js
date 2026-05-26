const dashboardRepository = require('./dashboard.repository');
const subscriptionService = require('../subscription/subscription.service');

const ROLE_WIDGETS = {
  administrador: ['revenue', 'clients', 'occupancy', 'appointments', 'campaigns', 'finance'],
  autonomo: ['revenue', 'clients', 'occupancy', 'appointments'],
  cliente: ['appointments', 'notifications', 'campaigns'],
  master_admin: ['tenants', 'saasHealth', 'revenue', 'clients']
};

const ROLE_ALIASES = {
  MasterAdmin: 'master_admin',
  Administrador: 'administrador',
  Autonomo: 'autonomo',
  Funcionario: 'funcionario',
  Terceiro: 'terceiro',
  Cliente: 'cliente'
};

function getDayRange(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString()
  };
}

function toCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value || 0));
}

function toTime(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  }).format(new Date(value));
}

function toDateTime(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  }).format(new Date(value));
}

function normalizeAppointment(appointment) {
  return {
    id: appointment.id,
    starts_at: appointment.data_inicio,
    ends_at: appointment.data_fim,
    time: toTime(appointment.data_inicio),
    dateTime: toDateTime(appointment.data_inicio),
    client: appointment.cliente?.nome || 'Cliente',
    professional: appointment.profissional?.nome_publico || appointment.profissional?.cargo || 'Profissional',
    service: appointment.servicos?.[0]?.nome_servico || 'Atendimento',
    status: appointment.status,
    amount: Number(appointment.valor_total || 0)
  };
}

function normalizeActivity(activity) {
  const payload = activity.payload || {};
  return {
    id: activity.id,
    title: payload.title || activity.event_type || 'Atividade registrada',
    description: payload.description || `Evento ${activity.event_type} registrado no Bellory.`,
    time: toDateTime(activity.created_at),
    type: activity.event_type,
    origin: activity.origem
  };
}

function buildFallbackActivities(subscription) {
  return [
    {
      id: 'activity-tenant-ready',
      title: 'Salao criado',
      description: 'Estrutura inicial do Bellory preparada para operacao.',
      time: 'Agora',
      type: 'tenant_ready',
      origin: 'dashboard'
    },
    {
      id: 'activity-trial',
      title: subscription?.trial?.active ? 'Trial ativo' : 'Plano ativo',
      description: subscription?.trial?.days_remaining
        ? `${subscription.trial.days_remaining} dias restantes para explorar o Bellory.`
        : 'Conta pronta para evoluir a operacao.',
      time: 'Hoje',
      type: 'subscription',
      origin: 'dashboard'
    }
  ];
}

function buildRoleConfig(role) {
  const normalizedRole = ROLE_ALIASES[role] || role || 'administrador';
  return {
    role: normalizedRole,
    widgets: ROLE_WIDGETS[normalizedRole] || ROLE_WIDGETS.administrador,
    permissions: {
      canViewFinancials: ['administrador', 'autonomo', 'master_admin'].includes(normalizedRole),
      canViewCampaigns: ['administrador', 'cliente', 'master_admin'].includes(normalizedRole),
      canViewSaasMetrics: normalizedRole === 'master_admin',
      canManageAppointments: ['administrador', 'autonomo'].includes(normalizedRole)
    }
  };
}

async function getKpis(context) {
  const { tenantId, role } = context;
  const normalizedRole = ROLE_ALIASES[role] || role;
  const { startIso, endIso } = getDayRange();

  const [
    revenueToday,
    activeClients,
    todayAppointments,
    activeProfessionals,
    activeTenants,
    trialTenants
  ] = await Promise.all([
    dashboardRepository.sumAppointmentsRevenue(tenantId, startIso, endIso),
    dashboardRepository.countActiveClients(tenantId),
    dashboardRepository.countTodayAppointments(tenantId, startIso, endIso),
    dashboardRepository.countActiveProfessionals(tenantId),
    normalizedRole === 'master_admin' ? dashboardRepository.countTenantsByStatus('ativo') : Promise.resolve(null),
    normalizedRole === 'master_admin' ? dashboardRepository.countTenantsByStatus('trial') : Promise.resolve(null)
  ]);

  const dailyCapacity = Math.max(activeProfessionals * 8, 1);
  const occupancy = Math.min(100, Math.round((todayAppointments / dailyCapacity) * 100));

  return {
    revenueToday,
    activeClients,
    occupancy,
    todayAppointments,
    activeProfessionals,
    activeTenants,
    trialTenants,
    display: {
      faturamentoHoje: toCurrency(revenueToday),
      clientesAtivos: String(activeClients),
      ocupacao: `${occupancy}%`,
      atendimentosHoje: String(todayAppointments),
      tenantsAtivos: activeTenants === null ? null : String(activeTenants),
      tenantsTrial: trialTenants === null ? null : String(trialTenants)
    }
  };
}

async function getAgendaPreview(context) {
  const { tenantId } = context;
  const { startIso, endIso } = getDayRange();

  const [today, next] = await Promise.all([
    dashboardRepository.listAgendaPreview(tenantId, startIso, endIso),
    dashboardRepository.listNextAppointments(tenantId, new Date().toISOString())
  ]);

  return {
    today: today.map(normalizeAppointment),
    next: next.map(normalizeAppointment)
  };
}

async function getActivity(context) {
  const { tenantId, userId } = context;
  const [activities, notifications, campaigns] = await Promise.all([
    dashboardRepository.listRecentActivities(tenantId),
    dashboardRepository.listNotifications(tenantId, userId),
    dashboardRepository.listCampaignPreview(tenantId)
  ]);

  return {
    activities: activities.map(normalizeActivity),
    notifications: notifications.map((item) => ({
      id: item.id,
      title: item.titulo,
      description: item.mensagem,
      type: item.tipo,
      read: item.lida,
      time: toDateTime(item.created_at)
    })),
    campaigns: campaigns.map((item) => ({
      id: item.id,
      title: item.nome,
      description: item.descricao || 'Campanha preparada para relacionamento.',
      status: item.status,
      starts_at: item.data_inicio,
      ends_at: item.data_fim
    }))
  };
}

async function getSummary(context) {
  const [subscription, kpis, agenda, activity] = await Promise.all([
    subscriptionService.getTenantPlan(context.tenantId).catch(() => null),
    getKpis(context),
    getAgendaPreview(context),
    getActivity(context)
  ]);

  const roleConfig = buildRoleConfig(context.role);
  const activities = activity.activities.length
    ? activity.activities
    : buildFallbackActivities(subscription);

  return {
    salonName: context.tenant?.nome_fantasia || 'Bellory',
    userName: context.user?.nome || 'Usuario',
    userRole: roleConfig.role,
    tenantStatus: context.tenant?.status || 'ativo',
    roleConfig,
    subscription,
    kpis,
    agenda,
    activity: {
      ...activity,
      activities
    },
    realtime: {
      strategy: 'polling',
      intervalMs: 60000,
      future: ['websocket', 'pubsub', 'event-driven']
    }
  };
}

module.exports = {
  getSummary,
  getKpis,
  getActivity,
  getAgendaPreview
};
