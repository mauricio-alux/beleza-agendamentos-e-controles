import { toCurrency } from "@/components/agenda/date";
import type { Service } from "@/services/agenda.service";

type ServiceSelectorProps = {
  services: Service[];
  value: string;
  onChange: (value: string) => void;
};

export function ServiceSelector({ services, value, onChange }: ServiceSelectorProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-12 w-full rounded-2xl border border-input bg-white/90 px-4 text-sm font-semibold text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
    >
      {services.map((service) => (
        <option key={service.id} value={service.id}>
          {service.nome} · {service.duracao_minutos} min · {toCurrency(service.preco)}
        </option>
      ))}
    </select>
  );
}
