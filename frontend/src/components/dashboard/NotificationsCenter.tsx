import Link from "next/link";
import { AlertTriangle, Bell, CalendarClock, CheckCircle2, Info, Megaphone, MessageCircleWarning } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import type { DashboardCampaign, DashboardNotification, DashboardSnapshot } from "@/services/dashboard.service";
import { cn } from "@/lib/utils";

type NotificationsCenterProps = {
  snapshot: DashboardSnapshot;
};

type OperationalAlertPriority = "critical" | "attention" | "info";

type OperationalAlert = {
  id: string;
  category: "Agenda" | "Clientes" | "WhatsApp" | "Serviços" | "Profissionais" | "Assinatura" | "Campanhas";
  priority: OperationalAlertPriority;
  title: string;
  description: string;
  href?: string;
  time?: string;
  sortDate?: number;
};

const priorityLabel: Record<OperationalAlertPriority, string> = {
  critical: "Crítica",
  attention: "Atenção",
  info: "Informação"
};

const priorityWeight: Record<OperationalAlertPriority, number> = {
  critical: 0,
  attention: 1,
  info: 2
};

const priorityClass: Record<OperationalAlertPriority, string> = {
  critical: "border-destructive/35 bg-destructive/5 text-destructive",
  attention: "border-amber-300 bg-amber-50 text-amber-700",
  info: "border-border bg-background/80 text-muted-foreground"
};

const priorityIcon = {
  critical: AlertTriangle,
  attention: CalendarClock,
  info: Info
};

export function NotificationsCenter({ snapshot }: NotificationsCenterProps) {
  const alerts = buildOperationalAlerts(snapshot);

  if (!alerts.length) {
    return (
      <EmptyState
        icon={Bell}
        title="Tudo em ordem"
        description="Nenhuma pendência importante no momento."
      />
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <OperationalAlertItem key={alert.id} alert={alert} />
      ))}
    </div>
  );
}

function OperationalAlertItem({ alert }: { alert: OperationalAlert }) {
  const Icon = alert.priority === "critical" && alert.category === "WhatsApp"
    ? MessageCircleWarning
    : alert.priority === "info" && alert.category === "Campanhas"
      ? Megaphone
      : alert.priority === "info"
        ? CheckCircle2
        : priorityIcon[alert.priority];
  const content = (
    <div className={cn("rounded-[1.15rem] border p-3 transition hover:border-primary/30", priorityClass[alert.priority])}>
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-white/80">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em]">
              {priorityLabel[alert.priority]}
            </span>
            <span className="text-xs font-semibold">{alert.category}</span>
            {alert.time ? <span className="text-xs opacity-80">{alert.time}</span> : null}
          </div>
          <p className="mt-2 min-w-0 break-words font-bold text-foreground">{alert.title}</p>
          <p className="mt-1 break-words text-sm leading-6 text-muted-foreground">{alert.description}</p>
        </div>
      </div>
    </div>
  );

  if (!alert.href) return content;

  return (
    <Link href={alert.href} className="block focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2">
      {content}
    </Link>
  );
}

