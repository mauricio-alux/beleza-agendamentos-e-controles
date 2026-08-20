"use client";

import { CalendarClock, Loader2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarView } from "@/components/agenda/CalendarView";
import { TimeSlots } from "@/components/agenda/TimeSlots";
import { formatDateShort, formatTime, toCurrency, toDateInput } from "@/components/agenda/date";
import { getAppointmentStatusLabel, resolveAppointmentStatus } from "@/components/agenda/status";
import { Button } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { agendaService, type Appointment, type AvailabilityResponse } from "@/services/agenda.service";

type OperationalRescheduleModalProps = {
  appointment: Appointment | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (appointmentId: string, dataInicio: string, motivo?: string) => Promise<Appointment | null>;
};

function sameMinute(left?: string | null, right?: string | null) {
  if (!left || !right) return false;
  const leftDate = new Date(left);
  const rightDate = new Date(right);

  if (Number.isNaN(leftDate.getTime()) || Number.isNaN(rightDate.getTime())) {
    return left === right;
  }

  return Math.floor(leftDate.getTime() / 60000) === Math.floor(rightDate.getTime() / 60000);
}

function getAppointmentService(appointment: Appointment | null) {
  return appointment?.servicos?.[0] || null;
}

function getAvailabilityParams(appointment: Appointment | null, date: string) {
  const service = getAppointmentService(appointment);
  const profissionalId = appointment?.profissional_id || appointment?.profissional?.id || "";
  const servicoId = service?.servico_tenant_id || service?.servico_id || service?.servico?.id || "";
  const especialidadeId = service?.especialidade_id || "";

  if (!date || !profissionalId || !servicoId) return null;

  return {
    data: date,
    profissional_id: profissionalId,
    servico_id: servicoId,
    especialidade_id: especialidadeId || undefined
  };
}

function getInitialDate(appointment: Appointment | null) {
  if (!appointment?.data_inicio) return toDateInput(new Date());
  return toDateInput(new Date(appointment.data_inicio));
}

