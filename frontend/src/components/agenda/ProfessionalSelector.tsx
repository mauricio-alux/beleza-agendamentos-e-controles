import type { Professional } from "@/services/agenda.service";
import { cn } from "@/lib/utils";

type ProfessionalSelectorProps = {
  professionals: Professional[];
  value: string;
  onChange: (value: string) => void;
  allLabel?: string;
  invalid?: boolean;
};

export function ProfessionalSelector({ professionals, value, onChange, allLabel, invalid = false }: ProfessionalSelectorProps) {
  return (
    <select
      aria-label="Profissional"
      aria-invalid={invalid || undefined}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "h-12 w-full rounded-2xl border bg-white/90 px-4 text-sm font-semibold text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25",
        invalid ? "border-destructive bg-destructive/5 ring-2 ring-destructive/20" : "border-input"
      )}
    >
      {allLabel ? <option value="">{allLabel}</option> : null}
      {professionals.map((professional) => (
        <option key={professional.id} value={professional.id}>
          {professional.nome_publico || "Profissional"}
        </option>
      ))}
    </select>
  );
}
