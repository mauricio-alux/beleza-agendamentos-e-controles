"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, ExternalLink, Eye, Pencil, Plus, Save, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ServicesMerManager } from "@/components/services/ServicesMerManager";
import { SERVICE_CATEGORY_LABELS, type ServiceCategory } from "@/constants/service-categories";
import { getAllowedCategoryKeysForRole } from "@/constants/team-service-compatibility";
import { useAuth } from "@/hooks/useAuth";
import { servicesService, type SalonService } from "@/services/services.service";
import { teamService, type TeamRole, type TeamSpecialty } from "@/services/team.service";

type OperationalTab = "services" | "specialties" | "role-specialties" | "service-specialties";

const PAGE_COPY: Record<OperationalTab, { title: string; description: string }> = {
  services: {
    title: "Serviços",
    description: "Configure as ofertas do estabelecimento, especialidades, preco, duracao, retorno e agendamento online."
  },
  specialties: {
    title: "Especialidades do salao",
    description: "Consulte as especialidades disponiveis, seus status e os servicos aos quais estao vinculadas."
  },
  "role-specialties": {
    title: "Cargos e especialidades profissionais",
    description: "Organize os cargos do salao e as competencias profissionais relacionadas a cada cargo."
  },
  "service-specialties": {
    title: "Configuração de serviços",
    description: "A configuração Serviço + Especialidade fica centralizada na tela de Serviços."
  }
};

