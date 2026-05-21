import { ProfessionalSelector } from "@/components/agenda/ProfessionalSelector";
import { ServiceSelector } from "@/components/agenda/ServiceSelector";
import type { AgendaMeta } from "@/services/agenda.service";

type AgendaFiltersProps = {
  meta: AgendaMeta;
  professionalId: string;
  serviceId: string;
  onProfessionalChange: (value: string) => void;
  onServiceChange: (value: string) => void;
};

export function AgendaFilters({
  meta,
  professionalId,
  serviceId,
  onProfessionalChange,
  onServiceChange
}: AgendaFiltersProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <ProfessionalSelector professionals={meta.profissionais} value={professionalId} onChange={onProfessionalChange} />
      <ServiceSelector services={meta.servicos} value={serviceId} onChange={onServiceChange} />
    </div>
  );
}
