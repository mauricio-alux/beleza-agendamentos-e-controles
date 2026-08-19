import { Lightbulb } from "lucide-react";
import type { AgendaAnalytics } from "@/services/agenda.service";

type ScheduleOptimizationHintsProps = {
  analytics: AgendaAnalytics | null;
};

export function ScheduleOptimizationHints({ analytics }: ScheduleOptimizationHintsProps) {
  const hints = analytics?.hints || [];

  if (!hints.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-primary">
          <Lightbulb className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-bold text-foreground">Sugestões para a Agenda</p>
          <p className="text-xs leading-5 text-muted-foreground">Oportunidades práticas para organizar melhor o dia.</p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {hints.map((hint) => (
          <div key={hint.id} className="rounded-2xl border border-border bg-background/80 p-3">
            <p className="text-sm font-bold text-foreground">{hint.title}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
