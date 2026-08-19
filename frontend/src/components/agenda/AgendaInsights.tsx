import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { AgendaSignals } from "@/services/agenda.service";

type AgendaInsightsProps = {
  signals: AgendaSignals | null;
};

export function AgendaInsights({ signals }: AgendaInsightsProps) {
  const items = (signals?.signals || []).filter((item) => item.score >= 70);

  return (
    <div className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-accent/10 text-accent">
          {items.length ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
        </span>
        <div>
          <p className="text-sm font-bold text-foreground">Alertas da Agenda</p>
          <p className="text-xs leading-5 text-muted-foreground">Pendências que exigem atenção nesta data.</p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {items.length ? items.slice(0, 3).map((item) => (
          <div key={item.id} className="rounded-2xl border border-border bg-background/80 p-3">
            <p className="text-sm font-bold text-foreground">{item.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">Prioridade {Math.round(item.score)}/100</p>
          </div>
        )) : (
          <p className="rounded-2xl border border-dashed border-border bg-background/80 p-3 text-sm text-muted-foreground">
            Tudo em ordem. Nenhuma pendência importante para esta data.
          </p>
        )}
      </div>
    </div>
  );
}
