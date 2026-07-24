const dashboardRepository = require('./dashboard.repository');
const subscriptionService = require('../subscription/subscription.service');
const { APP_BRAND } = require('../../config/app-brand');

const ROLE_WIDGETS = {
  administrador: ['revenue', 'clients', 'occupancy', 'appointments', 'campaigns', 'finance'],
  gerente: ['revenue', 'clients', 'occupancy', 'appointments', 'campaigns'],
  autonomo: ['ownAgenda', 'ownEarnings', 'ownClients', 'personalMetrics', 'ownCampaigns'],
  profissional: ['revenue', 'clients', 'occupancy', 'appointments'],
  profissional_adm: ['clients', 'occupancy', 'appointments'],
  recepcionista: ['clients', 'occupancy', 'appointments'],
  financeiro: ['revenue', 'finance'],
  funcionario: ['ownAppointments', 'ownClients', 'ownCommission', 'ownSchedule'],
  terceiro: ['linkedAgenda', 'authorizedServices', 'ownLimitedEarnings'],
  cliente: ['appointments', 'notifications', 'campaigns'],
  master_admin: ['tenants', 'saasHealth', 'revenue', 'clients']
};

const ROLE_ALIASES = {
  MasterAdmin: 'master_admin',
  Administrador: 'administrador',
  Gerente: 'gerente',
  Autonomo: 'autonomo',
  Profissional: 'funcionario',
  'Profissional Adm': 'profissional_adm',
  Recepcionista: 'recepcionista',
  Financeiro: 'financeiro',
  Funcionario: 'funcionario',
  Terceiro: 'terceiro',
  Cliente: 'cliente'
};

const DASHBOARD_CACHE_TTL_MS = 45 * 1000;
const dashboardCache = new Map();

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

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function getMonthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString()
  };
}

function percentage(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function averageMinutes(items) {
  const valid = items.filter((item) => Number.isFinite(item));
  if (!valid.length) return 0;
  return Math.round(valid.reduce((total, item) => total + item, 0) / valid.length);
}

function differenceMinutes(fromValue, toValue) {
  const from = fromValue ? new Date(fromValue) : null;
  const to = toValue ? new Date(toValue) : null;
  if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));
}

function getPrimaryService(appointment = {}) {
  const link = appointment.servicos?.[0] || null;
  const service = link?.servico || null;
  return {
    id: link?.servico_id || service?.id || null,
    name: link?.nome_servico || service?.nome || 'Atendimento',
    category: service?.categoria || null,
    value: Number(appointment.valor_total || link?.valor_servico || 0),
    duration: Number(link?.duracao_minutos || 0)
  };
}

function incrementGrouped(map, key, value = 1) {
  const normalizedKey = key || 'nao_informado';
  map.set(normalizedKey, (map.get(normalizedKey) || 0) + value);
}

function topEntries(map, limit = 5) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }));
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

function logDashboardAgendaConsistency(context, kpis, agenda) {
  const { startIso, endIso } = getDayRange();
  const todayItems = agenda?.today || [];

  console.log('[dashboard-agenda-debug]', {
    tenant_id: context.tenantId || null,
    role: ROLE_ALIASES[context.role] || context.role || null,
    profissional_id: context.membership?.profissional_id || null,
    date_range: {
      startIso,
      endIso
    },
    kpi_today_appointments_count: kpis?.todayAppointments || 0,
    agenda_today_count: todayItems.length,
    agenda_today_items: todayItems.map((item) => ({
      id: item.id,
      starts_at: item.starts_at,
      status: item.status
    }))
  });
}

function normalizeActivity(activity) {
  const payload = activity.payload || {};
  return {
    id: activity.id,
    title: payload.title || activity.event_type || 'Atividade registrada',
    description: payload.description || `Evento ${activity.event_type} registrado no ${APP_BRAND.appName}.`,
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
      description: `Estrutura inicial do ${APP_BRAND.appName} preparada para operacao.`,
      time: 'Agora',
      type: 'tenant_ready',
      origin: 'dashboard'
    },
    {
      id: 'activity-trial',
      title: subscription?.trial?.active ? 'Trial ativo' : 'Plano ativo',
      description: subscription?.trial?.days_remaining
        ? `${subscription.trial.days_remaining} dias restantes para explorar o ${APP_BRAND.appName}.`
        : 'Conta pronta para evoluir a operacao.',
      time: 'Hoje',
      type: 'subscription',
      origin: 'dashboard'
    }
  ];
}

