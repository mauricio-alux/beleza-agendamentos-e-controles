"use client";

import Link from "next/link";
import { AlertCircle, Loader2, Plus } from "lucide-react";
import { AgendaFilters } from "@/components/agenda/AgendaFilters";
import { AgendaInsights } from "@/components/agenda/AgendaInsights";
import { CalendarView } from "@/components/agenda/CalendarView";
import { OccupancyIndicator } from "@/components/agenda/OccupancyIndicator";
import { ScheduleTimeline } from "@/components/agenda/ScheduleTimeline";
import { ScheduleOptimizationHints } from "@/components/agenda/ScheduleOptimizationHints";
import { SmartSlotSuggestions } from "@/components/agenda/SmartSlotSuggestions";
import { TimeSlots } from "@/components/agenda/TimeSlots";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";
import { useAgenda } from "@/hooks/useAgenda";

export function DayAgenda() {
  const agenda = useAgenda();

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
            <h1 className="mt-1 font-display text-3xl text-foreground sm:text-4xl">Agenda Bellory</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Visualize atendimentos, encontre encaixes e crie horarios sem conflitos.
            </p>
          </div>
          <Button asChild>
            <Link href="/agenda/novo">
              <Plus className="h-4 w-4" />
              Novo agendamento
            </Link>
          </Button>
        </div>
      </section>

      {agenda.error ? (
        <div className="flex gap-3 rounded-2xl border border-primary/30 bg-secondary/80 p-4 text-sm text-foreground">
          <AlertCircle className="h-5 w-5 text-primary" />
          {agenda.error}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
        <div className="space-y-5">
          <CalendarView date={agenda.date} onChange={agenda.setDate} />
          <DashboardCard title="Filtros" description="Escolha profissional e servico para calcular slots.">
            <AgendaFilters
              meta={agenda.meta}
              professionalId={agenda.selectedProfessionalId}
              serviceId={agenda.selectedServiceId}
              onProfessionalChange={agenda.setSelectedProfessionalId}
              onServiceChange={agenda.setSelectedServiceId}
            />
          </DashboardCard>
          <DashboardCard title="Horarios sugeridos">
            <div className="space-y-5">
              <SmartSlotSuggestions slots={agenda.smartSuggestions} />
              <TimeSlots availability={agenda.availability} selectedSlot="" onSelect={() => null} />
            </div>
          </DashboardCard>
          <OccupancyIndicator analytics={agenda.analytics} />
          <AgendaInsights signals={agenda.signals} />
        </div>

        <div className="space-y-5">
          <DashboardCard title="Timeline diaria" description="Atendimentos existentes e status operacional.">
            <ScheduleTimeline
              appointments={agenda.appointments}
              onConfirm={agenda.confirmAppointment}
              onCancel={(id) => agenda.cancelAppointment(id, "Cancelado pelo painel")}
            />
          </DashboardCard>
          <ScheduleOptimizationHints analytics={agenda.analytics} />
        </div>
      </div>
    </div>
  );
}
