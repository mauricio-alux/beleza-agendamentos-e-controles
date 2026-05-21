"use client";

import { CheckCircle2, ExternalLink } from "lucide-react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { SetupCard } from "@/components/onboarding/SetupCard";

export function CompletionCard() {
  const { data, settings } = useOnboarding();
  const selectedServices = data.services.filter((service) => service.selected);

  return (
    <SetupCard
      title="Seu salao esta pronto para entrar em operacao"
      description="Revise o resumo e finalize para seguir ao painel do Bellory."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Salao</p>
          <p className="mt-2 text-lg font-bold text-foreground">{data.nome_fantasia || settings?.nome_fantasia}</p>
          <p className="text-sm text-muted-foreground">{data.cidade || "Cidade"} {data.estado ? `- ${data.estado}` : ""}</p>
        </div>
        <div className="rounded-2xl border border-border bg-background p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Agenda</p>
          <p className="mt-2 text-lg font-bold text-foreground">
            {data.horario_inicio_padrao} as {data.horario_fim_padrao}
          </p>
          <p className="text-sm text-muted-foreground">Intervalos de {data.intervalo_agendamento} minutos</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-primary/20 bg-secondary/70 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <p className="font-semibold text-foreground">{selectedServices.length} servicos iniciais selecionados</p>
            <p className="text-sm leading-6 text-muted-foreground">
              {selectedServices.map((service) => service.nome).join(", ")}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border bg-white p-4 text-sm text-muted-foreground">
        <ExternalLink className="h-4 w-4 text-accent" />
        Link publico preparado: <span className="font-semibold text-foreground">/agendar/{settings?.slug}</span>
      </div>
    </SetupCard>
  );
}
