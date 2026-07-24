import { Sparkles } from "lucide-react";
import { APP_BRAND } from "@/config/app-brand";

type AvailabilityIndicatorProps = {
  total: number;
  reason?: string | null;
  strategy?: string | null;
};

export function AvailabilityIndicator({ total, reason, strategy }: AvailabilityIndicatorProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-primary">
        <Sparkles className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm font-bold text-foreground">
          {total ? `${total} horarios inteligentes encontrados` : reason || "Sem horarios disponiveis"}
        </p>
        <p className="text-xs leading-5 text-muted-foreground">
          {strategy
            ? "Slots ranqueados por ocupacao, encaixe e fragmentacao."
            : `O ${APP_BRAND.appName} considera escala, conflitos e duracao do servico.`}
        </p>
      </div>
    </div>
  );
}
