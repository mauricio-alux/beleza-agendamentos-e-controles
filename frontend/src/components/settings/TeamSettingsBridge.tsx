"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { agendaService, type Professional } from "@/services/agenda.service";

export function TeamSettingsBridge() {
  const { session } = useAuth();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) return;

    agendaService
      .getMeta(session)
      .then((meta) => setProfessionals(meta.profissionais || []))
      .catch((err) => setError(err instanceof Error ? err.message : "Nao foi possivel carregar profissionais."));
  }, [session]);

  if (error) {
    return <p className="text-sm font-semibold text-destructive">{error}</p>;
  }

  if (!professionals.length) {
    return (
      <div className="space-y-4">
        <p className="text-sm leading-6 text-muted-foreground">
          Cadastre profissionais para configurar os dias e horarios de atendimento.
        </p>
        <Button asChild variant="outline">
          <Link href="/equipe">Abrir equipe</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm leading-6 text-muted-foreground">
        Cada profissional pode ter seus proprios dias de trabalho, horarios e intervalos.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {professionals.map((professional) => (
          <Link
            key={professional.id}
            href={`/configuracoes/equipe/${professional.id}/agenda`}
            className="flex min-h-16 items-center gap-3 rounded-2xl border border-white/80 bg-white/90 p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft"
          >
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-secondary text-primary">
              <CalendarClock className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-foreground">
                {professional.nome_publico || professional.cargo || "Profissional"}
              </span>
              <span className="block text-xs text-muted-foreground">Configurar horarios de atendimento</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
