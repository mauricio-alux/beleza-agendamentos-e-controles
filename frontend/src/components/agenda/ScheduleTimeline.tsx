"use client";

import { Loader2 } from "lucide-react";
import type { Appointment } from "@/services/agenda.service";
import { AppointmentCard } from "@/components/agenda/AppointmentCard";
import { EmptyAgendaState } from "@/components/agenda/EmptyAgendaState";

type ScheduleTimelineProps = {
  appointments: Appointment[];
  date: string;
  hasActiveFilters?: boolean;
  isLoading?: boolean;
  canManage?: boolean;
  onConfirm?: (id: string) => void;
  onCancel?: (id: string, motivo: string) => void;
  onComplete?: (id: string, options?: { confirmarConclusaoAntecipada?: boolean }) => void;
  onNoShow?: (id: string) => void;
  onReschedule?: (appointment: Appointment) => void;
  canReschedule?: boolean;
};

export function ScheduleTimeline({
  appointments,
  date,
  hasActiveFilters = false,
  isLoading = false,
  canManage = false,
  onConfirm,
  onCancel,
  onComplete,
  onNoShow,
  onReschedule,
  canReschedule = false
}: ScheduleTimelineProps) {
  if (isLoading) {
    return (
      <div className="grid min-h-48 place-items-center rounded-[1.5rem] border border-dashed border-border bg-white/80 p-8 text-center">
        <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Atualizando atendimentos da data selecionada...
        </div>
      </div>
    );
  }

  if (!appointments.length) {
    return <EmptyAgendaState canCreate={canManage} date={date} hasActiveFilters={hasActiveFilters} />;
  }

  return (
    <div className="space-y-3">
      {appointments.map((appointment) => (
        <AppointmentCard
          key={appointment.id}
          appointment={appointment}
          onConfirm={onConfirm}
          onCancel={onCancel}
          onComplete={onComplete}
          onNoShow={onNoShow}
          onReschedule={onReschedule}
          canReschedule={canReschedule}
        />
      ))}
    </div>
  );
}
