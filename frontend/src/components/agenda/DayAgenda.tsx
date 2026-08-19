"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { AgendaFilters } from "@/components/agenda/AgendaFilters";
import { AgendaInsights } from "@/components/agenda/AgendaInsights";
import { CalendarView } from "@/components/agenda/CalendarView";
import { OccupancyIndicator } from "@/components/agenda/OccupancyIndicator";
import { OperationalRescheduleModal } from "@/components/agenda/OperationalRescheduleModal";
import { ScheduleTimeline } from "@/components/agenda/ScheduleTimeline";
import { ScheduleOptimizationHints } from "@/components/agenda/ScheduleOptimizationHints";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { formatAgendaRange, formatDateShort, isTodayDateInput } from "@/components/agenda/date";
import { useAgenda } from "@/hooks/useAgenda";
import { useAuth } from "@/hooks/useAuth";
import { APP_BRAND } from "@/config/app-brand";
import { hasPermission } from "@/lib/permissions";
import type { Appointment } from "@/services/agenda.service";

export function DayAgenda() {
  const [rescheduleAppointment, setRescheduleAppointment] = useState<Appointment | null>(null);
  const searchParams = useSearchParams();
  const initialDate = searchParams.get("data");
  const initialProfessionalId = searchParams.get("profissional_id");
  const agenda = useAgenda({
    manualSearch: true,
    loadInsightsInManualSearch: true,
    initialDate,
    initialProfessionalId
  });
  const { session } = useAuth();
  const tenantName = session?.tenant?.nome_fantasia?.trim() || APP_BRAND.appName;
  const canWriteAgenda = hasPermission(session, "agenda.write") || hasPermission(session, "agenda.manage");
  const canConfirmAgenda = canWriteAgenda || hasPermission(session, "agenda.confirm");
  const canCancelAgenda = canWriteAgenda || hasPermission(session, "agenda.cancel");
  const canCompleteAgenda = canWriteAgenda || hasPermission(session, "agenda.complete");
  const canNoShowAgenda = canWriteAgenda || hasPermission(session, "agenda.no_show");
  const canRescheduleAgenda = canWriteAgenda || hasPermission(session, "agenda.reschedule");
  const selectedDateTitle = isTodayDateInput(agenda.appliedDate)
    ? `Hoje - ${formatDateShort(agenda.appliedDate)}`
    : `Agenda de ${formatDateShort(agenda.appliedDate)}`;
  const hasActiveTimelineFilters = Boolean(
    agenda.appliedFilters.selectedProfessionalId
    || agenda.appliedFilters.selectedServiceId
    || agenda.appliedFilters.selectedSpecialtyId
    || !agenda.appliedFilters.showCanceledAppointments
  );

  if (agenda.isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-white px-5 py-4 text-sm font-semibold text-muted-foreground shadow-soft">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Carregando agenda inteligente...
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-[1.75rem] border border-white/80 bg-white/86 p-5 shadow-soft backdrop-blur sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Motor inteligente</p>
            <h1 className="mt-1 font-display text-3xl text-foreground sm:text-4xl">Agenda {tenantName}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Consulte atendimentos, acompanhe pendências e crie horários sem conflitos.
            </p>
            <p className="mt-3 inline-flex rounded-full border border-border bg-white/80 px-4 py-2 text-sm font-bold text-foreground">
              {selectedDateTitle}
            </p>
            <p className="mt-2 text-xs font-semibold text-muted-foreground">
              Período consultado: {formatAgendaRange(agenda.appliedDate)} (America/Sao_Paulo)
            </p>
          </div>
          {canWriteAgenda ? (
            <Button asChild>
              <Link href="/agenda/novo">
                <Plus className="h-4 w-4" />
                Novo agendamento
              </Link>
            </Button>
          ) : null}
        </div>
      </section>

      {agenda.error ? <FeedbackMessage tone="error" message={agenda.error} /> : null}

      <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
        <div className="contents xl:block xl:space-y-5">
          <div className="order-1">
            <CalendarView date={agenda.date} onChange={agenda.setDate} periodLabel="Período em edição" />
          </div>
          <div className="order-2">
            <DashboardCard title="Filtros" description="Refine a consulta por profissional, serviço e especialidade.">
              <AgendaFilters
                meta={agenda.meta}
                professionalId={agenda.selectedProfessionalId}
                serviceId={agenda.selectedServiceId}
                specialtyId={agenda.selectedSpecialtyId}
                onProfessionalChange={agenda.setSelectedProfessionalId}
                onServiceChange={agenda.setSelectedServiceId}
                onSpecialtyChange={agenda.setSelectedSpecialtyId}
                allowAllProfessionals={!agenda.isPersonalAgenda}
                onSearch={agenda.applyFilters}
                onClear={agenda.clearFilters}
                isSearching={agenda.isRefreshingAppointments}
                hasPendingChanges={agenda.hasPendingFilterChanges}
              />
              <label className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-white/80 px-4 py-3 text-sm font-semibold text-foreground">
                <span>Exibir cancelados</span>
                <input
                  type="checkbox"
                  checked={agenda.showCanceledAppointments}
                  onChange={(event) => agenda.setShowCanceledAppointments(event.target.checked)}
                  className="h-5 w-5 accent-primary"
                />
              </label>
            </DashboardCard>
          </div>
          <div className="order-4">
            <AgendaInsights signals={agenda.signals} />
          </div>
          <div className="order-5">
            <OccupancyIndicator analytics={agenda.analytics} />
          </div>
        </div>

        <div className="contents xl:block xl:space-y-5">
          <div className="order-3">
            <DashboardCard title="Agenda do dia" description="Atendimentos existentes e status operacional.">
              <ScheduleTimeline
                appointments={agenda.appointments}
                date={agenda.appliedDate}
                hasActiveFilters={hasActiveTimelineFilters}
                isLoading={agenda.isRefreshingAppointments}
                canManage={canWriteAgenda}
                canReschedule={canRescheduleAgenda}
                onConfirm={canConfirmAgenda ? agenda.confirmAppointment : undefined}
                onCancel={canCancelAgenda ? (id, motivo) => agenda.cancelAppointment(id, motivo) : undefined}
                onComplete={canCompleteAgenda ? (id, options) => agenda.completeAppointment(id, "Concluído pelo painel", options) : undefined}
                onNoShow={canNoShowAgenda ? (id) => agenda.noShowAppointment(id, "Cliente nao compareceu") : undefined}
                onReschedule={canRescheduleAgenda ? setRescheduleAppointment : undefined}
              />
            </DashboardCard>
          </div>
          <div className="order-6">
            <ScheduleOptimizationHints analytics={agenda.analytics} />
          </div>
        </div>
      </div>
      <OperationalRescheduleModal
        open={Boolean(rescheduleAppointment)}
        appointment={rescheduleAppointment}
        onClose={() => setRescheduleAppointment(null)}
        onConfirm={agenda.rescheduleAppointment}
      />
    </div>
  );
}