function buildOperationalAlerts(snapshot: DashboardSnapshot): OperationalAlert[] {
  const alerts: OperationalAlert[] = [];
  const operational = snapshot.operational;

  if (operational?.overview.pendingConfirmation) {
    alerts.push({
      id: "agenda-pending-confirmation",
      category: "Agenda",
      priority: "critical",
      title: `${operational.overview.pendingConfirmation} atendimento(s) aguardando confirmação do estabelecimento`,
      description: "Revise as confirmações pendentes para manter a agenda do dia fluindo.",
      href: "/agenda"
    });
  }

  if (operational?.overview.inProgressToday) {
    alerts.push({
      id: "agenda-in-progress",
      category: "Agenda",
      priority: "attention",
      title: `${operational.overview.inProgressToday} atendimento(s) em andamento agora`,
      description: "Acompanhe o atendimento atual e conclua o registro quando finalizar.",
      href: "/agenda"
    });
  }

  if (operational?.whatsapp.errors) {
    alerts.push({
      id: "whatsapp-errors",
      category: "WhatsApp",
      priority: "critical",
      title: `${operational.whatsapp.errors} erro(s) de WhatsApp hoje`,
      description: "Mensagens com falha podem afetar confirmações, lembretes e comunicação com clientes.",
      href: "/campanhas"
    });
  }

  if (operational?.whatsapp.pending) {
    alerts.push({
      id: "whatsapp-pending",
      category: "WhatsApp",
      priority: "attention",
      title: `${operational.whatsapp.pending} mensagem(ns) pendente(s) hoje`,
      description: "Acompanhe as mensagens pendentes antes dos próximos atendimentos.",
      href: "/campanhas"
    });
  }

  if (operational?.clients.withNoShowThisMonth) {
    alerts.push({
      id: "clients-no-show",
      category: "Clientes",
      priority: "attention",
      title: `${operational.clients.withNoShowThisMonth} cliente(s) que não compareceram no mês`,
      description: "Use este sinal para revisar confirmações e abordagem de relacionamento.",
      href: "/clientes"
    });
  }

  const trial = snapshot.subscription?.trial;
  if (trial?.expired) {
    alerts.push({
      id: "subscription-expired",
      category: "Assinatura",
      priority: "critical",
      title: "Trial expirado",
      description: "Regularize a assinatura para evitar bloqueios na operação.",
      href: "/configuracoes/assinatura"
    });
  } else if (typeof trial?.days_remaining === "number" && trial.days_remaining <= 3) {
    alerts.push({
      id: "subscription-ending",
      category: "Assinatura",
      priority: "attention",
      title: `Trial termina em ${trial.days_remaining} dia(s)`,
      description: "Revise o plano antes do fim do período de teste.",
      href: "/configuracoes/assinatura"
    });
  }

  alerts.push(...buildCampaignAlerts(snapshot.activity.campaigns));
  alerts.push(...buildStoredNotificationAlerts(snapshot.activity.notifications));

  return alerts.sort((a, b) => {
    const byPriority = priorityWeight[a.priority] - priorityWeight[b.priority];
    if (byPriority !== 0) return byPriority;
    return (a.sortDate || Number.MAX_SAFE_INTEGER) - (b.sortDate || Number.MAX_SAFE_INTEGER);
  });
}

function buildCampaignAlerts(campaigns: DashboardCampaign[]): OperationalAlert[] {
  return campaigns.flatMap((campaign) => {
    const status = normalizeText(campaign.status);
    const hasFailure = ["erro", "falha", "failed", "error"].some((term) => status.includes(term));
    const needsAction = ["pendente", "aprovacao", "revisao", "bloquead"].some((term) => status.includes(term));

    if (!hasFailure && !needsAction) return [];

    return [{
      id: `campaign-${campaign.id}`,
      category: "Campanhas",
      priority: hasFailure ? "critical" : "attention",
      title: campaign.title,
      description: campaign.description || "Campanha precisa de revisão operacional.",
      href: "/campanhas",
      sortDate: getDateTime(campaign.starts_at)
    } satisfies OperationalAlert];
  });
}

function buildStoredNotificationAlerts(notifications: DashboardNotification[]): OperationalAlert[] {
  return notifications
    .filter((notification) => notification.read !== true)
    .map((notification) => {
      const text = normalizeText(`${notification.type} ${notification.title} ${notification.description}`);
      const priority: OperationalAlertPriority = ["erro", "falha", "bloque", "expir"].some((term) => text.includes(term))
        ? "critical"
        : ["pendente", "aguard", "revis", "aten"].some((term) => text.includes(term))
          ? "attention"
          : "info";

      return {
        id: `stored-${notification.id}`,
        category: resolveNotificationCategory(text),
        priority,
        title: notification.title,
        description: notification.description,
        time: notification.time,
        sortDate: getDateTime(notification.time)
      };
    });
}

function resolveNotificationCategory(text: string): OperationalAlert["category"] {
  if (text.includes("whatsapp")) return "WhatsApp";
  if (text.includes("campanh")) return "Campanhas";
  if (text.includes("servic")) return "Serviços";
  if (text.includes("profissional") || text.includes("equipe")) return "Profissionais";
  if (text.includes("cliente")) return "Clientes";
  if (text.includes("assinatura") || text.includes("trial") || text.includes("plano")) return "Assinatura";
  return "Agenda";
}

function normalizeText(value: string | null | undefined) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getDateTime(value: string | null | undefined) {
  if (!value) return undefined;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? undefined : time;
}
