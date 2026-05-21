import type { Appointment } from "@/services/agenda.service";
import { AppointmentCard } from "@/components/agenda/AppointmentCard";
import { EmptyAgendaState } from "@/components/agenda/EmptyAgendaState";

type ScheduleTimelineProps = {
  appointments: Appointment[];
  onConfirm?: (id: string) => void;
  onCancel?: (id: string) => void;
};

export function ScheduleTimeline({ appointments, onConfirm, onCancel }: ScheduleTimelineProps) {
  if (!appointments.length) {
    return <EmptyAgendaState />;
  }

  return (
    <div className="space-y-3">
      {appointments.map((appointment) => (
        <AppointmentCard
          key={appointment.id}
          appointment={appointment}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      ))}
    </div>
  );
}
