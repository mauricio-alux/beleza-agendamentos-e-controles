import type { Professional } from "@/services/agenda.service";

type ProfessionalSelectorProps = {
  professionals: Professional[];
  value: string;
  onChange: (value: string) => void;
};

export function ProfessionalSelector({ professionals, value, onChange }: ProfessionalSelectorProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-12 w-full rounded-2xl border border-input bg-white/90 px-4 text-sm font-semibold text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
    >
      {professionals.map((professional) => (
        <option key={professional.id} value={professional.id}>
          {professional.nome_publico || "Profissional"}
        </option>
      ))}
    </select>
  );
}