function isAutonomoOwner(context = {}) {
  return context.membership?.is_owner === true || context.membership?.vinculo_tipo === 'owner';
}

function buildRoleConfig(role, context = {}) {
  const normalizedRole = ROLE_ALIASES[role] || role || 'administrador';
  const autonomoOwner = normalizedRole === 'autonomo' && isAutonomoOwner(context);
  const autonomoPartner = normalizedRole === 'autonomo' && !autonomoOwner;
  const widgets = autonomoOwner
    ? ROLE_WIDGETS.administrador
    : autonomoPartner
      ? ROLE_WIDGETS.autonomo.filter((widget) => widget !== 'ownCampaigns')
      : ROLE_WIDGETS[normalizedRole] || [];

  return {
    role: normalizedRole,
    widgets,
    permissions: {
      canViewFinancials: ['administrador', 'master_admin'].includes(normalizedRole) || autonomoOwner,
      canViewCampaigns: ['administrador', 'gerente', 'recepcionista', 'cliente', 'master_admin'].includes(normalizedRole) || autonomoOwner,
      canViewSaasMetrics: normalizedRole === 'master_admin',
      canManageAppointments: ['administrador', 'gerente', 'autonomo', 'profissional', 'recepcionista'].includes(normalizedRole),
      canViewAdministrativeMetrics: ['administrador', 'gerente', 'master_admin'].includes(normalizedRole) || autonomoOwner,
      isScopedProfessionalDashboard: ['funcionario', 'terceiro'].includes(normalizedRole) || autonomoPartner,
      isAutonomoHybridDashboard: normalizedRole === 'autonomo',
      isAutonomoOwner: autonomoOwner,
      marketplaceReady: normalizedRole === 'autonomo'
    }
  };
}

function isScopedProfessionalRole(role) {
  const normalizedRole = ROLE_ALIASES[role] || role;
  return ['funcionario', 'terceiro'].includes(normalizedRole);
}

function isPersonalDashboardContext(context = {}) {
  const normalizedRole = ROLE_ALIASES[context.role] || context.role;
  return ['funcionario', 'terceiro'].includes(normalizedRole)
    || (normalizedRole === 'autonomo' && !isAutonomoOwner(context));
}

function getDashboardCacheKey(context, scope = 'summary') {
  return [
    scope,
    context.tenantId || 'platform',
    context.userId || 'anonymous',
    context.role || 'role',
    context.membership?.id || 'membership',
    context.membership?.profissional_id || 'all'
  ].join(':');
}

function getCachedDashboard(key) {
  const cached = dashboardCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    dashboardCache.delete(key);
    return null;
  }
  return cached.value;
}

function setCachedDashboard(key, value) {
  dashboardCache.set(key, {
    value,
    expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS
  });
  return value;
}