export function OperationalCatalogManager({ tab }: { tab: OperationalTab }) {
  const { session } = useAuth();
  const [roles, setRoles] = useState<TeamRole[]>([]);
  const [specialties, setSpecialties] = useState<TeamSpecialty[]>([]);
  const [services, setServices] = useState<SalonService[]>([]);
  const [selectedCargoId, setSelectedCargoId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ServiceCategory | "">("");
  const [originFilter, setOriginFilter] = useState<"all" | "official" | "custom">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [linkedFilter, setLinkedFilter] = useState<"all" | "linked" | "unlinked">("all");
  const [draftSpecialtyIds, setDraftSpecialtyIds] = useState<string[]>([]);
  const [roleForm, setRoleForm] = useState({ nome: "", descricao: "", categoria_profissional: "operacional" as "operacional" | "administrativo" });
  const [editingRoleId, setEditingRoleId] = useState("");
  const [specialtyForm, setSpecialtyForm] = useState({ nome: "", descricao: "", taxonomy_category_key: "" as ServiceCategory | "" });
  const [editingSpecialtyId, setEditingSpecialtyId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    if (!session) return;

    setIsLoading(true);
    setError("");

    try {
      const [nextRoles, nextSpecialties, nextServices] = await Promise.all([
        teamService.listRoles(session),
        teamService.listAllSpecialties(session, { includeInactive: true }),
        servicesService.list(session)
      ]);
      setRoles(nextRoles);
      setSpecialties(nextSpecialties);
      setServices(nextServices);

      const firstService = selectedServiceId || nextServices[0]?.id || "";
      setSelectedServiceId(firstService);
      const service = nextServices.find((item) => item.id === firstService);
      setDraftSpecialtyIds(service?.especialidade_ids || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar as configurações operacionais.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [session]);

  useEffect(() => {
    const service = services.find((item) => item.id === selectedServiceId);
    setDraftSpecialtyIds(service?.especialidade_ids || []);
  }, [selectedServiceId, services]);

  const filteredSpecialties = useMemo(() => {
    return specialties.filter((specialty) => {
      const byCargo = selectedCargoId ? specialty.cargo_id === selectedCargoId : true;
      const term = search.trim().toLowerCase();
      const bySearch = term
        ? `${specialty.nome} ${specialty.cargo?.nome || ""}`.toLowerCase().includes(term)
        : true;
      const byCategory = categoryFilter ? specialty.taxonomy_category_key === categoryFilter : true;
      const byOrigin = originFilter === "custom" ? specialty.is_custom === true : originFilter === "official" ? specialty.is_custom !== true : true;
      const byStatus = statusFilter === "active" ? specialty.ativo !== false : statusFilter === "inactive" ? specialty.ativo === false : true;
      const linkedCount = linkedServicesForSpecialty(specialty.id).length;
      const byLinked = linkedFilter === "linked" ? linkedCount > 0 : linkedFilter === "unlinked" ? linkedCount === 0 : true;
      return byCargo && bySearch && byCategory && byOrigin && byStatus && byLinked;
    });
  }, [categoryFilter, linkedFilter, originFilter, search, selectedCargoId, services, specialties, statusFilter]);

  const selectedService = services.find((service) => service.id === selectedServiceId) || null;
  const selectedRole = selectedCargoId ? roles.find((role) => role.id === selectedCargoId) || null : null;
  const allowedSpecialtyCategoryKeys = selectedRole ? getAllowedCategoryKeysForRole(selectedRole) : [];
  const canMaintainSpecialties = Boolean(
    selectedCargoId
    && selectedRole
    && selectedRole.categoria_profissional !== "administrativo"
    && allowedSpecialtyCategoryKeys.length
  );

  function linkedServicesForSpecialty(specialtyId: string) {
    return services.filter((service) => (
      service.especialidades_config?.some((config) => config.especialidade_id === specialtyId)
      || service.especialidade_ids?.includes(specialtyId)
    ));
  }

  function resetSpecialtyDraft() {
    setEditingSpecialtyId("");
    setSpecialtyForm({ nome: "", descricao: "", taxonomy_category_key: "" });
    setError("");
    setMessage("");
  }

  function handleSelectCargo(cargoId: string) {
    if (cargoId !== selectedCargoId) {
      resetSpecialtyDraft();
    }
    setSelectedCargoId(cargoId);
  }

  async function toggleSpecialtyStatus(specialty: TeamSpecialty) {
    if (!session) return;

    const nextActive = specialty.ativo === false;
    const confirmed = nextActive || window.confirm("Inativar esta especialidade para este salao?");
    if (!confirmed) return;

    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const updated = await teamService.updateSpecialtyStatus(session, specialty.id, nextActive);
      setSpecialties((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setMessage(nextActive ? "Especialidade ativada." : "Especialidade inativada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar a especialidade.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveRole() {
    if (!session || !roleForm.nome.trim()) return;

    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        nome: roleForm.nome.trim(),
        descricao: roleForm.descricao.trim() || null,
        categoria_profissional: roleForm.categoria_profissional
      };
      const saved = editingRoleId
        ? await teamService.updateRole(session, editingRoleId, payload)
        : await teamService.createRole(session, payload);

      setRoles((current) => editingRoleId
        ? current.map((role) => (role.id === saved.id ? saved : role))
        : [...current, saved].sort((a, b) => a.nome.localeCompare(b.nome)));
      setRoleForm({ nome: "", descricao: "", categoria_profissional: "operacional" });
      setEditingRoleId("");
      setMessage(editingRoleId ? "Cargo atualizado." : "Cargo criado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar o cargo.");
    } finally {
      setIsSaving(false);
    }
  }

  async function removeRole(role: TeamRole) {
    if (!session) return;
    const confirmed = window.confirm(`Excluir o cargo ${role.nome}? Ele deixara de aparecer nas manutencoes.`);
    if (!confirmed) return;

    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      await teamService.removeRole(session, role.id);
      setRoles((current) => current.filter((item) => item.id !== role.id));
      setSpecialties((current) => current.filter((specialty) => specialty.cargo_id !== role.id));
      if (selectedCargoId === role.id) handleSelectCargo("");
      setMessage("Cargo excluido.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir o cargo.");
    } finally {
      setIsSaving(false);
    }
  }

  function startEditRole(role: TeamRole) {
    setEditingRoleId(role.id);
    setRoleForm({
      nome: role.nome,
      descricao: role.descricao || "",
      categoria_profissional: role.categoria_profissional === "administrativo" ? "administrativo" : "operacional"
    });
  }

  async function saveSpecialty() {
    if (!session || !canMaintainSpecialties || !specialtyForm.taxonomy_category_key || !specialtyForm.nome.trim()) return;

    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        cargo_id: selectedCargoId,
        nome: specialtyForm.nome.trim(),
        taxonomy_category_key: specialtyForm.taxonomy_category_key,
        descricao: specialtyForm.descricao.trim() || null
      };
      const saved = editingSpecialtyId
        ? await teamService.updateSpecialty(session, editingSpecialtyId, payload)
        : await teamService.createSpecialty(session, payload);

      setSpecialties((current) => editingSpecialtyId
        ? current.map((specialty) => (specialty.id === saved.id ? saved : specialty))
        : [...current, saved].sort((a, b) => a.nome.localeCompare(b.nome)));
      setSpecialtyForm({ nome: "", descricao: "", taxonomy_category_key: "" });
      setEditingSpecialtyId("");
      setMessage(editingSpecialtyId ? "Especialidade atualizada." : "Especialidade criada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a especialidade.");
    } finally {
      setIsSaving(false);
    }
  }

  async function removeSpecialty(specialty: TeamSpecialty) {
    if (!session) return;
    const confirmed = window.confirm(`Excluir a especialidade ${specialty.nome}? Ela deixara de aparecer nas manutencoes.`);
    if (!confirmed) return;

    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      await teamService.removeSpecialty(session, specialty.id);
      setSpecialties((current) => current.filter((item) => item.id !== specialty.id));
      setServices((current) => current.map((service) => ({
        ...service,
        especialidade_ids: service.especialidade_ids?.filter((id) => id !== specialty.id),
        especialidades: service.especialidades?.filter((item) => item.id !== specialty.id)
      })));
      setMessage("Especialidade excluida.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir a especialidade.");
    } finally {
      setIsSaving(false);
    }
  }

  function startEditSpecialty(specialty: TeamSpecialty) {
    if (selectedCargoId !== specialty.cargo_id) {
      setSelectedCargoId(specialty.cargo_id);
    }
    setEditingSpecialtyId(specialty.id);
    setSpecialtyForm({
      nome: specialty.nome,
      descricao: specialty.descricao || "",
      taxonomy_category_key: specialty.taxonomy_category_key || ""
    });
  }

  async function saveServiceSpecialties() {
    if (!session || !selectedService) return;

    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const serviceCategory = selectedService.taxonomy_category_key || selectedService.categoria || "";
      const compatibleIds = new Set(
        specialties
          .filter((specialty) => specialty.ativo !== false && specialty.taxonomy_category_key === serviceCategory)
          .map((specialty) => specialty.id)
      );
      const updated = await servicesService.update(session, selectedService.id, {
        especialidade_ids: draftSpecialtyIds.filter((id) => compatibleIds.has(id))
      });
      setServices((current) => current.map((service) => (service.id === updated.id ? updated : service)));
      setMessage("Vinculos atualizados.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar os vínculos.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-5">
      <div className="rounded-[1.75rem] border border-white/80 bg-white/82 p-5 shadow-soft backdrop-blur-xl sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Configuracoes operacionais</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">{PAGE_COPY[tab].title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          {PAGE_COPY[tab].description}
        </p>
      </div>

      {(error || message) ? (
        <div className={`rounded-2xl px-5 py-4 text-sm font-black shadow-lg ${
          error ? "border-2 border-red-700 bg-red-700 text-white" : "border border-primary/20 bg-secondary text-primary"
        }`}>
          {error || message}
        </div>
      ) : null}

      {tab === "services" ? <ServicesMerManager embedded /> : null}

      {tab === "service-specialties" ? (
        <DashboardCard title="Configuração centralizada em Serviços" description="Preço, duração, retorno, agendamento online e status da combinação pertencem a Serviços.">
          <p className="text-sm leading-6 text-muted-foreground">
            Cargo e especialidade descrevem competencia profissional. A oferta operacional do estabelecimento e configurada por servico.
          </p>
          <Button asChild variant="accent" className="mt-4">
            <Link href="/configuracoes/servicos">
              <ExternalLink className="h-4 w-4" />
              Abrir Serviços
            </Link>
          </Button>
        </DashboardCard>
      ) : null}

      {tab !== "services" && tab !== "service-specialties" ? (
        <DashboardCard title="Filtros" description="Refine a manutencao operacional.">
          <div className="grid gap-3 md:grid-cols-[0.8fr_1fr] xl:grid-cols-[0.8fr_1fr_0.75fr_0.65fr_0.65fr_0.8fr]">
            <select
              value={selectedCargoId}
              onChange={(event) => handleSelectCargo(event.target.value)}
              className="h-11 rounded-xl border border-border bg-white px-3 text-sm font-semibold text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Todos os cargos</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>{role.nome}</option>
              ))}
            </select>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar especialidade ou cargo" className="pl-9" />
            </div>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as ServiceCategory | "")} className="h-11 rounded-xl border border-border bg-white px-3 text-sm font-semibold text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20">
              <option value="">Todas as categorias</option>
              {Object.entries(SERVICE_CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
            <select value={originFilter} onChange={(event) => setOriginFilter(event.target.value as "all" | "official" | "custom")} className="h-11 rounded-xl border border-border bg-white px-3 text-sm font-semibold text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20">
              <option value="all">Todas as origens</option>
              <option value="official">Oficiais</option>
              <option value="custom">Customizadas</option>
            </select>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")} className="h-11 rounded-xl border border-border bg-white px-3 text-sm font-semibold text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20">
              <option value="all">Todos os status</option>
              <option value="active">Ativas</option>
              <option value="inactive">Inativas</option>
            </select>
            {tab === "specialties" ? (
              <select value={linkedFilter} onChange={(event) => setLinkedFilter(event.target.value as "all" | "linked" | "unlinked")} className="h-11 rounded-xl border border-border bg-white px-3 text-sm font-semibold text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20">
                <option value="all">Com ou sem servico</option>
                <option value="linked">Com servico vinculado</option>
                <option value="unlinked">Sem servico vinculado</option>
              </select>
            ) : null}
          </div>
        </DashboardCard>
      ) : null}

      {isLoading && tab !== "services" ? (
        <DashboardCard title="Carregando" description="Buscando dados operacionais.">
          <p className="text-sm font-semibold text-muted-foreground">Carregando...</p>
        </DashboardCard>
      ) : null}

      {!isLoading && tab === "specialties" ? (
        <SpecialtiesPanel
          specialties={filteredSpecialties}
          allSpecialties={specialties}
          linkedServicesForSpecialty={linkedServicesForSpecialty}
        />
      ) : null}

      {!isLoading && tab === "role-specialties" ? (
        <RoleSpecialtiesPanel
          roles={roles}
          specialties={filteredSpecialties}
          selectedCargoId={selectedCargoId}
          onSelectCargo={handleSelectCargo}
          linkedServicesForSpecialty={linkedServicesForSpecialty}
          roleForm={roleForm}
          setRoleForm={setRoleForm}
          editingRoleId={editingRoleId}
          onSaveRole={saveRole}
          onEditRole={startEditRole}
          onRemoveRole={removeRole}
          onCancelRoleEdit={() => {
            setEditingRoleId("");
            setRoleForm({ nome: "", descricao: "", categoria_profissional: "operacional" });
          }}
          specialtyForm={specialtyForm}
          setSpecialtyForm={setSpecialtyForm}
          selectedRole={selectedRole}
          allowedCategoryKeys={allowedSpecialtyCategoryKeys}
          canMaintainSpecialties={canMaintainSpecialties}
          onSaveSpecialty={saveSpecialty}
          editingSpecialtyId={editingSpecialtyId}
          onCancelSpecialtyEdit={() => {
            setEditingSpecialtyId("");
            setSpecialtyForm({ nome: "", descricao: "", taxonomy_category_key: "" });
          }}
          onEditSpecialty={startEditSpecialty}
          onRemoveSpecialty={removeSpecialty}
          onToggleStatus={toggleSpecialtyStatus}
          isSaving={isSaving}
        />
      ) : null}

      {false && !isLoading && tab === "service-specialties" ? (
        <ServiceSpecialtiesPanel
          services={services}
          specialties={filteredSpecialties.filter((specialty) => specialty.ativo !== false)}
          selectedServiceId={selectedServiceId}
          onSelectService={setSelectedServiceId}
          draftSpecialtyIds={draftSpecialtyIds}
          setDraftSpecialtyIds={setDraftSpecialtyIds}
          onSave={saveServiceSpecialties}
          isSaving={isSaving}
        />
      ) : null}
    </section>
  );
}

