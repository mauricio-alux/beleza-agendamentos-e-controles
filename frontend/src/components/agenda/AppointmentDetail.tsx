"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, ClockAlert, Loader2, UserX, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";
import { CancellationReasonModal } from "@/components/agenda/CancellationReasonModal";
import {
  EarlyCompletionConfirmation,
  isAppointmentScheduledForFuture
} from "@/components/agenda/EarlyCompletionConfirmation";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/messages";
import { hasPermission } from "@/lib/permissions";
import { authService } from "@/services/auth.service";
import { agendaService, type Appointment, type CompleteAppointmentOptions } from "@/services/agenda.service";
import { formatTime, toCurrency } from "@/components/agenda/date";
import {
  canAttendantConfirm,
  canCancelAppointment,
  canCompleteAppointment,
  canMarkNoShowAppointment,
  canMarkNoShowNow,
  getAppointmentStatusLabel,
  resolveAppointmentStatus
} from "@/components/agenda/status";
import { formatStoredPhone } from "@/utils/phone";

type AppointmentDetailProps = {
  id: string;
};

export function AppointmentDetail({ id }: AppointmentDetailProps) {
  const { session, setAuthenticatedSession } = useAuth();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [isMutating, setIsMutating] = useState(false);
  const [didSyncPermissions, setDidSyncPermissions] = useState(false);
  const [earlyCompletionCurrentAt, setEarlyCompletionCurrentAt] = useState<Date | null>(null);
  const [showCancellationReason, setShowCancellationReason] = useState(false);

  async function load(options: { silent?: boolean } = {}) {
    if (!session) return;
    if (!options.silent) setIsLoading(true);
    setLoadError("");
    try {
      setAppointment(await agendaService.getById(session, id));
    } catch (err) {
      setLoadError(getErrorMessage(err, "Não foi possível carregar os dados do agendamento."));
    } finally {
      if (!options.silent) setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, id]);

  async function runAppointmentAction(action: () => Promise<void>, fallback: string) {
    setActionError("");
    setIsMutating(true);
    try {
      await action();
      await load({ silent: true });
    } catch (err) {
      setActionError(getErrorMessage(err, fallback));
    } finally {
      setIsMutating(false);
    }
  }

  async function confirm() {
    if (!session) return;
    await runAppointmentAction(
      () => agendaService.confirm(session, id).then(() => undefined),
      "Não foi possível confirmar este agendamento."
    );
  }

  async function cancel() {
    setShowCancellationReason(true);
  }

  async function confirmCancellation(motivo: string) {
    if (!session) return;
    setShowCancellationReason(false);
    await runAppointmentAction(
      () => agendaService.cancel(session, id, motivo).then(() => undefined),
      "Não foi possível cancelar este agendamento."
    );
  }

  async function complete(options: CompleteAppointmentOptions = {}) {
    if (!session) return;
    await runAppointmentAction(
      () => agendaService.complete(session, id, "Concluído pelo painel", options).then(() => undefined),
      "Não foi possível concluir este agendamento."
    );
  }

  async function requestCompletion() {
    if (!appointment) return;

    const now = new Date();
    if (isAppointmentScheduledForFuture(appointment.data_inicio, now)) {
      setEarlyCompletionCurrentAt(now);
      return;
    }

    await complete();
  }

  async function confirmEarlyCompletion() {
    setEarlyCompletionCurrentAt(null);
    await complete({ confirmarConclusaoAntecipada: true });
  }

  async function noShow() {
    if (!session) return;
    await runAppointmentAction(
      () => agendaService.noShow(session, id, "Cliente nao compareceu").then(() => undefined),
      "Não foi possível marcar não comparecimento para este agendamento."
    );
  }

  useEffect(() => {
    if (!session || !appointment || didSyncPermissions) return;

    const intendedStatus = appointment.metadata?.intended_status;
    const isConfirmable = canAttendantConfirm(
      appointment.status,
      typeof intendedStatus === "string" ? intendedStatus : undefined
    );
    const hasConfirmPermission = hasPermission(session, "agenda.confirm")
      || hasPermission(session, "agenda.write")
      || hasPermission(session, "agenda.manage");

    if (!isConfirmable || hasConfirmPermission) return;

    let active = true;
    setDidSyncPermissions(true);

    authService.me(session.access_token)
      .then((freshContext) => {
        if (!active) return;
        setAuthenticatedSession({
          ...session,
          ...freshContext
        });
      })
      .catch(() => null);

    return () => {
      active = false;
    };
  }, [appointment, didSyncPermissions, session, setAuthenticatedSession]);

  if (isLoading) {
    return (
      <div className="grid min-h-[45vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!appointment || loadError) {
    return (
      <DashboardCard>
        <FeedbackMessage tone="error" message={loadError || "Agendamento nao encontrado."} />
      </DashboardCard>
    );
  }

  const service = appointment.servicos?.[0];
  const intendedStatus = appointment.metadata?.intended_status;
  const displayStatus = resolveAppointmentStatus(
    appointment.status,
    typeof intendedStatus === "string" ? intendedStatus : undefined
  );
  const intendedStatusValue = typeof intendedStatus === "string" ? intendedStatus : undefined;
  const displayValue = firstPositiveNumber(
    appointment.valor_total,
    service?.valor_servico,
    service?.servico?.preco
  );
  const canWriteAgenda = hasPermission(session, "agenda.write") || hasPermission(session, "agenda.manage");
  const canConfirmAgenda = canWriteAgenda || hasPermission(session, "agenda.confirm");
  const canCancelAgenda = canWriteAgenda || hasPermission(session, "agenda.cancel");
  const canCompleteAgenda = canWriteAgenda || hasPermission(session, "agenda.complete");
  const canNoShowAgenda = canWriteAgenda || hasPermission(session, "agenda.no_show");
  const shouldShowConfirm = canConfirmAgenda
    && canAttendantConfirm(appointment.status, intendedStatusValue);
  const canNoShowByStatus = canMarkNoShowAppointment(appointment.status, intendedStatusValue);
  const canNoShowAtCurrentTime = canMarkNoShowNow(appointment.status, appointment.data_inicio, intendedStatusValue);
  const noShowUnavailableMessage = "Esta ação só fica disponível após o início do atendimento.";
  const cancellationReason = getCancellationReason(appointment);

  if (process.env.NODE_ENV !== "production") {
    console.debug("[agenda-permission-debug] appointment detail actions", {
      appointment_id: appointment.id,
      status: appointment.status,
      intended_status: typeof intendedStatus === "string" ? intendedStatus : null,
      session_role: session?.tipo_usuario || session?.usuario?.tipo_usuario || null,
      tenant_id: session?.tenant_id || session?.tenant?.id || null,
      permissions: session?.permissions || [],
      permission_context_permissions: session?.permissionContext?.permissions || [],
      has_agenda_confirm: hasPermission(session, "agenda.confirm"),
      can_write_agenda: canWriteAgenda,
      can_confirm_agenda: canConfirmAgenda,
      can_attendant_confirm: canAttendantConfirm(appointment.status, intendedStatusValue),
      can_no_show_by_status: canNoShowByStatus,
      can_no_show_at_current_time: canNoShowAtCurrentTime,
      should_show_confirm: shouldShowConfirm
    });
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-[1.75rem] border border-white/80 bg-white/86 p-5 shadow-soft backdrop-blur sm:p-6">
        <Button asChild variant="outline">
          <Link href="/agenda">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-accent">Agendamento</p>
        <h1 className="mt-1 font-display text-3xl text-foreground sm:text-4xl">
          {appointment.cliente?.nome || "Cliente"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {formatTime(appointment.data_inicio)} ate {formatTime(appointment.data_fim)} · {service?.nome_servico || "Servico"}
        </p>
      </section>

      {actionError ? (
        <FeedbackMessage
          tone="error"
          title="Não foi possível concluir a ação"
          message={actionError}
        />
      ) : null}

      <DashboardCard title="Resumo do atendimento">
        <div className="grid gap-3 sm:grid-cols-2">
          <Info label="Status" value={getAppointmentStatusLabel(displayStatus)} />
          <Info label="Valor" value={toCurrency(displayValue)} />
          <Info label="Profissional" value={appointment.profissional?.nome_publico || "Profissional"} />
          <Info label="WhatsApp" value={formatStoredPhone(appointment.cliente?.telefone) || "-"} />
          {cancellationReason ? (
            <Info label="Motivo do cancelamento" value={cancellationReason} className="sm:col-span-2" />
          ) : null}
        </div>
        {appointment.operational_alert ? (
          <div className="mt-5 flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <span className="inline-flex items-center gap-2 font-bold">
              <ClockAlert className="h-4 w-4" />
              {appointment.operational_alert.message}
            </span>
            <span>
              {appointment.operational_alert.remaining_minutes > 0
                ? `${appointment.operational_alert.remaining_minutes} minutos restantes antes da conclusao automatica.`
                : "Este atendimento ja esta apto para conclusao automatica."}
            </span>
          </div>
        ) : null}
        {canConfirmAgenda || canCancelAgenda || canCompleteAgenda || canNoShowAgenda ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {shouldShowConfirm ? (
              <Button type="button" variant="accent" onClick={confirm} disabled={isMutating}>
                <CheckCircle2 className="h-4 w-4" />
                Confirmar
              </Button>
            ) : null}
            {canCancelAgenda && canCancelAppointment(appointment.status) ? (
              <Button type="button" variant="outline" onClick={cancel} disabled={isMutating}>
                <XCircle className="h-4 w-4" />
                Cancelar
              </Button>
            ) : null}
            {canCompleteAgenda && canCompleteAppointment(appointment.status, intendedStatusValue) ? (
              <Button type="button" variant="accent" onClick={requestCompletion} disabled={isMutating}>
                <CheckCircle2 className="h-4 w-4" />
                Concluir Agora
              </Button>
            ) : null}
            {canNoShowAgenda && canNoShowByStatus ? (
              <span title={!canNoShowAtCurrentTime ? noShowUnavailableMessage : undefined}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={noShow}
                  disabled={isMutating || !canNoShowAtCurrentTime}
                  aria-label={!canNoShowAtCurrentTime ? `Cliente Nao Compareceu. ${noShowUnavailableMessage}` : undefined}
                >
                  <UserX className="h-4 w-4" />
                  Cliente Nao Compareceu
                </Button>
              </span>
            ) : null}
          </div>
        ) : null}
      </DashboardCard>
      {earlyCompletionCurrentAt ? (
        <EarlyCompletionConfirmation
          scheduledAt={appointment.data_inicio}
          currentAt={earlyCompletionCurrentAt}
          onCancel={() => setEarlyCompletionCurrentAt(null)}
          onConfirm={confirmEarlyCompletion}
        />
      ) : null}
      <CancellationReasonModal
        open={showCancellationReason}
        isSubmitting={isMutating}
        onClose={() => setShowCancellationReason(false)}
        onConfirm={confirmCancellation}
      />
    </div>
  );
}

function firstPositiveNumber(...values: Array<number | null | undefined>) {
  const value = values.find((item) => Number(item) > 0);
  return value === undefined ? 0 : Number(value);
}

function getCancellationReason(appointment: Appointment) {
  if (appointment.status !== "cancelado") return "";

  const reason = appointment.metadata?.motivo_cancelamento || appointment.metadata?.motivo;
  if (typeof reason !== "string") return "";

  const normalizedReason = reason.trim();
  if (!normalizedReason || normalizedReason === "Cancelado pelo painel") return "";

  return normalizedReason;
}

function Info({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-background/80 p-4 ${className}`}>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-bold text-foreground">{value}</p>
    </div>
  );
}
