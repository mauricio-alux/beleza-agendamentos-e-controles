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
        description="Quando os primeiros horarios forem criados, a visao do dia aparece aqui."
        actionLabel="Novo agendamento"
      />
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((appointment) => (
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