async function getKpis(context) {
  const { tenantId, role } = context;
  const normalizedRole = ROLE_ALIASES[role] || role;
  const profissionalId = context.membership?.profissional_id || null;
  const { startIso, endIso } = getDayRange();

  if (!tenantId && normalizedRole === 'master_admin') {
    const [activeTenants, trialTenants] = await Promise.all([
      dashboardRepository.countTenantsByStatus('ativo'),
      dashboardRepository.countTenantsByStatus('trial')
    ]);

    return {
      revenueToday: 0,
      activeClients: 0,
      occupancy: 0,
      todayAppointments: 0,
      activeProfessionals: 0,
      activeTenants,
      trialTenants,
      display: {
        faturamentoHoje: toCurrency(0),
        clientesAtivos: '0',
        ocupacao: '0%',
        atendimentosHoje: '0',
        tenantsAtivos: String(activeTenants),
        tenantsTrial: String(trialTenants)
      }
    };
  }

  if (isPersonalDashboardContext(context)) {
    if (!profissionalId) {
      return {
        revenueToday: 0,
        activeClients: 0,
        occupancy: 0,
        todayAppointments: 0,
        activeProfessionals: 0,
        activeTenants: null,
        trialTenants: null,
        scopedProfessional: true,
        authorizedServices: 0,
        scheduleEntries: 0,
        display: {
          faturamentoHoje: toCurrency(0),
          clientesAtivos: '0',
          ocupacao: 'Agenda propria',
          atendimentosHoje: '0',
          tenantsAtivos: null,
          tenantsTrial: null,
          comissaoHoje: toCurrency(0),
          horariosConfigurados: '0',
          servicosAutorizados: '0',
          ganhosLimitados: toCurrency(0),
          ganhosProprios: toCurrency(0),
          metricasPessoais: '0'
        }
      };
    }

    const [
      ownRevenueToday,
      ownClients,
      ownAppointmentsToday,
      authorizedServices,
      scheduleEntries
    ] = await Promise.all([
      dashboardRepository.sumAppointmentsRevenueByProfessional(tenantId, profissionalId, startIso, endIso),
      dashboardRepository.countClientsByProfessional(tenantId, profissionalId),
      dashboardRepository.countTodayAppointmentsByProfessional(tenantId, profissionalId, startIso, endIso),
      dashboardRepository.countAuthorizedServices(tenantId, profissionalId),
      dashboardRepository.countProfessionalSchedules(tenantId, profissionalId)
    ]);

    const estimatedCommission = ownRevenueToday;

    return {
      revenueToday: ownRevenueToday,
      activeClients: ownClients,
      occupancy: 0,
      todayAppointments: ownAppointmentsToday,
      activeProfessionals: 1,
      activeTenants: null,
      trialTenants: null,
      scopedProfessional: true,
      authorizedServices,
      scheduleEntries,
      display: {
        faturamentoHoje: toCurrency(ownRevenueToday),
        clientesAtivos: String(ownClients),
        ocupacao: 'Agenda propria',
        atendimentosHoje: String(ownAppointmentsToday),
        tenantsAtivos: null,
        tenantsTrial: null,
        comissaoHoje: toCurrency(estimatedCommission),
        horariosConfigurados: String(scheduleEntries),
        servicosAutorizados: String(authorizedServices),
        ganhosLimitados: toCurrency(ownRevenueToday),
        ganhosProprios: toCurrency(ownRevenueToday),
        metricasPessoais: String(ownAppointmentsToday)
      }
    };
  }

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
  const profissionalId = context.membership?.profissional_id || null;
  if (!tenantId) {
    return { today: [], next: [] };
  }

  const { startIso, endIso } = getDayRange();

  const [today, next] = await Promise.all([
    isPersonalDashboardContext(context) && profissionalId
      ? dashboardRepository.listAgendaPreviewByProfessional(tenantId, profissionalId, startIso, endIso)
      : isPersonalDashboardContext(context) ? Promise.resolve([]) : dashboardRepository.listAgendaPreview(tenantId, startIso, endIso),
    isPersonalDashboardContext(context) && profissionalId
      ? dashboardRepository.listNextAppointmentsByProfessional(tenantId, profissionalId, new Date().toISOString())
      : isPersonalDashboardContext(context) ? Promise.resolve([]) : dashboardRepository.listNextAppointments(tenantId, new Date().toISOString())
  ]);

  return {
    today: today.map(normalizeAppointment),
    next: next.map(normalizeAppointment)
  };
}

