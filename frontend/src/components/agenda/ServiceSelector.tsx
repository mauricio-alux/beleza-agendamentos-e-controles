import { toCurrency } from "@/components/agenda/date";
import type { Service } from "@/services/agenda.service";
import { cn } from "@/lib/utils";

type ServiceSelectorProps = {
  services: Service[];
  value: string;
  onChange: (value: string) => void;
  allLabel?: string;
  invalid?: boolean;
  disabled?: boolean;
};

export function ServiceSelector({ services, value, onChange, allLabel, invalid = false, disabled = false }: ServiceSelectorProps) {
  return (
    <select
      aria-label="Serviço"
      aria-invalid={invalid || undefined}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className={cn(
        "h-12 w-full rounded-2xl border bg-white/90 px-4 text-sm font-semibold text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:bg-muted/60 disabled:text-muted-foreground",
        invalid ? "border-destructive bg-destructive/5 ring-2 ring-destructive/20" : "border-input"
      )}
    >
      <option value="">{allLabel || "Todos os serviços"}</option>
      {services.map((service) => (
        <option key={service.id} value={service.id}>
          {service.nome} - {service.duracao_minutos ? `${service.duracao_minutos} min` : "duração pendente"} - {service.preco == null ? "Sob consulta" : toCurrency(service.preco)}
        </option>
      ))}
    </select>
  );
}
