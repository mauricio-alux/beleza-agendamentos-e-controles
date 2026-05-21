import Link from "next/link";
import { CalendarCheck, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTime, toCurrency } from "@/components/agenda/date";
import type { Appointment } from "@/services/agenda.service";

type AppointmentCardProps = {
  appointment: Appointment;
  onConfirm?: (id: string) => void;
  onCancel?: (id: string) => void;
};

const statusLabel: Record<string, string> = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  cancelado: "Cancelado",
  concluido: "Concluido",
  no_show: "No-show",
  reagendado: "Reagendado"
};

export function AppointmentCard({ appointment, onConfirm, onCancel }: AppointmentCardProps) {
  const service = appointment.servicos?.[0];

  return (
    <article className="rounded-[1.35rem] border border-border bg-white/90 p-4 shadow-sm transition hover:border-primary/35 hover:shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-primary">
            <CalendarCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="text-base font-bold text-foreground">
              {formatTime(appointment.data_inicio)} · {appointment.cliente?.nome || "Cliente"}
            </p>
            <p className="text-sm text-muted-foreground">
              {service?.nome_servico || "Servico"} · {appointment.profissional?.nome_publico || "Profissional"}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">
          {statusLabel[appointment.status] || appointment.status}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{toCurrency(appointment.valor_total)}</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/agenda/${appointment.id}`}>Ver</Link>
          </Button>
          {appointment.status === "pendente" && onConfirm ? (
            <Button type="button" variant="accent" onClick={() => onConfirm(appointment.id)}>
              <CheckCircle2 className="h-4 w-4" />
              Confirmar
            </Button>
          ) : null}
          {appointment.status !== "cancelado" && onCancel ? (
            <Button type="button" variant="ghost" onClick={() => onCancel(appointment.id)}>
              <XCircle className="h-4 w-4" />
              Cancelar
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
