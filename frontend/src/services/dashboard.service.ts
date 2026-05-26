import type { AuthSession } from "@/services/auth.service";

export type DashboardSubscription = {
  assinatura?: {
    status: string;
    trial_ate?: string | null;
    valor_mensal?: number | null;
  };
  plano?: {
    nome: string;
    preco_mensal?: number | null;
  } | null;
  trial?: {
    active: boolean;
    expired: boolean;
    days_remaining: number | null;
  };
  usage?: {
    profissionais?: number;
    clientes?: number;
    agendamentos_mes?: number;
    whatsapp_mes?: number;
  };
  limits?: {
    profissionais?: { used: number; limit: number | null };
    clientes?: { used: number; limit: number | null };
    agendamentos_mes?: { used: number; limit: number | null };
    whatsapp_mes?: { used: number; limit: number | null };
  };
};

export type DashboardRoleConfig = {
  role: string;
  widgets: string[];
  permissions: {
    canViewFinancials: boolean;
    canViewCampaigns: boolean;
    canViewSaasMetrics: boolean;
    canManageAppointments: boolean;
  };
};

export type DashboardAppointment = {
  id: string;
  starts_at?: string;
  ends_at?: string;
  time: string;
  dateTime?: string;
  client: string;
  professional?: string;
  service: string;
  status: string;
  amount?: number;
};

export type DashboardActivity = {
  id: string;
  title: string;
  description: string;
  time: string;
  type?: string;
  origin?: string;
};

export type DashboardNotification = {
  id: string;
  title: string;
  description: string;
  type: string;
  read: boolean;
  time: string;
};

export type DashboardCampaign = {
  id: string;
  title: string;
  description: string;
  status: string;
  starts_at?: string | null;
  ends_at?: string | null;
};

export type DashboardSnapshot = {
  salonName: string;
  userName: string;
  userRole: string;
  tenantStatus: string;
  roleConfig: DashboardRoleConfig;
  subscription: DashboardSubscription | null;
  kpis: {
    revenueToday: number;
    activeClients: number;
    occupancy: number;
    todayAppointments: number;
    activeProfessionals: number;
    activeTenants: number | null;
    trialTenants: number | null;
    display: {
      faturamentoHoje: string;
      clientesAtivos: string;
      ocupacao: string;
      atendimentosHoje: string;
      tenantsAtivos: string | null;
      tenantsTrial: string | null;
    };
  };
  agenda: {
    today: DashboardAppointment[];
    next: DashboardAppointment[];
  };
  activity: {
    activities: DashboardActivity[];
    notifications: DashboardNotification[];
    campaigns: DashboardCampaign[];
  };
  realtime: {
    strategy: "polling";
    intervalMs: number;
    future: string[];
  };
};

type ApiEnvelope<T> = {
  data?: T;
  error?: {
    code?: string;
    message?: string;
  };
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3000";

async function request<T>(path: string, token: string, signal?: AbortSignal) {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }
    });
  } catch {
    throw new Error("Falha de conexao. Tente novamente.");
  }

  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;

  if (!response.ok) {
    throw new Error(payload.error?.message || "Nao foi possivel carregar o dashboard.");
  }

  if (!payload.data) {
    throw new Error("Resposta invalida do servidor.");
  }

  return payload.data;
}

function normalizeSnapshot(snapshot: DashboardSnapshot): DashboardSnapshot {
  return {
    ...snapshot,
    agenda: {
      today: snapshot.agenda?.today || [],
      next: snapshot.agenda?.next || []
    },
    activity: {
      activities: snapshot.activity?.activities || [],
      notifications: snapshot.activity?.notifications || [],
      campaigns: snapshot.activity?.campaigns || []
    },
    realtime: {
      strategy: "polling",
      intervalMs: snapshot.realtime?.intervalMs || 60000,
      future: snapshot.realtime?.future || ["websocket", "pubsub", "event-driven"]
    }
  };
}

async function getSnapshot(session: AuthSession, signal?: AbortSignal): Promise<DashboardSnapshot> {
  const snapshot = await request<DashboardSnapshot>("/dashboard/summary", session.access_token, signal);
  return normalizeSnapshot(snapshot);
}

export const dashboardService = {
  getSnapshot
};
