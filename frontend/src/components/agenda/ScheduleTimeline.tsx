"use client";

import { useEffect } from "react";
import type { Appointment } from "@/services/agenda.service";
import { AppointmentCard } from "@/components/agenda/AppointmentCard";
import { EmptyAgendaState } from "@/components/agenda/EmptyAgendaState";

type ScheduleTimelineProps = {
  appointments: Appointment[];
  canManage?: boolean;
  onConfirm?: (id: string) => void;
  onCancel?: (id: string, motivo: string) => void;
  onComplete?: (id: string, options?: { confirmarConclusaoAntecipada?: boolean }) => void;
  onNoShow?: (id: string) => void;
};

export function ScheduleTimeline({
  appointments,
  canManage = false,
  onConfirm,
  onCancel,
  onComplete,
  onNoShow
}: ScheduleTimelineProps) {
  useEffect(() => {
    console.log("[agenda-list-debug] timeline render", {
      rendered_count: appointments.length,
      statuses: appointments.map((appointment) => appointment.status),
      appointment_ids: appointments.map((appointment) => appointment.id)
    });
  }, [appointments]);

  if (!appointments.length) {
    return <EmptyAgendaState canCreate={canManage} />;
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
        />
      ))}
    </div>
  );
}
