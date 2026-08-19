import { TrendingUp } from "lucide-react";
import type { AgendaAnalytics } from "@/services/agenda.service";

type OccupancyIndicatorProps = {
  analytics: AgendaAnalytics | null;
};

export function OccupancyIndicator({ analytics }: OccupancyIndicatorProps) {
  const occupancy = analytics?.analytics.occupancy_rate ?? 0;
  const efficiency = analytics?.analytics.slot_efficiency ?? 0;
  const totalWorkMinutes = analytics?.analytics.total_work_minutes ?? 0;
  const occupiedMinutes = analytics?.analytics.occupied_minutes ?? 0;
  const freeMinutes = Math.max(totalWorkMinutes - occupiedMinutes, 0);

  return (
    <div className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-primary">
          <TrendingUp className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-bold text-foreground">Ocupação da Agenda</p>
          <p className="text-xs leading-5 text-muted-foreground">Resumo de capacidade para a data consultada.</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Metric label="Ocupação" value={`${occupancy}%`} />
        <Metric label="Tempo livre" value={formatMinutes(freeMinutes)} />
        <Metric label="Tempo ocupado" value={formatMinutes(occupiedMinutes)} />
        <Metric label="Aproveitamento" value={`${efficiency}%`} />
      </div>
    </div>
  );
}

function formatMinutes(minutes: number) {
  if (!minutes) return "0 min";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  if (!rest) return `${hours}h`;
  return `${hours}h ${rest}min`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/80 p-3">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}
