"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, Pencil, Plus, Save, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ServicesManager } from "@/components/services/ServicesManager";
import { SERVICE_CATEGORIES, SERVICE_CATEGORY_LABELS, type ServiceCategory } from "@/constants/service-categories";
import { useAuth } from "@/hooks/useAuth";
import { servicesService, type SalonService } from "@/services/services.service";
import { teamService, type TeamRole, type TeamSpecialty } from "@/services/team.service";

type OperationalTab = "services" | "specialties" | "role-specialties" | "service-specialties";

const TABS: Array<{ id: OperationalTab; label: string; href: string }> = [
  { id: "services", label: "Servicos", href: "/configuracoes/servicos" },
  { id: "specialties", label: "Especialidades", href: "/configuracoes/especialidades" },
  { id: "role-specialties", label: "Cargos x Especialidades", href: "/configuracoes/cargos-especialidades" },
  { id: "service-specialties", label: "Servicos x Especialidades", href: "/configuracoes/servico-especialidades" }
];

export function OperationalCatalogManager({ tab }: { tab: OperationalTab }) {
  const { session } = useAuth();
  const [roles, setRoles] = useState<TeamRole[]>([]);
  const [specialties, setSpecialties] = useState<TeamSpecialty[]>([]);
  const [services, setServices] = useState<SalonService[]>([]);
  const [selectedCargoId, setSelectedCargoId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [search, setSearch] = useState("");
  const [draftSpecialtyIds, setDraftSpecialtyIds] = useState<string[]>([]);
  const [roleForm, setRoleForm] = useState({ nome: "", descricao: "", categoria_profissional: "operacional" as "operacional" | "administrativo" });
  const [editingRoleId, setEditingRoleId] = useState("");
  const [specialtyForm, setSpecialtyForm] = useState({ cargo_id: "", nome: "", descricao: "", taxonomy_category_key: "" as ServiceCategory | "" });
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
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar as configuracoes operacionais.");
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
      return byCargo && bySearch;
    });
  }, [selectedCargoId, search, specialties]);

  const selectedService = services.find((service) => service.id === selectedServiceId) || null;

  function linkedServicesForSpecialty(specialtyId: string) {
    return services.filter((service) => service.especialidade_ids?.includes(specialtyId));
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
      setError(err instanceof Error ? err.message : "Nao foi possivel atualizar a especialidade.");
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
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar o cargo.");
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
      if (selectedCargoId === role.id) setSelectedCargoId("");
      setMessage("Cargo excluido.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel excluir o cargo.");
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
    if (!session || !specialtyForm.cargo_id || !specialtyForm.taxonomy_category_key || !specialtyForm.nome.trim()) return;

    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        cargo_id: specialtyForm.cargo_id,
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
      setSpecialtyForm({ cargo_id: selectedCargoId || "", nome: "", descricao: "", taxonomy_category_key: "" });
      setEditingSpecialtyId("");
      setMessage(editingSpecialtyId ? "Especialidade atualizada." : "Especialidade criada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar a especialidade.");
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
      setError(err instanceof Error ? err.message : "Nao foi possivel excluir a especialidade.");
    } finally {
      setIsSaving(false);
    }
  }

  function startEditSpecialty(specialty: TeamSpecialty) {
    setEditingSpecialtyId(specialty.id);
    setSpecialtyForm({
      cargo_id: specialty.cargo_id,
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
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar os vinculos.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-5">
      <div className="rounded-[1.75rem] border border-white/80 bg-white/82 p-5 shadow-soft backdrop-blur-xl sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Configuracoes operacionais</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">Servicos e especialidades</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Mantenha servicos, especialidades e vinculos operacionais usados pela equipe e pela agenda.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <Button key={item.id} asChild variant={tab === item.id ? "accent" : "outline"}>
            <Link href={item.href}>{item.label}</Link>
          </Button>
        ))}
      </div>

      {(error || message) ? (
        <div className={`rounded-2xl px-5 py-4 text-sm font-black shadow-lg ${
          error ? "border-2 border-red-700 bg-red-700 text-white" : "border border-primary/20 bg-secondary text-primary"
        }`}>
          {error || message}
        </div>
      ) : null}

      {tab === "services" ? <ServicesManager embedded /> : null}

      {tab !== "services" ? (
        <DashboardCard title="Filtros" description="Refine a manutencao operacional.">
          <div className="grid gap-3 md:grid-cols-[0.8fr_1fr]">
            <select
              value={selectedCargoId}
              onChange={(event) => setSelectedCargoId(event.target.value)}
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
          linkedServicesForSpecialty={linkedServicesForSpecialty}
          onToggleStatus={toggleSpecialtyStatus}
          form={specialtyForm}
          setForm={setSpecialtyForm}
          roles={roles}
          onSave={saveSpecialty}
          editingId={editingSpecialtyId}
          onCancelEdit={() => {
            setEditingSpecialtyId("");
            setSpecialtyForm({ cargo_id: selectedCargoId || "", nome: "", descricao: "", taxonomy_category_key: "" });
          }}
          onEdit={startEditSpecialty}
          onRemove={removeSpecialty}
          isSaving={isSaving}
        />
      ) : null}

      {!isLoading && tab === "role-specialties" ? (
        <RoleSpecialtiesPanel
          roles={roles}
          specialties={filteredSpecialties}
          selectedCargoId={selectedCargoId}
          onSelectCargo={setSelectedCargoId}
          linkedServicesForSpecialty={linkedServicesForSpecialty}
          onToggleStatus={toggleSpecialtyStatus}
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
          onEditSpecialty={startEditSpecialty}
          onRemoveSpecialty={removeSpecialty}
          isSaving={isSaving}
        />
      ) : null}

      {!isLoading && tab === "service-specialties" ? (
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
  linkedServicesForSpecialty,
  onToggleStatus,
  form,
  setForm,
  roles,
  onSave,
  editingId,
  onCancelEdit,
  onEdit,
  onRemove,
  isSaving
}: {
  specialties: TeamSpecialty[];
  linkedServicesForSpecialty: (specialtyId: string) => SalonService[];
  onToggleStatus: (specialty: TeamSpecialty) => void;
  form: { cargo_id: string; nome: string; descricao: string; taxonomy_category_key: ServiceCategory | "" };
  setForm: (form: { cargo_id: string; nome: string; descricao: string; taxonomy_category_key: ServiceCategory | "" }) => void;
  roles: TeamRole[];
  onSave: () => void;
  editingId: string;
  onCancelEdit: () => void;
  onEdit: (specialty: TeamSpecialty) => void;
  onRemove: (specialty: TeamSpecialty) => void;
  isSaving: boolean;
}) {
  return (
    <DashboardCard title="Especialidades" description="Visualize status operacional e servicos vinculados.">
      <SpecialtyForm
        form={form}
        setForm={setForm}
        roles={roles}
        onSave={onSave}
        editingId={editingId}
        onCancelEdit={onCancelEdit}
        isSaving={isSaving}
      />
      {specialties.length ? (
        <div className="mt-4 grid gap-3">
          {specialties.map((specialty) => (
            <SpecialtyRow
              key={specialty.id}
              specialty={specialty}
              linkedServices={linkedServicesForSpecialty(specialty.id)}
              onToggleStatus={onToggleStatus}
              onEdit={onEdit}
              onRemove={onRemove}
              isSaving={isSaving}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm leading-6 text-muted-foreground">Nenhuma especialidade encontrada para os filtros atuais.</p>
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
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">Nenhuma especialidade relacionada a este cargo.</p>
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
    <DashboardCard title="Servicos x Especialidades" description="Marque quais especialidades podem executar o servico selecionado.">
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
      <Input value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })} placeholder="Descricao opcional" />
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
  roles,
  onSave,
  editingId,
  onCancelEdit,
  isSaving
}: {
  form: { cargo_id: string; nome: string; descricao: string; taxonomy_category_key: ServiceCategory | "" };
  setForm: (form: { cargo_id: string; nome: string; descricao: string; taxonomy_category_key: ServiceCategory | "" }) => void;
  roles: TeamRole[];
  onSave: () => void;
  editingId: string;
  onCancelEdit: () => void;
  isSaving: boolean;
}) {
  const operationalRoles = roles.filter((role) => role.categoria_profissional !== "administrativo");

  return (
    <div className="grid gap-3 md:grid-cols-[0.9fr_0.9fr_1fr_1fr_auto_auto]">
      <select
        value={form.cargo_id}
        onChange={(event) => setForm({ ...form, cargo_id: event.target.value })}
        className="h-11 rounded-xl border border-border bg-white px-3 text-sm font-semibold text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        <option value="">Selecione o cargo</option>
        {operationalRoles.map((role) => (
          <option key={role.id} value={role.id}>{role.nome}</option>
        ))}
      </select>
      <select
        value={form.taxonomy_category_key}
        onChange={(event) => setForm({ ...form, taxonomy_category_key: event.target.value as ServiceCategory | "" })}
        className="h-11 rounded-xl border border-border bg-white px-3 text-sm font-semibold text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        <option value="">Categoria oficial</option>
        {SERVICE_CATEGORIES.map((category) => (
          <option key={category} value={category}>{SERVICE_CATEGORY_LABELS[category]}</option>
        ))}
      </select>
      <Input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} placeholder="Nome da especialidade" />
      <Input value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })} placeholder="Descricao opcional" />
      <Button type="button" variant="accent" onClick={onSave} disabled={isSaving || !form.cargo_id || !form.taxonomy_category_key || !form.nome.trim()}>
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

function SpecialtyRow({
  specialty,
  linkedServices,
  onToggleStatus,
  onEdit,
  onRemove,
  isSaving
}: {
  specialty: TeamSpecialty;
  linkedServices: SalonService[];
  onToggleStatus: (specialty: TeamSpecialty) => void;
  onEdit: (specialty: TeamSpecialty) => void;
  onRemove: (specialty: TeamSpecialty) => void;
  isSaving: boolean;
}) {
  return (
    <article className="rounded-2xl border border-white/80 bg-white/92 p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">{specialty.nome}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{specialty.cargo?.nome || "Cargo nao informado"}</p>
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
          {linkedServices.length ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {linkedServices.map((service) => service.nome).join(", ")}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {specialty.is_custom ? (
            <Button type="button" variant="outline" onClick={() => onEdit(specialty)} disabled={isSaving}>
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={() => onToggleStatus(specialty)} disabled={isSaving}>
            {specialty.ativo === false ? "Ativar" : "Inativar"}
          </Button>
          {specialty.is_custom ? (
            <Button type="button" variant="ghost" onClick={() => onRemove(specialty)} disabled={isSaving}>
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
