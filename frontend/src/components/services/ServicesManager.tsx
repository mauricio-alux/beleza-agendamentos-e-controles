"use client";

import { FormEvent, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import {
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABELS,
  SERVICE_DURATION_OPTIONS,
  normalizeServiceCategory,
  type ServiceCategory
} from "@/constants/service-categories";
import type { AuthSession } from "@/services/auth.service";
import { useAuth } from "@/hooks/useAuth";
import { servicesService, type SalonService, type SalonServicePayload } from "@/services/services.service";
import { teamService, type TeamRole, type TeamSpecialty } from "@/services/team.service";
import { getErrorMessage } from "@/lib/messages";

type ServiceFormState = {
  nome: string;
  duracao_minutos: number;
  customDuration: string;
  preco: string;
  categoria: ServiceCategory | "";
  especialidade_ids: string[];
  especialidades_config: Record<string, {
    duracao_minutos: string;
    preco: string;
    dias_retorno_recomendado: string;
    aceita_agendamento_online: boolean;
  }>;
};

// Legacy: mantido temporariamente para auditoria. A rota /servicos usa ServicesMerManager.
const DEFAULT_SERVICE_PRICE = "R$ 80,00";

const EMPTY_FORM: ServiceFormState = {
  nome: "",
  duracao_minutos: 45,
  customDuration: "",
  preco: DEFAULT_SERVICE_PRICE,
  categoria: "",
  especialidade_ids: [],
  especialidades_config: {}
};

export function ServicesManager({ embedded = false }: { embedded?: boolean }) {
  const { session } = useAuth();
  const [services, setServices] = useState<SalonService[]>([]);
  const [form, setForm] = useState<ServiceFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<ServiceFormState>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    if (!session) return;

    setIsLoading(true);
    setError("");

    try {
      const data = await servicesService.list(session);
      setServices(data || []);
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível carregar os serviços."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [session]);

  function toPayload(state: ServiceFormState): SalonServicePayload {
    const duration = state.duracao_minutos === 0 ? Number(state.customDuration) : state.duracao_minutos;
    const price = parseCurrency(state.preco);
    return {
      nome: state.nome.trim(),
      duracao_minutos: duration,
      preco: price,
      categoria: state.categoria || null,
      permite_online: true,
      especialidade_ids: state.especialidade_ids,
      especialidades_config: state.especialidade_ids.map((especialidadeId) => {
        const config = state.especialidades_config[especialidadeId];
        return {
          especialidade_id: especialidadeId,
          duracao_minutos: Number(config?.duracao_minutos || duration),
          preco: config?.preco ? parseCurrency(config.preco) : price,
          dias_retorno_recomendado: config?.dias_retorno_recomendado ? Number(config.dias_retorno_recomendado) : undefined,
          aceita_agendamento_online: config?.aceita_agendamento_online !== false
        };
      })
    };
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !form.nome.trim()) return;

    setIsSaving(true);
    setError("");

    try {
      const created = await servicesService.create(session, toPayload(form));
      setServices((current) => [...current, created]);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível criar o serviço."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdate(id: string) {
    if (!session || !editingForm.nome.trim()) return;

    setIsSaving(true);
    setError("");

    try {
      const payload = toPayload(editingForm);

      if (process.env.NODE_ENV !== "production") {
        console.debug("[services:update]", {
          service_id: id,
          nome: editingForm.nome,
          categoria: editingForm.categoria,
          especialidade_ids: editingForm.especialidade_ids,
          payload
        });
      }

      const updated = await servicesService.update(session, id, payload);
      setServices((current) => current.map((service) => (service.id === id ? updated : service)));
      setEditingId(null);
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível atualizar o serviço."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemove(id: string) {
    if (!session) return;

    setIsSaving(true);
    setError("");

    try {
      await servicesService.remove(session, id);
      setServices((current) => current.filter((service) => service.id !== id));
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível remover o serviço."));
    } finally {
      setIsSaving(false);
    }
  }

  function startEdit(service: SalonService) {
    const serviceDuration = service.duracao_minutos || 45;
    setEditingId(service.id);
    setEditingForm({
      nome: service.nome,
      duracao_minutos: SERVICE_DURATION_OPTIONS.includes(serviceDuration as never) ? serviceDuration : 0,
      customDuration: SERVICE_DURATION_OPTIONS.includes(serviceDuration as never) ? "" : String(serviceDuration),
      preco: formatCurrency(service.preco || 0),
      categoria: normalizeServiceCategory(
        service.categoria
        || service.taxonomy_category_key
        || (service.metadata?.taxonomy_category_key as string | undefined)
      ),
      especialidade_ids: service.especialidade_ids || [],
      especialidades_config: Object.fromEntries((service.especialidades_config || []).map((config) => [
        config.especialidade_id,
        {
          duracao_minutos: String(config.duracao_minutos || service.duracao_minutos || 45),
          preco: formatCurrency(Number(config.preco ?? service.preco ?? 0)),
          dias_retorno_recomendado: config.dias_retorno_recomendado ? String(config.dias_retorno_recomendado) : "",
          aceita_agendamento_online: config.aceita_agendamento_online !== false
        }
      ]))
    });
  }

  return (
    <section className="space-y-5">
      {!embedded ? (
      <div className="rounded-[1.75rem] border border-white/80 bg-white/82 p-5 shadow-soft backdrop-blur-xl sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Catalogo operacional</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">Serviços do salão</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Cadastre nome, duracao, preco e categoria para alimentar agenda, KPIs e campanhas futuras.
        </p>
      </div>
      ) : null}

      {error ? (
        <FeedbackMessage tone="error" message={error} />
      ) : null}

      {!editingId ? (
        <DashboardCard title="Novo servico" description="Comece simples. Voce pode ajustar depois.">
          <ServiceForm
            session={session}
            form={form}
            setForm={setForm}
            onSubmit={handleCreate}
            submitLabel="Adicionar"
            isSaving={isSaving}
            existingServices={services}
          />
        </DashboardCard>
      ) : null}

      <DashboardCard title="Serviços cadastrados" description="Duração e preço já impactam a agenda e os indicadores.">
        {isLoading ? (
          <p className="text-sm font-semibold text-muted-foreground">Carregando servicos...</p>
        ) : services.length ? (
          <div className="grid gap-3">
            {services.map((service) => (
              <div key={service.id} className="rounded-2xl border border-white/80 bg-white/92 p-4 shadow-sm">
                {editingId === service.id ? (
                  <ServiceForm
                    form={editingForm}
                    setForm={setEditingForm}
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleUpdate(service.id);
                    }}
                    submitLabel="Salvar"
                    isSaving={isSaving}
                    session={session}
                    existingServices={services}
                    excludedServiceId={service.id}
                    editingService={service}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-base font-bold text-foreground">{service.nome}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {service.duracao_minutos || 0} min · {formatCurrency(service.preco || 0)}
                        {normalizeServiceCategory(service.categoria) ? ` · ${SERVICE_CATEGORY_LABELS[normalizeServiceCategory(service.categoria) as ServiceCategory]}` : ""}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(service.especialidades || []).length ? (
                          service.especialidades?.map((specialty) => (
                            <span key={specialty.id} className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">
                              {specialty.nome}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs font-semibold text-muted-foreground">Sem especialidades vinculadas.</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="icon" onClick={() => startEdit(service)} aria-label="Editar servico">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemove(service.id)} aria-label="Remover servico">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            Nenhum servico cadastrado ainda. Adicione o primeiro servico para liberar calculos mais precisos da agenda.
          </p>
        )}
      </DashboardCard>
    </section>
  );
}

function ServiceForm({
  session,
  form,
  setForm,
  onSubmit,
  submitLabel,
  isSaving,
  existingServices,
  excludedServiceId,
  editingService,
  onCancel
}: {
  session: AuthSession | null;
  form: ServiceFormState;
  setForm: Dispatch<SetStateAction<ServiceFormState>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  isSaving: boolean;
  existingServices: SalonService[];
  excludedServiceId?: string;
  editingService?: SalonService;
  onCancel?: () => void;
}) {
  const [compatibleSpecialties, setCompatibleSpecialties] = useState<TeamSpecialty[]>([]);
  const [roles, setRoles] = useState<TeamRole[]>([]);
  const [isLoadingSpecialties, setIsLoadingSpecialties] = useState(false);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [isCreatingSpecialty, setIsCreatingSpecialty] = useState(false);
  const [specialtyError, setSpecialtyError] = useState("");
  const [customSpecialtyError, setCustomSpecialtyError] = useState("");
  const [customSpecialtyName, setCustomSpecialtyName] = useState("");
  const [customSpecialtyRoleId, setCustomSpecialtyRoleId] = useState("");
  const hasCompatibilityContext = form.nome.trim().length >= 2 && Boolean(form.categoria);
  const hasDuplicateService = hasCompatibilityContext && existingServices.some((service) => (
    service.id !== excludedServiceId
    && normalizeComparableName(service.nome) === normalizeComparableName(form.nome)
    && normalizeServiceCategory(service.categoria) === form.categoria
  ));
  const canSubmitService = hasCompatibilityContext
    && !hasDuplicateService
    && !isLoadingSpecialties
    && !specialtyError
    && form.especialidade_ids.length > 0
    && compatibleSpecialties.length > 0
    && !isSaving;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!canSubmitService) {
      event.preventDefault();
      return;
    }

    onSubmit(event);
  }

  useEffect(() => {
    if (!session) return;

    if (!hasCompatibilityContext) {
      setCompatibleSpecialties([]);
      setSpecialtyError("");
      setIsLoadingSpecialties(false);
      setForm((current) => (
        current.especialidade_ids.length ? { ...current, especialidade_ids: [] } : current
      ));
      return;
    }

    let isActive = true;
    setIsLoadingSpecialties(true);
    setSpecialtyError("");

    const timeoutId = window.setTimeout(async () => {
      try {
        const data = await servicesService.listCompatibleSpecialties(session, {
          nome: form.nome.trim(),
          categoria: form.categoria
        });

        if (!isActive) return;

        const nextSpecialties = data || [];
        const allowedIds = new Set(nextSpecialties.map((specialty) => specialty.id));

        setCompatibleSpecialties(nextSpecialties);
        setForm((current) => {
          const filteredIds = current.especialidade_ids.filter((id) => allowedIds.has(id));
          return filteredIds.length === current.especialidade_ids.length
            ? current
            : { ...current, especialidade_ids: filteredIds };
        });
      } catch (err) {
        if (!isActive) return;
        setCompatibleSpecialties([]);
        setSpecialtyError(getErrorMessage(err, "Não foi possível carregar especialidades compatíveis."));
      } finally {
        if (isActive) {
          setIsLoadingSpecialties(false);
        }
      }
    }, 300);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [
    form.nome,
    form.categoria,
    hasCompatibilityContext,
    session,
    setForm
  ]);

  useEffect(() => {
    if (!session || !hasCompatibilityContext) return;

    let isActive = true;
    setIsLoadingRoles(true);

    teamService
      .listRoles(session, "Funcionario")
      .then((data) => {
        if (!isActive) return;
        const operationalRoles = (data || []).filter((role) => role.categoria_profissional !== "administrativo");
        setRoles(operationalRoles);
        setCustomSpecialtyRoleId((current) => current || operationalRoles[0]?.id || "");
      })
      .catch((err) => {
        if (isActive) setCustomSpecialtyError(getErrorMessage(err, "Não foi possível carregar cargos operacionais."));
      })
      .finally(() => {
        if (isActive) setIsLoadingRoles(false);
      });

    return () => {
      isActive = false;
    };
  }, [hasCompatibilityContext, session]);

  async function handleCreateCustomSpecialty() {
    if (!session || !form.categoria || !customSpecialtyRoleId || !customSpecialtyName.trim()) return;

    setIsCreatingSpecialty(true);
    setCustomSpecialtyError("");

    try {
      const specialty = await teamService.createSpecialty(session, {
        cargo_id: customSpecialtyRoleId,
        nome: customSpecialtyName.trim(),
        taxonomy_category_key: form.categoria
      });

      setCompatibleSpecialties((current) => {
        const exists = current.some((item) => item.id === specialty.id);
        return exists ? current : [...current, specialty];
      });
      setForm((current) => ({
        ...current,
        especialidade_ids: current.especialidade_ids.includes(specialty.id)
          ? current.especialidade_ids
          : [...current.especialidade_ids, specialty.id],
        especialidades_config: current.especialidades_config[specialty.id]
          ? current.especialidades_config
          : {
            ...current.especialidades_config,
            [specialty.id]: {
              duracao_minutos: current.duracao_minutos === 0 ? current.customDuration || "45" : String(current.duracao_minutos),
              preco: current.preco,
              dias_retorno_recomendado: "",
              aceita_agendamento_online: true
            }
          }
      }));
      setCustomSpecialtyName("");
    } catch (err) {
      setCustomSpecialtyError(getErrorMessage(err, "Não foi possível criar a especialidade customizada."));
    } finally {
      setIsCreatingSpecialty(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-3 lg:grid-cols-[1.3fr_0.9fr_0.9fr_1fr_auto_auto]">
        <Input
          value={form.nome}
          onChange={(event) => {
            setCompatibleSpecialties([]);
            setSpecialtyError("");
            setForm((current) => ({ ...current, nome: event.target.value, especialidade_ids: [], especialidades_config: {} }));
          }}
          placeholder="Nome do servico"
        />
        <DurationField form={form} setForm={setForm} />
        <Input
          value={form.preco}
          onChange={(event) => setForm((current) => ({ ...current, preco: formatCurrencyInput(event.target.value) }))}
          placeholder={DEFAULT_SERVICE_PRICE}
        />
        <CategoryField
          value={form.categoria}
          onChange={(categoria) => {
            setCompatibleSpecialties([]);
            setSpecialtyError("");
            setForm((current) => ({ ...current, categoria, especialidade_ids: [], especialidades_config: {} }));
          }}
        />
        <Button type="submit" variant="accent" disabled={!canSubmitService}>
          {submitLabel === "Salvar" ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {isSaving ? "Salvando..." : submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" size="icon" onClick={onCancel} aria-label="Cancelar edicao">
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      {hasDuplicateService ? (
        <FeedbackMessage tone="error" message="Já existe um serviço ativo com este nome e categoria." />
      ) : !hasCompatibilityContext ? (
        <FeedbackMessage tone="info" message="Informe nome e categoria para carregar especialidades compativeis." />
      ) : isLoadingSpecialties ? (
        <FeedbackMessage tone="info" message="Carregando especialidades compativeis..." />
      ) : specialtyError ? (
        <FeedbackMessage tone="error" message={specialtyError} />
      ) : compatibleSpecialties.length ? (
        <>
          <SpecialtyPicker
            specialties={compatibleSpecialties}
            selectedIds={form.especialidade_ids}
            onToggle={(specialtyId) => {
              setForm((current) => {
                const selected = current.especialidade_ids.includes(specialtyId);
                const nextConfig = { ...current.especialidades_config };
                if (selected) {
                  delete nextConfig[specialtyId];
                } else if (!nextConfig[specialtyId]) {
                  const duration = current.duracao_minutos === 0 ? current.customDuration : String(current.duracao_minutos);
                  nextConfig[specialtyId] = {
                    duracao_minutos: duration || "45",
                    preco: current.preco,
                    dias_retorno_recomendado: "",
                    aceita_agendamento_online: true
                  };
                }
                return {
                  ...current,
                  especialidade_ids: selected
                    ? current.especialidade_ids.filter((id) => id !== specialtyId)
                    : [...current.especialidade_ids, specialtyId],
                  especialidades_config: nextConfig
                };
              });
            }}
          />
          {!form.especialidade_ids.length ? (
            <FeedbackMessage tone="warning" message="Selecione ao menos uma especialidade para salvar este servico." />
          ) : null}
          {form.especialidade_ids.length ? (
            <SpecialtyConfigEditor
              form={form}
              setForm={setForm}
              specialties={compatibleSpecialties}
            />
          ) : null}
          <CustomSpecialtyCreator
            name={customSpecialtyName}
            roleId={customSpecialtyRoleId}
            roles={roles}
            isLoadingRoles={isLoadingRoles}
            isSaving={isCreatingSpecialty}
            error={customSpecialtyError}
            onNameChange={setCustomSpecialtyName}
            onRoleChange={setCustomSpecialtyRoleId}
            onCreate={handleCreateCustomSpecialty}
          />
        </>
      ) : (
        <>
          <FeedbackMessage tone="warning" message="Nenhuma especialidade compativel encontrada. Crie uma especialidade customizada vinculada a esta categoria oficial." />
          <CustomSpecialtyCreator
            name={customSpecialtyName}
            roleId={customSpecialtyRoleId}
            roles={roles}
            isLoadingRoles={isLoadingRoles}
            isSaving={isCreatingSpecialty}
            error={customSpecialtyError}
            onNameChange={setCustomSpecialtyName}
            onRoleChange={setCustomSpecialtyRoleId}
            onCreate={handleCreateCustomSpecialty}
          />
        </>
      )}
    </form>
  );
}

function CustomSpecialtyCreator({
  name,
  roleId,
  roles,
  isLoadingRoles,
  isSaving,
  error,
  onNameChange,
  onRoleChange,
  onCreate
}: {
  name: string;
  roleId: string;
  roles: TeamRole[];
  isLoadingRoles: boolean;
  isSaving: boolean;
  error: string;
  onNameChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="grid gap-3 rounded-2xl border border-dashed border-primary/25 bg-primary/5 p-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Especialidade customizada</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Use quando o servico pertencer a categoria oficial, mas a tecnica ainda nao existir no catalogo do salao.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <Input
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Ex.: Trancista"
        />
        <select
          value={roleId}
          onChange={(event) => onRoleChange(event.target.value)}
          disabled={isLoadingRoles}
          className="h-12 w-full rounded-2xl border border-input bg-white/90 px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
        >
          <option value="">{isLoadingRoles ? "Carregando cargos..." : "Cargo operacional"}</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>{role.nome}</option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          onClick={onCreate}
          disabled={isSaving || !name.trim() || !roleId}
        >
          <Plus className="h-4 w-4" />
          {isSaving ? "Criando..." : "Criar"}
        </Button>
      </div>
      {error ? <FeedbackMessage tone="error" message={error} /> : null}
    </div>
  );
}

function SpecialtyPicker({
  specialties,
  selectedIds,
  onToggle
}: {
  specialties: TeamSpecialty[];
  selectedIds: string[];
  onToggle: (specialtyId: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-primary/15 bg-white/85 p-3 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Especialidades disponiveis</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Marque quais especialidades compativeis ficarao vinculadas a este servico.
      </p>
      {specialties.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {specialties.map((specialty) => {
            const selected = selectedIds.includes(specialty.id);
            return (
              <button
                key={specialty.id}
                type="button"
                onClick={() => onToggle(specialty.id)}
                className={`rounded-full border px-3 py-2 text-xs font-bold transition ${
                  selected
                    ? "border-primary bg-primary text-primary-foreground shadow-blush"
                    : "border-border bg-white text-muted-foreground hover:border-primary/40 hover:text-primary"
                }`}
              >
                {specialty.cargo?.nome ? `${specialty.cargo.nome} - ` : ""}{specialty.nome}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Nenhuma especialidade cadastrada para vincular.</p>
      )}
    </div>
  );
}

function SpecialtyConfigEditor({
  form,
  setForm,
  specialties
}: {
  form: ServiceFormState;
  setForm: Dispatch<SetStateAction<ServiceFormState>>;
  specialties: TeamSpecialty[];
}) {
  const specialtyById = new Map(specialties.map((specialty) => [specialty.id, specialty]));

  function updateConfig(specialtyId: string, patch: Partial<ServiceFormState["especialidades_config"][string]>) {
    setForm((current) => ({
      ...current,
      especialidades_config: {
        ...current.especialidades_config,
        [specialtyId]: {
          duracao_minutos: current.especialidades_config[specialtyId]?.duracao_minutos || String(current.duracao_minutos || 45),
          preco: current.especialidades_config[specialtyId]?.preco || current.preco,
          dias_retorno_recomendado: current.especialidades_config[specialtyId]?.dias_retorno_recomendado || "",
          aceita_agendamento_online: current.especialidades_config[specialtyId]?.aceita_agendamento_online !== false,
          ...patch
        }
      }
    }));
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white/80">
      <div className="grid grid-cols-[1.2fr_0.7fr_0.8fr_0.7fr_0.5fr] gap-2 border-b border-border px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
        <span>Especialidade</span>
        <span>Duracao</span>
        <span>Preco</span>
        <span>Retorno</span>
        <span>Online</span>
      </div>
      <div className="grid gap-2 p-3">
        {form.especialidade_ids.map((specialtyId) => {
          const config = form.especialidades_config[specialtyId] || {
            duracao_minutos: String(form.duracao_minutos || 45),
            preco: form.preco,
            dias_retorno_recomendado: "",
            aceita_agendamento_online: true
          };
          return (
            <div key={specialtyId} className="grid grid-cols-[1.2fr_0.7fr_0.8fr_0.7fr_0.5fr] items-center gap-2 text-sm">
              <span className="min-w-0 truncate font-semibold text-foreground">{specialtyById.get(specialtyId)?.nome || "Especialidade"}</span>
              <Input
                type="number"
                min={1}
                value={config.duracao_minutos}
                onChange={(event) => updateConfig(specialtyId, { duracao_minutos: event.target.value })}
              />
              <Input
                value={config.preco}
                onChange={(event) => updateConfig(specialtyId, { preco: formatCurrencyInput(event.target.value) })}
              />
              <Input
                type="number"
                min={1}
                value={config.dias_retorno_recomendado}
                placeholder="dias"
                onChange={(event) => updateConfig(specialtyId, { dias_retorno_recomendado: event.target.value })}
              />
              <input
                type="checkbox"
                checked={config.aceita_agendamento_online !== false}
                onChange={(event) => updateConfig(specialtyId, { aceita_agendamento_online: event.target.checked })}
                aria-label="Aceita agendamento online"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DurationField({ form, setForm }: { form: ServiceFormState; setForm: Dispatch<SetStateAction<ServiceFormState>> }) {
  return (
    <div className="grid gap-2">
      <select
        value={form.duracao_minutos}
        onChange={(event) => setForm((current) => ({ ...current, duracao_minutos: Number(event.target.value) }))}
        className="h-12 w-full rounded-2xl border border-input bg-white/90 px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
      >
        {SERVICE_DURATION_OPTIONS.map((option) => (
          <option key={option} value={option}>{option} min</option>
        ))}
        <option value={0}>Personalizado</option>
      </select>
      {form.duracao_minutos === 0 ? (
        <Input
          type="number"
          min={1}
          value={form.customDuration}
          onChange={(event) => setForm((current) => ({ ...current, customDuration: event.target.value }))}
          placeholder="75 min"
        />
      ) : null}
    </div>
  );
}

function CategoryField({ value, onChange }: { value: ServiceCategory | ""; onChange: (value: ServiceCategory | "") => void }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as ServiceCategory | "")}
      className="h-12 w-full rounded-2xl border border-input bg-white/90 px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
    >
      <option value="">Categoria oficial</option>
      {SERVICE_CATEGORIES.map((category) => (
        <option key={category} value={category}>{SERVICE_CATEGORY_LABELS[category]}</option>
      ))}
    </select>
  );
}

function parseCurrency(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) / 100 : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function formatCurrencyInput(value: string) {
  return formatCurrency(parseCurrency(value));
}

function normalizeComparableName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}
