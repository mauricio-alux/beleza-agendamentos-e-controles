import { Clock3 } from "lucide-react";
import type { DashboardAppointment } from "@/services/dashboard.service";
import { getAppointmentStatusLabel } from "@/components/agenda/status";
import { EmptyState } from "@/components/dashboard/EmptyState";

type AgendaPreviewProps = {
  appointments: DashboardAppointment[];
};

export function AgendaPreview({ appointments }: AgendaPreviewProps) {
  if (!appointments.length) {
    return (
      <EmptyState
        icon={Clock3}
        title="Agenda pronta para operar"
        description="Quando os primeiros horários forem criados, a visão do dia aparece aqui."
        actionLabel="Novo agendamento"
        actionHref="/agenda/novo"
      />
    );
  }

  const orderedAppointments = orderTodayAppointments(appointments);

  return (
    <div className="space-y-3">
      {orderedAppointments.map((appointment) => (
        <div key={appointment.id} className="flex items-center gap-3 rounded-2xl border border-border bg-background/80 p-3">
          <span className="grid h-12 w-12 flex-none place-items-center rounded-full bg-secondary text-primary">
            <Clock3 className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-foreground">{appointment.time}</p>
            <p className="truncate text-sm text-muted-foreground">{appointment.client}</p>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-foreground">{appointment.service}</p>
            <p className="text-xs text-accent">{getAppointmentStatusLabel(appointment.status)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function orderTodayAppointments(appointments: DashboardAppointment[]) {
  const now = Date.now();

  return [...appointments].sort((a, b) => {
    const aTime = getAppointmentTime(a);
    const bTime = getAppointmentTime(b);
    const aPast = aTime < now;
    const bPast = bTime < now;

    if (aPast !== bPast) return aPast ? 1 : -1;
    return aPast ? bTime - aTime : aTime - bTime;
  });
}

function getAppointmentTime(appointment: DashboardAppointment) {
  if (appointment.starts_at) {
    const parsed = new Date(appointment.starts_at).getTime();
    if (!Number.isNaN(parsed)) return parsed;
  }

  const [hour = "0", minute = "0"] = appointment.time.split(":");
  const fallback = new Date();
  fallback.setHours(Number(hour), Number(minute), 0, 0);
  return fallback.getTime();
}
