import { ProfessionalSelector } from "@/components/agenda/ProfessionalSelector";
import { ServiceSelector } from "@/components/agenda/ServiceSelector";
import { Button } from "@/components/ui/button";
import type { AgendaMeta } from "@/services/agenda.service";
import { cn } from "@/lib/utils";

type AgendaFiltersProps = {
  meta: AgendaMeta;
  professionalId: string;
  serviceId: string;
  specialtyId?: string;
  onProfessionalChange: (value: string) => void;
  onServiceChange: (value: string) => void;
  onSpecialtyChange?: (value: string) => void;
  allowAllProfessionals?: boolean;
  onSearch?: () => void;
  onClear?: () => void;
  isSearching?: boolean;
  hasPendingChanges?: boolean;
  invalidFields?: string[];
  mode?: "consultation" | "creation";
};

export function AgendaFilters({
  meta,
  professionalId,
  serviceId,
  specialtyId = "",
  onProfessionalChange,
  onServiceChange,
  onSpecialtyChange,
  allowAllProfessionals = false,
  onSearch,
  onClear,
  isSearching = false,
  hasPendingChanges = false,
  invalidFields = [],
  mode = "consultation"
}: AgendaFiltersProps) {
  const invalidFieldSet = new Set(invalidFields);
  const selectedProfessional = meta.profissionais.find((professional) => professional.id === professionalId) || null;
  const allowedServiceIds = new Set(selectedProfessional?.servico_ids || []);
  const allowedConfigIds = new Set(selectedProfessional?.servico_tenant_especialidade_ids || []);
  const requiresProfessionalFirst = mode === "creation" && !selectedProfessional;
  const serviceOptions = meta.servicos
    .filter((service) => {
      if (requiresProfessionalFirst) return false;
      if (!selectedProfessional) return true;
      return allowedServiceIds.has(service.id);
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
  const selectedService = serviceOptions.find((service) => service.id === serviceId) || null;
  const sourceServices = selectedService ? [selectedService] : serviceOptions;
  const specialtiesById = new Map<string, NonNullable<AgendaMeta["servicos"][number]["especialidades_config"]>[number]>();

  sourceServices.forEach((service) => {
    (service.especialidades_config || [])
      .filter((config) => !selectedProfessional || allowedConfigIds.has(config.id))
      .forEach((config) => {
        if (!config.especialidade_id || specialtiesById.has(config.especialidade_id)) return;
        specialtiesById.set(config.especialidade_id, config);
      });
  });

  const specialties = Array.from(specialtiesById.values()).sort((a, b) => (
    (a.nome || "").localeCompare(b.nome || "", "pt-BR", { sensitivity: "base" })
  ));

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <ProfessionalSelector
          professionals={meta.profissionais}
          value={professionalId}
          onChange={onProfessionalChange}
          allLabel={allowAllProfessionals ? "Todos os profissionais" : undefined}
          invalid={invalidFieldSet.has("professional")}
        />
        <ServiceSelector
          services={serviceOptions}
          value={serviceId}
          onChange={onServiceChange}
          allLabel={requiresProfessionalFirst ? "Selecione primeiro um profissional" : "Todos os serviços"}
          invalid={invalidFieldSet.has("service")}
          disabled={requiresProfessionalFirst}
        />
        <select
          aria-label="Especialidade"
          aria-invalid={invalidFieldSet.has("specialty") || undefined}
          value={specialtyId}
          onChange={(event) => onSpecialtyChange?.(event.target.value)}
          disabled={!onSpecialtyChange || !specialties.length || (mode === "creation" && !selectedService)}
          className={cn(
            "h-11 rounded-xl border bg-white px-3 text-sm font-semibold text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-muted/60 disabled:text-muted-foreground",
            invalidFieldSet.has("specialty") ? "border-destructive bg-destructive/5 ring-2 ring-destructive/20" : "border-border"
          )}
        >
          <option value="">{mode === "creation" && !selectedService ? "Selecione primeiro um serviço" : "Todas as especialidades"}</option>
          {specialties.map((config) => (
            <option key={config.especialidade_id} value={config.especialidade_id}>
              {config.nome || "Especialidade sem nome"}
            </option>
          ))}
        </select>
      </div>

      {mode === "creation" && selectedProfessional && !serviceOptions.length ? (
        <p className="rounded-2xl border border-dashed border-border bg-background/80 p-3 text-sm font-semibold text-muted-foreground">
          Este profissional não possui serviços disponíveis para agendamento.
        </p>
      ) : null}

      {mode === "creation" && selectedProfessional && selectedService && !specialties.length ? (
        <p className="rounded-2xl border border-dashed border-border bg-background/80 p-3 text-sm font-semibold text-muted-foreground">
          Este profissional não possui especialidades disponíveis para este serviço.
        </p>
      ) : null}

      {onSearch || onClear ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-h-5 text-xs font-semibold text-muted-foreground" aria-live="polite">
            {hasPendingChanges ? "Existem filtros alterados ainda não aplicados." : ""}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {onClear ? (
              <Button type="button" variant="outline" onClick={onClear} disabled={isSearching}>
                Limpar filtros
              </Button>
            ) : null}
            {onSearch ? (
              <Button type="button" onClick={onSearch} disabled={isSearching} aria-busy={isSearching}>
                {isSearching ? "Pesquisando..." : "Pesquisar"}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
