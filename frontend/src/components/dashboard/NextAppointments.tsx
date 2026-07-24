import { CalendarDays } from "lucide-react";
import type { DashboardAppointment } from "@/services/dashboard.service";
import { EmptyState } from "@/components/dashboard/EmptyState";

type NextAppointmentsProps = {
  appointments: DashboardAppointment[];
};

export function NextAppointments({ appointments }: NextAppointmentsProps) {
  if (!appointments.length) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Nenhum atendimento confirmado"
        description="Assim que a agenda for ativada, os proximos horarios aparecem aqui."
        actionLabel="Novo agendamento"
      />
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((appointment) => (
        <div key={appointment.id} className="rounded-2xl border border-border bg-background/80 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="min-w-0">
              <p className="truncate font-bold text-foreground">{appointment.client}</p>
              <p className="mt-1 truncate text-sm text-muted-foreground">{appointment.service}</p>
            </div>
            <span className="w-fit max-w-full rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">
              {appointment.dateTime || appointment.time}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{appointment.professional || "Profissional definido"}</p>
        </div>
      ))}
    </div>
  );
}
