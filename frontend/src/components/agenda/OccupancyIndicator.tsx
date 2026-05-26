import { TrendingUp } from "lucide-react";
import type { AgendaAnalytics } from "@/services/agenda.service";

type OccupancyIndicatorProps = {
  analytics: AgendaAnalytics | null;
};

export function OccupancyIndicator({ analytics }: OccupancyIndicatorProps) {
  const occupancy = analytics?.analytics.occupancy_rate ?? 0;
  const efficiency = analytics?.analytics.slot_efficiency ?? 0;

  return (
    <div className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-primary">
          <TrendingUp className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-bold text-foreground">Ocupacao operacional</p>
          <p className="text-xs leading-5 text-muted-foreground">Preparada para analytics e IA futura.</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Metric label="Ocupacao" value={`${occupancy}%`} />
        <Metric label="Eficiencia" value={`${efficiency}%`} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/80 p-3">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}