async function getActivity(context) {
  const { tenantId, userId } = context;
  if (!tenantId) {
    return { activities: [], notifications: [], campaigns: [] };
  }

  if (isPersonalDashboardContext(context)) {
    const notifications = await dashboardRepository.listNotifications(tenantId, userId);
    return {
      activities: [],
      notifications: notifications.map((item) => ({
        id: item.id,
        title: item.titulo,
        description: item.mensagem,
        type: item.tipo,
        read: item.lida,
        time: toDateTime(item.created_at)
      })),
      campaigns: []
    };
  }

  const [activities, notifications, campaigns] = await Promise.all([
    dashboardRepository.listRecentActivities(tenantId),
    dashboardRepository.listNotifications(tenantId, userId),
    isScopedProfessionalRole(context.role)
      ? Promise.resolve([])
      : dashboardRepository.listCampaignPreview(tenantId)
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

async function getOperationalDashboard(context) {
  const { tenantId } = context;
  if (!tenantId) return null;

  const personalContext = isPersonalDashboardContext(context);
  const profissionalId = personalContext ? context.membership?.profissional_id || null : null;
  const today = getDayRange();
  const tomorrow = getDayRange(addDays(new Date(), 1));
  const month = getMonthRange();

  const [
    todayAppointments,
    tomorrowAppointments,
    monthAppointments,
    monthHistory,
    whatsappMessages,
    statusHistory
  ] = await Promise.all([
    dashboardRepository.listOperationalAppointments(tenantId, today.startIso, today.endIso, { profissionalId }),
    dashboardRepository.listOperationalAppointments(tenantId, tomorrow.startIso, tomorrow.endIso, { profissionalId }),
    dashboardRepository.listOperationalAppointments(tenantId, month.startIso, month.endIso, { profissionalId }),
    dashboardRepository.listOperationalClientHistory(tenantId, month.startIso, month.endIso, { profissionalId }),
    personalContext ? Promise.resolve([]) : dashboardRepository.listOperationalWhatsappMessages(tenantId, today.startIso, today.endIso),
    dashboardRepository.listOperationalStatusHistory(tenantId, month.startIso, month.endIso)
  ]);

  const activeToday = todayAppointments.filter((item) => item.status !== 'cancelado');
  const concludedToday = todayAppointments.filter((item) => item.status === 'concluido');
  const cancelledToday = todayAppointments.filter((item) => item.status === 'cancelado');
  const noShowToday = todayAppointments.filter((item) => item.status === 'no_show');
  const confirmedToday = todayAppointments.filter((item) => ['confirmado', 'pendente_cliente'].includes(item.status));
  const waitingAttendantToday = todayAppointments.filter((item) => ['pendente', 'pendente_atendente', 'suspeito'].includes(item.status));
  const inProgressNow = todayAppointments.filter((item) => {
    const start = new Date(item.data_inicio);
    const end = new Date(item.data_fim);
    const now = new Date();
    return ['pendente_cliente', 'confirmado'].includes(item.status)
      && start <= now
      && end >= now;
  });
  const attendedClients = new Set(concludedToday.map((item) => item.cliente_id).filter(Boolean)).size;
  const newClientsMonth = new Set(monthHistory.map((item) => item.cliente_id).filter(Boolean)).size;
  const recurringClientsMonth = Array.from(monthHistory.reduce((map, item) => {
    map.set(item.cliente_id, (map.get(item.cliente_id) || 0) + 1);
    return map;
  }, new Map()).values()).filter((count) => count > 1).length;
  const attendanceBase = concludedToday.length + noShowToday.length;
  const serviceCounts = new Map();
  const serviceRevenue = new Map();
  const professionalCounts = new Map();
  const professionalCancelled = new Map();
  const professionalNoShow = new Map();
  const statusCounts = new Map();

  monthAppointments.forEach((appointment) => {
    const service = getPrimaryService(appointment);
    const professional = appointment.profissional?.nome_publico || appointment.profissional?.cargo || 'Profissional';
    incrementGrouped(statusCounts, appointment.status);
    if (appointment.status === 'concluido') {
      incrementGrouped(serviceCounts, service.name);
      incrementGrouped(professionalCounts, professional);
      incrementGrouped(serviceRevenue, service.name, service.value);
    }
    if (appointment.status === 'cancelado') incrementGrouped(professionalCancelled, professional);
    if (appointment.status === 'no_show') incrementGrouped(professionalNoShow, professional);
  });

  const whatsappByStatus = new Map();
  const whatsappByEvent = new Map();
  whatsappMessages.forEach((message) => {
    incrementGrouped(whatsappByStatus, message.status_envio || 'desconhecido');
    incrementGrouped(whatsappByEvent, message.tipo_evento || message.template_nome || 'sem_evento');
  });

  const confirmationTimes = monthAppointments
    .map((appointment) => differenceMinutes(appointment.created_at, appointment.confirmado_em))
    .filter((value) => value !== null);
  const executionTimes = monthAppointments
    .map((appointment) => differenceMinutes(appointment.confirmado_em, appointment.concluido_em))
    .filter((value) => value !== null);
  const reminderEvents = statusHistory.filter((item) => String(item.origem || '').includes('reminder')).length
    + whatsappMessages.filter((item) => String(item.tipo_evento || '').includes('reminder')).length;
  const automaticCompletions = statusHistory.filter((item) => (
    item.status_novo === 'concluido' && item.origem === 'auto_completion'
  )).length;

  return {
    generatedAt: new Date().toISOString(),
    cacheTtlMs: DASHBOARD_CACHE_TTL_MS,
    filters: {
      period: 'today',
      monthPeriod: 'current_month',
      tenantId,
      profissionalId,
      scopedProfessional: personalContext
    },
    overview: {
      scheduledToday: todayAppointments.length,
      activeToday: activeToday.length,
      confirmedToday: confirmedToday.length,
      completedToday: concludedToday.length,
      cancellationsToday: cancelledToday.length,
      noShowToday: noShowToday.length,
      inProgressToday: inProgressNow.length,
      attendedClientsToday: attendedClients,
      newClientsMonth,
      recurringClientsMonth,
      attendanceRate: percentage(concludedToday.length, attendanceBase),
      noShowRate: percentage(noShowToday.length, attendanceBase),
      occupancyRate: percentage(activeToday.length, Math.max(1, (new Set(todayAppointments.map((item) => item.profissional_id)).size || 1) * 8)),
      pendingConfirmation: waitingAttendantToday.length,
      whatsappErrorsToday: whatsappMessages.filter((item) => item.status_envio === 'erro').length
    },
    agenda: {
      today: todayAppointments.slice(0, 8).map(normalizeAppointment),
      tomorrowCount: tomorrowAppointments.length,
      next: [...todayAppointments, ...tomorrowAppointments]
        .filter((item) => new Date(item.data_inicio) >= new Date() && item.status !== 'cancelado')
        .slice(0, 6)
        .map(normalizeAppointment),
      statusCounts: topEntries(statusCounts, 10)
    },
    clients: {
      newThisMonth: newClientsMonth,
      recurringThisMonth: recurringClientsMonth,
      withNoShowThisMonth: new Set(monthHistory.filter((item) => item.status === 'no_show').map((item) => item.cliente_id)).size
    },
    services: {
      mostPerformed: topEntries(serviceCounts, 5),
      revenue: topEntries(serviceRevenue, 5)
    },
    professionals: {
      mostOccupied: topEntries(professionalCounts, 5),
      cancellations: topEntries(professionalCancelled, 5),
      noShow: topEntries(professionalNoShow, 5)
    },
    whatsapp: {
      sent: whatsappMessages.filter((item) => item.status_envio === 'enviado').length,
      pending: whatsappMessages.filter((item) => item.status_envio === 'pendente').length,
      delivered: whatsappMessages.filter((item) => item.status_envio === 'entregue').length,
      read: whatsappMessages.filter((item) => item.status_envio === 'lido').length,
      errors: whatsappMessages.filter((item) => item.status_envio === 'erro').length,
      byStatus: topEntries(whatsappByStatus, 10),
      byEvent: topEntries(whatsappByEvent, 10)
    },
    operational: {
      averageConfirmationMinutes: averageMinutes(confirmationTimes),
      averageConfirmationToCompletionMinutes: averageMinutes(executionTimes),
      remindersSent: reminderEvents,
      automaticCompletions
    }
  };
}

async function getSummary(context) {
  const cacheKey = getDashboardCacheKey(context, 'summary');
  const cached = getCachedDashboard(cacheKey);
  if (cached) return cached;

  const normalizedRole = ROLE_ALIASES[context.role] || context.role;
  const personalContext = isPersonalDashboardContext(context);
  const [subscription, kpis, agenda, activity, operational] = await Promise.all([
    context.tenantId && !personalContext
      ? subscriptionService.getTenantPlan(context.tenantId).catch(() => null)
      : Promise.resolve(null),
    getKpis(context),
    getAgendaPreview(context),
    getActivity(context),
    getOperationalDashboard(context)
  ]);

  logDashboardAgendaConsistency(context, kpis, agenda);

  const roleConfig = buildRoleConfig(context.role, context);
  const activities = activity.activities.length || personalContext
    ? activity.activities
    : buildFallbackActivities(subscription);

  return setCachedDashboard(cacheKey, {
    salonName: context.tenant?.nome_fantasia || (
      normalizedRole === 'master_admin' ? `${APP_BRAND.appName} Plataforma` : APP_BRAND.appName
    ),
    userName: context.user?.nome || 'Usuario',
    userRole: roleConfig.role,
    tenantStatus: context.tenant?.status || 'ativo',
    roleConfig,
    dashboardScope: {
      tenantId: context.tenantId || null,
      membershipId: context.membership?.id || null,
      profissionalId: context.membership?.profissional_id || null,
      scopedProfessional: roleConfig.permissions.isScopedProfessionalDashboard,
      autonomoContext: roleConfig.permissions.isAutonomoHybridDashboard ? {
        vinculoTipo: context.membership?.vinculo_tipo || null,
        isOwner: roleConfig.permissions.isAutonomoOwner,
        marketplaceReady: true
      } : null
    },
    subscription,
    kpis,
    operational,
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
  });
}

async function getDetails(context) {
  const cacheKey = getDashboardCacheKey(context, 'details');
  const cached = getCachedDashboard(cacheKey);
  if (cached) return cached;
  return setCachedDashboard(cacheKey, {
    operational: await getOperationalDashboard(context),
    realtime: {
      strategy: 'lazy-loading',
      intervalMs: DASHBOARD_CACHE_TTL_MS,
      future: ['views', 'materialized_views', 'redis_cache']
    }
  });
}

module.exports = {
  getSummary,
  getDetails,
  getKpis,
  getActivity,
  getAgendaPreview
};
