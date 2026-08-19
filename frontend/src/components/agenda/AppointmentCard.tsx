"use client";

import { CalendarCheck, CalendarClock, CheckCircle2, ClockAlert, MoreHorizontal, UserX, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CancellationReasonModal } from "@/components/agenda/CancellationReasonModal";
import {
  EarlyCompletionConfirmation,
  isAppointmentScheduledForFuture
} from "@/components/agenda/EarlyCompletionConfirmation";
import { formatTime, toCurrency } from "@/components/agenda/date";
import {
  canAttendantConfirm,
  canCancelAppointment,
  canCompleteAppointment,
  canMarkNoShowAppointment,
  canMarkNoShowNow,
  canRescheduleAppointment,
  getAppointmentStatusLabel,
  resolveAppointmentStatus
} from "@/components/agenda/status";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/services/agenda.service";

type AppointmentCardProps = {
  appointment: Appointment;
  onConfirm?: (id: string) => void;
  onCancel?: (id: string, motivo: string) => void;
  onComplete?: (id: string, options?: { confirmarConclusaoAntecipada?: boolean }) => void;
  onNoShow?: (id: string) => void;
  onReschedule?: (appointment: Appointment) => void;
  canReschedule?: boolean;
};

export function AppointmentCard({
  appointment,
  onConfirm,
  onCancel,
  onComplete,
  onNoShow,
  onReschedule,
  canReschedule = false
}: AppointmentCardProps) {
  const [earlyCompletionCurrentAt, setEarlyCompletionCurrentAt] = useState<Date | null>(null);
  const [showCancellationReason, setShowCancellationReason] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const service = appointment.servicos?.[0];
  const intendedStatus = appointment.metadata?.intended_status;
  const displayStatus = resolveAppointmentStatus(
    appointment.status,
    typeof intendedStatus === "string" ? intendedStatus : undefined
  );
  const displayValue = firstPositiveNumber(
    appointment.valor_total,
    service?.valor_servico,
    service?.servico?.preco
  );
  const intendedStatusValue = typeof intendedStatus === "string" ? intendedStatus : undefined;
  const canNoShowByStatus = canMarkNoShowAppointment(appointment.status, intendedStatusValue);
  const canNoShowAtCurrentTime = canMarkNoShowNow(appointment.status, appointment.data_inicio, intendedStatusValue);
  const canOpenReschedule = canReschedule
    && canRescheduleAppointment(appointment.status, intendedStatusValue)
    && Boolean(onReschedule);
  const isCanceled = appointment.status === "cancelado";
  const noShowUnavailableMessage = "Esta ação só fica disponível após o início do atendimento.";

  function requestCompletion() {
    if (!onComplete) return;

    const now = new Date();
    if (isAppointmentScheduledForFuture(appointment.data_inicio, now)) {
      setEarlyCompletionCurrentAt(now);
      return;
    }

    onComplete(appointment.id);
  }

  function requestCancellation() {
    if (!onCancel) return;
    setShowCancellationReason(true);
  }

  function confirmCancellation(motivo: string) {
    if (!onCancel) return;
    setShowCancellationReason(false);
    onCancel(appointment.id, motivo);
  }

  function confirmEarlyCompletion() {
    if (!onComplete) return;
    setEarlyCompletionCurrentAt(null);
    onComplete(appointment.id, { confirmarConclusaoAntecipada: true });
  }

  return (
    <article
      className={cn(
        "rounded-[1.35rem] border border-border bg-white/90 p-4 shadow-sm transition hover:border-primary/35 hover:shadow-soft",
        isCanceled && "border-rose-200 bg-rose-50/75 opacity-85 hover:border-rose-300"
      )}
      aria-label={isCanceled ? "Agendamento cancelado" : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-3">
          <span
            className={cn(
              "grid h-11 w-11 place-items-center rounded-full bg-secondary text-primary",
              isCanceled && "bg-rose-100 text-rose-600"
            )}
          >
            {isCanceled ? <XCircle className="h-5 w-5" /> : <CalendarCheck className="h-5 w-5" />}
          </span>
          <div>
            <p className={cn("text-base font-bold text-foreground", isCanceled && "text-rose-950")}>
              {formatTime(appointment.data_inicio)} · {appointment.cliente?.nome || "Cliente"}
            </p>
            <p className="text-sm text-muted-foreground">
              {service?.nome_servico || "Serviço"} · {appointment.profissional?.nome_publico || "Profissional"}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary",
            isCanceled && "bg-rose-100 text-rose-700"
          )}
        >
          {getAppointmentStatusLabel(displayStatus)}
        </span>
      </div>
      {isCanceled ? (
        <p className="mt-3 rounded-2xl border border-rose-200 bg-white/70 px-3 py-2 text-xs font-semibold text-rose-700">
          Atendimento cancelado. Mantido na agenda apenas para consulta histórica.
        </p>
      ) : null}
      {appointment.operational_alert ? (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2 font-semibold">
            <ClockAlert className="h-4 w-4" />
            {appointment.operational_alert.message}
          </span>
          <span className="text-xs font-semibold uppercase">
            {appointment.operational_alert.remaining_minutes > 0
              ? `${appointment.operational_alert.remaining_minutes} min para conclusão automática`
              : "Conclusão automática pendente"}
          </span>
        </div>
      ) : null}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-foreground">{toCurrency(displayValue)}</p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
          <PrimaryAction
            appointmentId={appointment.id}
            status={appointment.status}
            intendedStatus={intendedStatusValue}
            onConfirm={onConfirm}
            onComplete={onComplete ? requestCompletion : undefined}
          />
          <Button
            type="button"
            variant="outline"
            className="sm:hidden"
            onClick={() => setShowMobileActions((current) => !current)}
            aria-expanded={showMobileActions}
          >
            <MoreHorizontal className="h-4 w-4" />
            Mais ações
          </Button>
          <div className={cn("grid gap-2 sm:flex sm:flex-wrap", !showMobileActions && "hidden sm:flex")}>
            <Button asChild variant="outline">
              <Link href={`/agenda/${appointment.id}`}>Ver</Link>
            </Button>
            {canOpenReschedule ? (
              <Button
                type="button"
                variant="outline"
                title="Reagendar atendimento"
                aria-label="Reagendar atendimento"
                onClick={() => onReschedule?.(appointment)}
              >
                <CalendarClock className="h-4 w-4" />
                Reagendar
              </Button>
            ) : null}
            {canCancelAppointment(appointment.status) && onCancel ? (
              <Button type="button" variant="ghost" onClick={requestCancellation}>
                <XCircle className="h-4 w-4" />
                Cancelar
              </Button>
            ) : null}
            {canNoShowByStatus && onNoShow ? (
              <span title={!canNoShowAtCurrentTime ? noShowUnavailableMessage : undefined}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => canNoShowAtCurrentTime && onNoShow(appointment.id)}
                  disabled={!canNoShowAtCurrentTime}
                  aria-label={!canNoShowAtCurrentTime ? `Cliente não compareceu. ${noShowUnavailableMessage}` : undefined}
                >
                  <UserX className="h-4 w-4" />
                  Cliente não compareceu
                </Button>
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <CancellationReasonModal
        open={showCancellationReason}
        onClose={() => setShowCancellationReason(false)}
        onConfirm={confirmCancellation}
      />
      {earlyCompletionCurrentAt ? (
        <EarlyCompletionConfirmation
          scheduledAt={appointment.data_inicio}
          currentAt={earlyCompletionCurrentAt}
          onCancel={() => setEarlyCompletionCurrentAt(null)}
          onConfirm={confirmEarlyCompletion}
        />
      ) : null}
    </article>
  );
}

function firstPositiveNumber(...values: Array<number | null | undefined>) {
  const value = values.find((item) => Number(item) > 0);
  return value === undefined ? 0 : Number(value);
}

function PrimaryAction({
  appointmentId,
  status,
  intendedStatus,
  onConfirm,
  onComplete
}: {
  appointmentId: string;
  status: Appointment["status"];
  intendedStatus?: string;
  onConfirm?: (id: string) => void;
  onComplete?: () => void;
}) {
  if (canAttendantConfirm(status, intendedStatus) && onConfirm) {
    return (
      <Button type="button" variant="accent" onClick={() => onConfirm(appointmentId)}>
        <CheckCircle2 className="h-4 w-4" />
        Confirmar
      </Button>
    );
  }

  if (canCompleteAppointment(status, intendedStatus) && onComplete) {
    return (
      <Button type="button" variant="accent" onClick={onComplete}>
        <CheckCircle2 className="h-4 w-4" />
        Concluir
      </Button>
    );
  }

  return null;
}