function SpecialtiesPanel({
  specialties,
  allSpecialties,
  linkedServicesForSpecialty
}: {
  specialties: TeamSpecialty[];
  allSpecialties: TeamSpecialty[];
  linkedServicesForSpecialty: (specialtyId: string) => SalonService[];
}) {
  const stats = {
    total: allSpecialties.length,
    active: allSpecialties.filter((specialty) => specialty.ativo !== false).length,
    inactive: allSpecialties.filter((specialty) => specialty.ativo === false).length,
    official: allSpecialties.filter((specialty) => specialty.is_custom !== true).length,
    custom: allSpecialties.filter((specialty) => specialty.is_custom === true).length,
    unlinked: allSpecialties.filter((specialty) => linkedServicesForSpecialty(specialty.id).length === 0).length
  };

  return (
    <DashboardCard title="Especialidades do salao" description="Visao consolidada das especialidades disponiveis no estabelecimento.">
      <p className="rounded-2xl border border-primary/15 bg-secondary/70 px-4 py-3 text-sm font-semibold leading-6 text-primary">
        Os vínculos comerciais e operacionais entre serviços e especialidades são configurados na tela de Serviços.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Total" value={stats.total} />
        <Metric label="Ativas" value={stats.active} />
        <Metric label="Inativas" value={stats.inactive} />
        <Metric label="Oficiais" value={stats.official} />
        <Metric label="Customizadas" value={stats.custom} />
        <Metric label="Sem servico" value={stats.unlinked} />
      </div>
      {specialties.length ? (
        <div className="mt-4 grid gap-3">
          {specialties.map((specialty) => (
            <SpecialtyRow
              key={specialty.id}
              specialty={specialty}
              linkedServices={linkedServicesForSpecialty(specialty.id)}
              readonly
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-white/70 p-4">
          <p className="text-sm font-bold text-foreground">Nenhuma especialidade foi encontrada para os filtros selecionados.</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Ajuste os filtros ou revise a manutencao estrutural em Cargos e especialidades profissionais.</p>
        </div>
      )}
    </DashboardCard>
  );
}

function RoleSpecialtiesPanel({
  roles,
  specialties,
  selectedCargoId,
  onSelectCargo,
  linkedServicesForSpecialty,
  onToggleStatus,
  roleForm,
  setRoleForm,
  editingRoleId,
  onSaveRole,
  onEditRole,
  onRemoveRole,
  onCancelRoleEdit,
  specialtyForm,
  setSpecialtyForm,
  selectedRole,
  allowedCategoryKeys,
  canMaintainSpecialties,
  onSaveSpecialty,
  editingSpecialtyId,
  onCancelSpecialtyEdit,
  onEditSpecialty,
  onRemoveSpecialty,
  isSaving
}: {
  roles: TeamRole[];
  specialties: TeamSpecialty[];
  selectedCargoId: string;
  onSelectCargo: (cargoId: string) => void;
  linkedServicesForSpecialty: (specialtyId: string) => SalonService[];
  onToggleStatus: (specialty: TeamSpecialty) => void;
  roleForm: { nome: string; descricao: string; categoria_profissional: "operacional" | "administrativo" };
  setRoleForm: (form: { nome: string; descricao: string; categoria_profissional: "operacional" | "administrativo" }) => void;
  editingRoleId: string;
  onSaveRole: () => void;
  onEditRole: (role: TeamRole) => void;
  onRemoveRole: (role: TeamRole) => void;
  onCancelRoleEdit: () => void;
  specialtyForm: { nome: string; descricao: string; taxonomy_category_key: ServiceCategory | "" };
  setSpecialtyForm: (form: { nome: string; descricao: string; taxonomy_category_key: ServiceCategory | "" }) => void;
  selectedRole: TeamRole | null;
  allowedCategoryKeys: ServiceCategory[];
  canMaintainSpecialties: boolean;
  onSaveSpecialty: () => void;
  editingSpecialtyId: string;
  onCancelSpecialtyEdit: () => void;
  onEditSpecialty: (specialty: TeamSpecialty) => void;
  onRemoveSpecialty: (specialty: TeamSpecialty) => void;
  isSaving: boolean;
}) {
  const visibleRoles = selectedCargoId ? roles.filter((role) => role.id === selectedCargoId) : roles;

  return (
    <div className="grid gap-4">
      <DashboardCard title={editingRoleId ? "Editar cargo" : "Novo cargo"} description="Inclua ou corrija cargos do catalogo operacional.">
        <RoleForm
          form={roleForm}
          setForm={setRoleForm}
          onSave={onSaveRole}
          editingId={editingRoleId}
          onCancelEdit={onCancelRoleEdit}
          isSaving={isSaving}
        />
      </DashboardCard>
      <DashboardCard title={editingSpecialtyId ? "Editar especialidade customizada" : "Nova especialidade do cargo"} description="A criacao de especialidade acontece dentro de um cargo operacional selecionado.">
        <p className="mb-3 rounded-2xl border border-primary/15 bg-secondary/70 px-4 py-3 text-sm font-semibold leading-6 text-primary">
          Associar uma especialidade a um cargo representa uma competencia profissional. Isso nao ativa automaticamente um servico para Agenda ou Booking.
        </p>
        <SpecialtyForm
          form={specialtyForm}
          setForm={setSpecialtyForm}
          selectedCargoId={selectedCargoId}
          selectedRole={selectedRole}
          allowedCategoryKeys={allowedCategoryKeys}
          canMaintain={canMaintainSpecialties}
          onSave={onSaveSpecialty}
          editingId={editingSpecialtyId}
          onCancelEdit={onCancelSpecialtyEdit}
          isSaving={isSaving}
        />
      </DashboardCard>
      {visibleRoles.map((role) => {
        const roleSpecialties = specialties.filter((specialty) => specialty.cargo_id === role.id);
        return (
          <DashboardCard key={role.id} title={role.nome} description={`${roleSpecialties.length} especialidades relacionadas`}>
            <div className="mb-4 flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => onEditRole(role)} disabled={isSaving}>
                <Pencil className="h-4 w-4" />
                Editar cargo
              </Button>
              <Button type="button" variant="ghost" onClick={() => onRemoveRole(role)} disabled={isSaving}>
                <Trash2 className="h-4 w-4" />
                Excluir cargo
              </Button>
            </div>
            {roleSpecialties.length ? (
              <div className="grid gap-3">
                {roleSpecialties.map((specialty) => (
                  <SpecialtyRow
                    key={specialty.id}
                    specialty={specialty}
                    linkedServices={linkedServicesForSpecialty(specialty.id)}
                    onToggleStatus={onToggleStatus}
                    onEdit={onEditSpecialty}
                    onRemove={onRemoveSpecialty}
                    isSaving={isSaving}
                    canMaintain
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">Este cargo ainda nao possui especialidades associadas.</p>
            )}
            <Button type="button" variant="ghost" onClick={() => onSelectCargo(role.id)} className="mt-3">
              <SlidersHorizontal className="h-4 w-4" />
              Filtrar por este cargo
            </Button>
          </DashboardCard>
        );
      })}
    </div>
  );
}

function ServiceSpecialtiesPanel({
  services,
  specialties,
  selectedServiceId,
  onSelectService,
  draftSpecialtyIds,
  setDraftSpecialtyIds,
  onSave,
  isSaving
}: {
  services: SalonService[];
  specialties: TeamSpecialty[];
  selectedServiceId: string;
  onSelectService: (serviceId: string) => void;
  draftSpecialtyIds: string[];
  setDraftSpecialtyIds: (ids: string[]) => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  const selectedService = services.find((service) => service.id === selectedServiceId) || null;
  const selectedServiceCategory = selectedService?.taxonomy_category_key || selectedService?.categoria || "";
  const compatibleSpecialties = selectedServiceCategory
    ? specialties.filter((specialty) => specialty.taxonomy_category_key === selectedServiceCategory)
    : [];

  return (
    <DashboardCard title="Serviços e Especialidades" description="Marque quais especialidades podem executar o serviço selecionado.">
      <div className="grid gap-4">
        <select
          value={selectedServiceId}
          onChange={(event) => onSelectService(event.target.value)}
          className="h-11 rounded-xl border border-border bg-white px-3 text-sm font-semibold text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          {services.map((service) => (
            <option key={service.id} value={service.id}>{service.nome}</option>
          ))}
        </select>

        {services.length ? (
          <div className="flex flex-wrap gap-2">
            {compatibleSpecialties.map((specialty) => {
              const selected = draftSpecialtyIds.includes(specialty.id);
              return (
                <button
                  key={specialty.id}
                  type="button"
                  onClick={() => setDraftSpecialtyIds(
                    selected ? draftSpecialtyIds.filter((id) => id !== specialty.id) : [...draftSpecialtyIds, specialty.id]
                  )}
                  className={`rounded-full border px-3 py-2 text-xs font-bold transition ${
                    selected
                      ? "border-primary bg-primary text-primary-foreground shadow-blush"
                      : "border-border bg-white text-muted-foreground hover:border-primary/40 hover:text-primary"
                  }`}
                >
                  {selected ? <Check className="mr-1 inline h-3 w-3" /> : null}
                  {specialty.cargo?.nome ? `${specialty.cargo.nome} - ` : ""}{specialty.nome}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">Cadastre um servico antes de configurar vinculos.</p>
        )}
        {services.length && !compatibleSpecialties.length ? (
          <p className="text-sm leading-6 text-muted-foreground">Nenhuma especialidade ativa na categoria oficial deste servico.</p>
        ) : null}

        <div>
          <Button type="button" variant="accent" onClick={onSave} disabled={isSaving || !services.length}>
            <Save className="h-4 w-4" />
            {isSaving ? "Salvando..." : "Salvar vinculos"}
          </Button>
        </div>
      </div>
    </DashboardCard>
  );
}

function RoleForm({
  form,
  setForm,
  onSave,
  editingId,
  onCancelEdit,
  isSaving
}: {
  form: { nome: string; descricao: string; categoria_profissional: "operacional" | "administrativo" };
  setForm: (form: { nome: string; descricao: string; categoria_profissional: "operacional" | "administrativo" }) => void;
  onSave: () => void;
  editingId: string;
  onCancelEdit: () => void;
  isSaving: boolean;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_1fr_0.8fr_auto_auto]">
      <Input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} placeholder="Nome do cargo" />
      <Input value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })} placeholder="Descrição opcional" />
      <select
        value={form.categoria_profissional}
        onChange={(event) => setForm({ ...form, categoria_profissional: event.target.value as "operacional" | "administrativo" })}
        className="h-11 rounded-xl border border-border bg-white px-3 text-sm font-semibold text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        <option value="operacional">Operacional</option>
        <option value="administrativo">Administrativo</option>
      </select>
      <Button type="button" variant="accent" onClick={onSave} disabled={isSaving || !form.nome.trim()}>
        {editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {editingId ? "Salvar" : "Adicionar"}
      </Button>
      {editingId ? (
        <Button type="button" variant="ghost" size="icon" onClick={onCancelEdit} aria-label="Cancelar edicao">
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}

function SpecialtyForm({
  form,
  setForm,
  selectedCargoId,
  selectedRole,
  allowedCategoryKeys,
  canMaintain,
  onSave,
  editingId,
  onCancelEdit,
  isSaving
}: {
  form: { nome: string; descricao: string; taxonomy_category_key: ServiceCategory | "" };
  setForm: (form: { nome: string; descricao: string; taxonomy_category_key: ServiceCategory | "" }) => void;
  selectedCargoId: string;
  selectedRole: TeamRole | null;
  allowedCategoryKeys: ServiceCategory[];
  canMaintain: boolean;
  onSave: () => void;
  editingId: string;
  onCancelEdit: () => void;
  isSaving: boolean;
}) {
  return (
    <div className="grid gap-3">
      <div className={`rounded-2xl border px-4 py-3 ${
        canMaintain ? "border-primary/20 bg-secondary/80 text-primary" : "border-border bg-muted/40 text-muted-foreground"
      }`}>
        <p className="text-xs font-bold uppercase tracking-[0.14em]">
          {editingId ? "Editar especialidade" : "Nova especialidade"}
        </p>
        <p className="mt-1 text-sm font-semibold">
          {canMaintain
            ? `${editingId ? "Editando especialidade de" : "Adicionar especialidade para"} ${selectedRole?.nome}`
            : selectedRole?.categoria_profissional === "administrativo"
              ? "Especialidades podem ser adicionadas apenas para cargos operacionais."
            : selectedRole && !allowedCategoryKeys.length
              ? "Nenhuma categoria disponivel para este cargo."
            : "Selecione um cargo especifico nos filtros para adicionar uma especialidade."}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-[0.9fr_1fr_1fr_auto_auto]">
        <select
          value={form.taxonomy_category_key}
          onChange={(event) => setForm({ ...form, taxonomy_category_key: event.target.value as ServiceCategory | "" })}
          disabled={!canMaintain || isSaving}
          className="h-11 rounded-xl border border-border bg-white px-3 text-sm font-semibold text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted/60 disabled:text-muted-foreground"
        >
          <option value="">Categoria oficial</option>
          {allowedCategoryKeys.map((category) => (
            <option key={category} value={category}>{SERVICE_CATEGORY_LABELS[category]}</option>
          ))}
        </select>
        <Input
          value={form.nome}
          onChange={(event) => setForm({ ...form, nome: event.target.value })}
          placeholder="Nome da especialidade"
          disabled={!canMaintain || isSaving}
        />
        <Input
          value={form.descricao}
          onChange={(event) => setForm({ ...form, descricao: event.target.value })}
          placeholder="Descrição opcional"
          disabled={!canMaintain || isSaving}
        />
        <Button type="button" variant="accent" onClick={onSave} disabled={isSaving || !canMaintain || !form.taxonomy_category_key || !form.nome.trim()}>
          {editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {editingId ? "Salvar" : "Adicionar"}
        </Button>
        {editingId ? (
          <Button type="button" variant="ghost" size="icon" onClick={onCancelEdit} aria-label="Cancelar edicao">
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function SpecialtyRow({
  specialty,
  linkedServices,
  onToggleStatus,
  onEdit,
  onRemove,
  isSaving,
  canMaintain = true,
  readonly = false
}: {
  specialty: TeamSpecialty;
  linkedServices: SalonService[];
  onToggleStatus?: (specialty: TeamSpecialty) => void;
  onEdit?: (specialty: TeamSpecialty) => void;
  onRemove?: (specialty: TeamSpecialty) => void;
  isSaving?: boolean;
  canMaintain?: boolean;
  readonly?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <article className="rounded-2xl border border-white/80 bg-white/92 p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">{specialty.nome}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {specialty.cargo?.nome || "Cargo nao informado"} · {categoryLabel(specialty.taxonomy_category_key)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-muted-foreground ring-1 ring-border">
              {specialty.is_custom ? "Customizada" : "Oficial"}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${
              specialty.ativo === false ? "bg-red-100 text-red-700" : "bg-secondary text-primary"
            }`}>
              {specialty.ativo === false ? "Inativa no salao" : "Ativa no salao"}
            </span>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">
              {linkedServices.length} servicos vinculados
            </span>
          </div>
          {linkedServices.length && !expanded ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {linkedServices.map((service) => service.nome).join(", ")}
            </p>
          ) : !linkedServices.length ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Esta especialidade ainda nao esta vinculada a nenhum servico configurado.</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {linkedServices.length ? (
            <Button type="button" variant="outline" onClick={() => setExpanded((current) => !current)}>
              <Eye className="h-4 w-4" />
              {expanded ? "Ocultar vinculos" : "Consultar vinculos"}
            </Button>
          ) : null}
          {!readonly && specialty.is_custom && onEdit ? (
            <Button type="button" variant="outline" onClick={() => onEdit(specialty)} disabled={isSaving || !canMaintain}>
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          ) : null}
          {!readonly && onToggleStatus ? (
          <Button type="button" variant="outline" onClick={() => onToggleStatus(specialty)} disabled={isSaving || !canMaintain}>
            {specialty.ativo === false ? "Ativar" : "Inativar"}
          </Button>
          ) : null}
          {!readonly && specialty.is_custom && onRemove ? (
            <Button type="button" variant="ghost" onClick={() => onRemove(specialty)} disabled={isSaving || !canMaintain}>
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          ) : null}
        </div>
      </div>
      {expanded ? (
        <div className="mt-4 grid gap-2 rounded-xl border border-border bg-white/80 p-3">
          {linkedServices.map((service) => {
            const config = service.especialidades_config?.find((item) => item.especialidade_id === specialty.id);
            return (
              <div key={service.id} className="grid gap-2 rounded-xl border border-border bg-white p-3 text-sm lg:grid-cols-[1fr_0.7fr_0.7fr_0.7fr_0.8fr_auto] lg:items-center">
                <div>
                  <p className="font-bold text-foreground">{service.nome}</p>
                  <p className="text-xs font-semibold text-muted-foreground">Configuração do estabelecimento</p>
                </div>
                <Info label="Oferta" value={service.ativo === false ? "Disponível" : "Ativa"} />
                <Info label="Combinacao" value={config?.ativo === false ? "Inativa" : "Ativa"} />
                <Info label="Preco" value={formatNullablePrice(config?.preco)} />
                <Info label="Duracao" value={formatDuration(config?.duracao_minutos)} />
                <Button asChild type="button" variant="ghost">
                  <Link href={`/configuracoes/servicos?servico=${encodeURIComponent(service.id)}`}>
                    <ExternalLink className="h-4 w-4" />
                    Configurar no servico
                  </Link>
                </Button>
                <div className="grid gap-2 lg:col-span-6 lg:grid-cols-2">
                  <Info label="Retorno" value={config?.dias_retorno_recomendado ? `${config.dias_retorno_recomendado} dias` : "Não definido"} />
                  <Info label="Agendamento online" value={config?.ativo !== false && config?.aceita_agendamento_online !== false ? "Sim" : "Não"} />
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-white/85 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className="mt-1 font-semibold text-foreground">{value}</p></div>;
}

function categoryLabel(category?: string | null) {
  return category && SERVICE_CATEGORY_LABELS[category as ServiceCategory] ? SERVICE_CATEGORY_LABELS[category as ServiceCategory] : "Categoria nao informada";
}

function formatNullablePrice(value?: number | null) {
  return value == null ? "Sob consulta" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDuration(value?: number | null) {
  if (!value) return "Não definida";
  if (value < 60) return `${value} min`;
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return minutes ? `${hours}h${minutes}` : `${hours}h`;
}
