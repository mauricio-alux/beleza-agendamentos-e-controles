import { ProfessionalSelector } from "@/components/agenda/ProfessionalSelector";
import { ServiceSelector } from "@/components/agenda/ServiceSelector";
import type { AgendaMeta } from "@/services/agenda.service";

type AgendaFiltersProps = {
  meta: AgendaMeta;
  professionalId: string;
  serviceId: string;
  onProfessionalChange: (value: string) => void;
  onServiceChange: (value: string) => void;
  allowAllProfessionals?: boolean;
};

export function AgendaFilters({
  meta,
  professionalId,
  serviceId,
  onProfessionalChange,
  onServiceChange,
  allowAllProfessionals = false
}: AgendaFiltersProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <ProfessionalSelector
        professionals={meta.profissionais}
        value={professionalId}
        onChange={onProfessionalChange}
        allLabel={allowAllProfessionals ? "Todos os profissionais" : undefined}
      />
      <ServiceSelector
        services={meta.servicos}
        value={serviceId}
        onChange={onServiceChange}
        allLabel="Todos os servicos"
      />
    </div>
  );
}
