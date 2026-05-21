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

export type DashboardSnapshot = {
  salonName: string;
  userName: string;
  userRole: string;
  tenantStatus: string;
  subscription: DashboardSubscription | null;
  kpis: {
    faturamentoHoje: string;
    clientesAtivos: string;
    ocupacao: string;
    atendimentosHoje: string;
  };
  appointments: Array<{
    id: string;
    time: string;
    client: string;
    service: string;
    status: string;
  }>;
  activities: Array<{
    id: string;
    title: string;
    description: string;
    time: string;
  }>;
};

type ApiEnvelope<T> = {
  data?: T;
  error?: {
    code?: string;
    message?: string;
  };
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3000";

async function request<T>(path: string, token: string) {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
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

  return payload.data as T;
}

async function getSubscription(session: AuthSession) {
  return request<DashboardSubscription>("/subscription/current", session.access_token).catch(() => null);
}

async function getTodayAppointments(session: AuthSession) {
  const today = new Date();
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);
  const search = new URLSearchParams({
    data_inicio: start.toISOString(),
    data_fim: end.toISOString()
  });

  return request<Array<{
    id: string;
    data_inicio: string;
    data_fim: string;
    status: string;
    cliente?: { nome: string };
    servicos?: Array<{ nome_servico: string }>;
  }>>(`/agenda?${search.toString()}`, session.access_token).catch(() => []);
}

async function getSnapshot(session: AuthSession): Promise<DashboardSnapshot> {
  const [subscription, todayAppointments] = await Promise.all([
    getSubscription(session),
    getTodayAppointments(session)
  ]);
  const clientesAtivos = subscription?.usage?.clientes ?? 0;
  const agendamentosMes = subscription?.usage?.agendamentos_mes ?? 0;
  const ocupacao = agendamentosMes > 0 ? Math.min(86, 42 + agendamentosMes * 2) : 0;

  return {
    salonName: session.tenant.nome_fantasia,
    userName: session.usuario.nome,
    userRole: session.usuario.tipo_usuario,
    tenantStatus: session.tenant.status,
    subscription,
    kpis: {
      faturamentoHoje: "R$ 0,00",
      clientesAtivos: String(clientesAtivos),
      ocupacao: `${ocupacao}%`,
      atendimentosHoje: String(todayAppointments.length)
    },
    appointments: todayAppointments.length
      ? todayAppointments.slice(0, 4).map((appointment) => ({
          id: appointment.id,
          time: new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(
            new Date(appointment.data_inicio)
          ),
          client: appointment.cliente?.nome || "Cliente",
          service: appointment.servicos?.[0]?.nome_servico || "Atendimento",
          status: appointment.status
        }))
      : [
          {
            id: "preview-1",
            time: "09:00",
            client: "Agenda pronta para receber clientes",
            service: "Primeiro atendimento",
            status: "Disponivel"
          },
          {
            id: "preview-2",
            time: "14:00",
            client: "Link publico preparado",
            service: "Agendamento online",
            status: "Em breve"
          }
        ],
    activities: [
      {
        id: "activity-1",
        title: "Salao criado",
        description: "Estrutura inicial do Bellory preparada para operacao.",
        time: "Agora"
      },
      {
        id: "activity-2",
        title: "Trial ativo",
        description: subscription?.trial?.days_remaining
          ? `${subscription.trial.days_remaining} dias restantes para explorar o Bellory.`
          : "Plano inicial pronto para uso.",
        time: "Hoje"
      },
      {
        id: "activity-3",
        title: "Proximos modulos",
        description: "Agenda, clientes e campanhas ja possuem area reservada no hub.",
        time: "Planejado"
      }
    ]
  };
}

export const dashboardService = {
  getSnapshot
};
