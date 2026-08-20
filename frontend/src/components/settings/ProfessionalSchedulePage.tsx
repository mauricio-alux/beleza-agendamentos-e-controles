"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { SettingsState } from "@/components/settings/SettingsState";
import { WeeklyScheduleEditor } from "@/components/settings/WeeklyScheduleEditor";
import { Button } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { useAuth } from "@/hooks/useAuth";
import { agendaService, type ProfessionalScheduleDay, type ProfessionalScheduleResponse } from "@/services/agenda.service";

type ProfessionalSchedulePageProps = {
  professionalId: string;
  backHref?: string;
};

export function ProfessionalSchedulePage({ professionalId, backHref = "/equipe" }: ProfessionalSchedulePageProps) {
  const { session, isLoading: isAuthLoading } = useAuth();
  const [data, setData] = useState<ProfessionalScheduleResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    if (!session) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await agendaService.getProfessionalSchedule(session, professionalId);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar a escala.");
    } finally {
      setIsLoading(false);
    }
  }, [professionalId, session]);

  useEffect(() => {
    if (isAuthLoading) return;
    load();
  }, [isAuthLoading, load]);

  async function save(schedules: ProfessionalScheduleDay[]) {
    if (!session) return;

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await agendaService.updateProfessionalSchedule(session, professionalId, schedules);
      setData(response);
      setSuccess("Escala do profissional atualizada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a escala.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading || isAuthLoading) {
    return <SettingsState type="loading" />;
  }

  if (error && !data) {
    return (
      <SettingsState
        type="error"
        title="Não foi possível carregar a agenda do profissional"
        description={error}
        onRetry={load}
      />
    );
  }

  if (!data) {
    return <SettingsState type="empty" title="Profissional nao encontrado" />;
  }

  const professionalName = data.profissional.nome_publico || data.profissional.cargo || "Profissional";

  return (
    <section className="space-y-5">
      <div className="rounded-[1.75rem] border border-white/80 bg-white/82 p-5 shadow-soft backdrop-blur-xl sm:p-6">
        <Button asChild variant="ghost">
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-accent">Escala profissional</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">{professionalName}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Horários individuais prevalecem sobre o horário padrão do salão. Se não houver escala própria, a agenda usa o fallback do estabelecimento.
        </p>
      </div>

      {(error || success) ? (
        <FeedbackMessage tone={error ? "error" : "success"} message={error || success} />
      ) : null}

      <DashboardCard title="Horários semanais" description="Configure dias trabalhados, manhã, tarde e intervalos.">
        <WeeklyScheduleEditor schedules={data.schedules} isSaving={isSaving} onSave={save} />
      </DashboardCard>
    </section>
  );
}