export function OperationalRescheduleModal({
  appointment,
  open,
  onClose,
  onConfirm
}: OperationalRescheduleModalProps) {
  const { session } = useAuth();
  const [date, setDate] = useState(toDateInput(new Date()));
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const service = getAppointmentService(appointment);
  const intendedStatus = appointment?.metadata?.intended_status;
  const displayStatus = appointment
    ? resolveAppointmentStatus(appointment.status, typeof intendedStatus === "string" ? intendedStatus : undefined)
    : "";
  const isSameCurrentSlot = sameMinute(selectedSlot, appointment?.data_inicio);
  const canSubmit = Boolean(selectedSlot)
    && Boolean(date)
    && !isSameCurrentSlot
    && !error
    && !isSubmitting
    && !isLoadingSlots;
  const isConfigured = Boolean(getAvailabilityParams(appointment, date));

  const selectedSlotLabel = useMemo(() => {
    if (!selectedSlot) return "";
    return `${formatDateShort(toDateInput(new Date(selectedSlot)))} às ${formatTime(selectedSlot)}`;
  }, [selectedSlot]);

  useEffect(() => {
    if (!open || !appointment) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setDate(getInitialDate(appointment));
    setAvailability(null);
    setSelectedSlot("");
    setError("");
    setSuccess("");
    setIsLoadingSlots(false);
    setIsSubmitting(false);

    window.setTimeout(() => {
      dialogRef.current?.focus({ preventScroll: true });
    }, 0);

    return () => {
      previousFocusRef.current?.focus({ preventScroll: true });
      previousFocusRef.current = null;
    };
  }, [appointment, open]);

  function closeModal() {
    if (isSubmitting) return;
    onClose();
  }

  function selectSlot(slot: string) {
    if (isSubmitting) return;
    setError("");
    setSelectedSlot(slot);
  }

  useEffect(() => {
    if (!open || !appointment || !session) return;

    const params = getAvailabilityParams(appointment, date);
    setAvailability(null);
    setSelectedSlot("");
    setError("");

    if (!params) {
      setError("Não foi possível identificar profissional, serviço ou especialidade do atendimento.");
      return;
    }

    let active = true;
    setIsLoadingSlots(true);

    agendaService.getAvailability(session, params)
      .then((data) => {
        if (!active) return;
        setAvailability(data);
      })
      .catch((err) => {
        if (!active) return;
        setAvailability(null);
        setError(err instanceof Error ? err.message : "Não foi possível carregar horários disponíveis.");
      })
      .finally(() => {
        if (active) setIsLoadingSlots(false);
      });

    return () => {
      active = false;
    };
  }, [appointment, date, open, session]);

  if (!open || !appointment) return null;

  async function confirmReschedule() {
    if (!appointment || !session || !selectedSlot) return;

    setError("");
    setSuccess("");

    if (isSameCurrentSlot) {
      setError("Selecione uma nova data ou um novo horário para concluir o reagendamento.");
      return;
    }

    const params = getAvailabilityParams(appointment, date);
    if (!params) {
      setError("Não foi possível validar os dados do atendimento.");
      return;
    }

    setIsSubmitting(true);

    try {
      const freshAvailability = await agendaService.getAvailability(session, params);
      setAvailability(freshAvailability);

      const slotStillAvailable = freshAvailability.slots?.some((slot) => sameMinute(slot.inicio, selectedSlot));
      if (!slotStillAvailable) {
        setSelectedSlot("");
        setError("O horário selecionado não está mais disponível. Escolha outro horário.");
        setIsSubmitting(false);
        return;
      }

      const result = await onConfirm(appointment.id, selectedSlot, "Reagendado pelo painel");
      if (!result) {
        setError("Não foi possível reagendar este atendimento.");
        setIsSubmitting(false);
        return;
      }

      setSuccess("Atendimento reagendado com sucesso.");
      window.setTimeout(onClose, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível reagendar este atendimento.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/45 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="operational-reschedule-title"
        tabIndex={-1}
        className={cn(
          "grid max-h-[92vh] w-full grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-t-[1.5rem] border border-white/80 bg-white shadow-soft outline-none",
          "sm:max-w-5xl sm:rounded-[1.5rem]"
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Agendamento atual</p>
            <h2 id="operational-reschedule-title" className="mt-1 font-display text-3xl text-foreground">
              Reagendar atendimento
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Escolha uma nova data e um novo horário para este atendimento.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Fechar reagendamento"
            onClick={closeModal}
            disabled={isSubmitting}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
            <aside className="space-y-4">
              <div className="rounded-[1.25rem] border border-primary/20 bg-secondary/40 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-primary">
                  <CalendarClock className="h-4 w-4" />
                  Agendamento atual
                </div>
                <dl className="mt-4 grid gap-3 text-sm">
                  <Info label="Cliente" value={appointment.cliente?.nome || "Cliente"} />
                  <Info label="Serviço" value={service?.nome_servico || "Serviço"} />
                  <Info label="Especialidade" value={service?.nome_especialidade || service?.especialidade_id || "-"} />
                  <Info label="Profissional" value={appointment.profissional?.nome_publico || "Profissional"} />
                  <Info label="Data atual" value={formatDateShort(toDateInput(new Date(appointment.data_inicio)))} />
                  <Info label="Horário atual" value={formatTime(appointment.data_inicio)} />
                  <Info label="Duração" value={`${service?.duracao_minutos || 0} min`} />
                  <Info label="Valor" value={toCurrency(appointment.valor_total || service?.valor_servico || 0)} />
                  <Info label="Status" value={getAppointmentStatusLabel(displayStatus)} />
                </dl>
              </div>
            </aside>

            <div className="space-y-4">
              {error ? <FeedbackMessage tone="error" message={error} /> : null}
              {success ? <FeedbackMessage tone="success" message={success} /> : null}

              <CalendarView date={date} onChange={setDate} periodLabel="Novo período" />

              <div className="rounded-[1.5rem] border border-border bg-white/90 p-4">
                <h3 className="font-bold text-foreground">Horários disponíveis</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Selecione um horário livre para concluir o reagendamento.
                </p>
                <div className="mt-4">
                  <TimeSlots
                    availability={availability}
                    selectedSlot={selectedSlot}
                    onSelect={selectSlot}
                    isLoading={isLoadingSlots}
                    isConfigured={isConfigured}
                    disabled={isSubmitting}
                  />
                </div>
                {isSameCurrentSlot ? (
                  <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                    Selecione uma nova data ou um novo horário para concluir o reagendamento.
                  </p>
                ) : selectedSlotLabel ? (
                  <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                    Novo horário selecionado: {selectedSlotLabel}.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-border bg-white px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-12px_30px_rgba(0,0,0,0.06)] sm:flex-row sm:justify-end sm:px-6 sm:pb-4">
          <Button type="button" variant="outline" onClick={closeModal} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="button" onClick={confirmReschedule} disabled={!canSubmit}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
            {isSubmitting ? "Reagendando..." : "Confirmar reagendamento"}
          </Button>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white/80 px-3 py-2">
      <dt className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-semibold text-foreground">{value}</dd>
    </div>
  );
}
