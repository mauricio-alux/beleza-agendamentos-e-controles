"use client";

import { FormEvent, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Ban, Check, HelpCircle, Pencil, Save, Search, X } from "lucide-react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { SERVICE_CATEGORY_LABELS, normalizeServiceCategory, type ServiceCategory } from "@/constants/service-categories";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/messages";
import { servicesService, type SalonService, type SalonServicePayload, type ServiceCatalog } from "@/services/services.service";
import { teamService, type TeamRole } from "@/services/team.service";
import type { TeamSpecialty } from "@/services/team.service";

type SpecialtyConfigForm = {
  especialidade_id: string;
  preco: string;
  duracao_minutos: string;
  dias_retorno_recomendado: string;
  aceita_agendamento_online: boolean;
  ativo: boolean;
};

type OfferFormState = {
  servico_catalogo_id: string;
  ativo: boolean;
  configs: Record<string, SpecialtyConfigForm>;
};

const EMPTY_FORM: OfferFormState = { servico_catalogo_id: "", ativo: true, configs: {} };

function normalizeSearchTerm(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formSignature(form: OfferFormState) {
  return JSON.stringify({
    servico_catalogo_id: form.servico_catalogo_id,
    ativo: form.ativo,
    configs: Object.values(form.configs)
      .map((config) => ({
        especialidade_id: config.especialidade_id,
        preco: config.preco,
        duracao_minutos: config.duracao_minutos,
        dias_retorno_recomendado: config.dias_retorno_recomendado,
        aceita_agendamento_online: config.aceita_agendamento_online,
        ativo: config.ativo
      }))
      .sort((a, b) => a.especialidade_id.localeCompare(b.especialidade_id))
  });
}

export function ServicesMerManager({ embedded = false }: { embedded?: boolean }) {
  const { session } = useAuth();
  const searchParams = useSearchParams();
  const [catalog, setCatalog] = useState<ServiceCatalog[]>([]);
  const [services, setServices] = useState<SalonService[]>([]);
  const [compatibleSpecialties, setCompatibleSpecialties] = useState<TeamSpecialty[]>([]);
  const [roles, setRoles] = useState<TeamRole[]>([]);
  const [form, setForm] = useState<OfferFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSpecialties, setIsLoadingSpecialties] = useState(false);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [isCreatingSpecialty, setIsCreatingSpecialty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [customSpecialtyError, setCustomSpecialtyError] = useState("");
  const [customSpecialtyName, setCustomSpecialtyName] = useState("");
  const [customSpecialtyRoleId, setCustomSpecialtyRoleId] = useState("");
  const [formDirty, setFormDirty] = useState(false);
  const [initialFormSignature, setInitialFormSignature] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [highlightEditor, setHighlightEditor] = useState(false);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const deepLinkedServiceRef = useRef("");

  const selectedCatalog = catalog.find((item) => item.id === form.servico_catalogo_id) || null;
  const selectedService = editingId ? services.find((service) => service.id === editingId) || null : null;
  const selectedSpecialtyIds = Object.keys(form.configs);
  const currentFormSignature = useMemo(() => formSignature(form), [form]);
  const hasPendingChanges = Boolean(editingId && formDirty && currentFormSignature !== initialFormSignature);
  const formValidationMessage = editingId ? validateForm() : "";
  const canSave = Boolean(editingId && hasPendingChanges && !formValidationMessage && !isSaving && !isLoading && !isLoadingSpecialties && form.servico_catalogo_id);
  const filteredServices = useMemo(() => {
    const term = normalizeSearchTerm(serviceSearch);
    if (!term) return services;
    return services.filter((service) => normalizeSearchTerm(service.nome).includes(term));
  }, [serviceSearch, services]);

  function focusEditor() {
    window.setTimeout(() => {
      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      editorRef.current?.focus({ preventScroll: true });
      setHighlightEditor(true);
      window.setTimeout(() => setHighlightEditor(false), 1400);
    }, 50);
  }

  function focusServiceCard(serviceId: string) {
    window.setTimeout(() => {
      const card = document.querySelector<HTMLElement>(`[data-service-offer-id="${serviceId}"]`);
      card?.scrollIntoView({ behavior: "smooth", block: "center" });
      card?.focus({ preventScroll: true });
    }, 80);
  }

  useEffect(() => {
    if (!session) return;
    let active = true;
    setIsLoading(true);
    setError("");
    setMessage("");

    Promise.all([servicesService.listCatalog(session), servicesService.list(session)])
      .then(([nextCatalog, nextServices]) => {
        if (!active) return;
        setCatalog(nextCatalog || []);
        setServices(sortServices(nextServices || []));
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, "Não foi possível carregar os serviços."));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    const serviceId = searchParams.get("servico") || "";
    if (!serviceId || deepLinkedServiceRef.current === serviceId || !services.length) return;
    const service = services.find((item) => item.id === serviceId || item.servico_tenant_id === serviceId);
    if (!service) return;
    deepLinkedServiceRef.current = serviceId;
    startEdit(service);
  }, [searchParams, services]);

  useEffect(() => {
    if (!session || !form.servico_catalogo_id) {
      setCompatibleSpecialties([]);
      setRoles([]);
      return;
    }

    let active = true;
    setIsLoadingSpecialties(true);
    setError("");

    servicesService
      .listCompatibleSpecialties(session, { servico_catalogo_id: form.servico_catalogo_id })
      .then((data) => {
        if (!active) return;
        const next = data || [];
        const allowed = new Set(next.map((specialty) => specialty.id));
        setCompatibleSpecialties(next);
        setForm((current) => ({
          ...current,
          configs: Object.fromEntries(Object.entries(current.configs).filter(([id]) => allowed.has(id)))
        }));
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, "Não foi possível carregar especialidades compatíveis."));
      })
      .finally(() => {
        if (active) setIsLoadingSpecialties(false);
      });

    return () => {
      active = false;
    };
  }, [form.servico_catalogo_id, session]);

  useEffect(() => {
    if (!session || !form.servico_catalogo_id) return;

    let active = true;
    setIsLoadingRoles(true);
    setCustomSpecialtyError("");

    teamService
      .listRoles(session, "Funcionario")
      .then((data) => {
        if (!active) return;
        const operationalRoles = (data || []).filter((role) => role.categoria_profissional !== "administrativo");
        setRoles(operationalRoles);
        setCustomSpecialtyRoleId((current) => current || operationalRoles[0]?.id || "");
      })
      .catch((err) => {
        if (active) setCustomSpecialtyError(getErrorMessage(err, "Nao foi possivel carregar cargos operacionais."));
      })
      .finally(() => {
        if (active) setIsLoadingRoles(false);
      });

    return () => {
      active = false;
    };
  }, [form.servico_catalogo_id, session]);

  function startEdit(service: SalonService) {
    if (formDirty && editingId && editingId !== service.id && !window.confirm("Descartar alteracoes nao salvas e editar outro servico?")) {
      return;
    }
    setEditingId(service.id);
    setError("");
    setMessage("");
    const nextForm = {
      servico_catalogo_id: service.servico_catalogo_id || "",
      ativo: service.ativo !== false,
      configs: Object.fromEntries((service.especialidades_config || []).map((config) => [
        config.especialidade_id,
        {
          especialidade_id: config.especialidade_id,
          preco: config.preco == null ? "" : formatCurrency(config.preco),
          duracao_minutos: config.duracao_minutos == null ? "" : String(config.duracao_minutos),
          dias_retorno_recomendado: config.dias_retorno_recomendado == null ? "" : String(config.dias_retorno_recomendado),
          aceita_agendamento_online: config.ativo === false ? false : config.aceita_agendamento_online !== false,
          ativo: config.ativo !== false
        }
      ]))
    };
    setForm(nextForm);
    setInitialFormSignature(formSignature(nextForm));
    setFormDirty(false);
    focusEditor();
  }

  function validateForm() {
    if (!form.servico_catalogo_id) return "Selecione um servico do catalogo.";
    if (!selectedSpecialtyIds.length) return "Adicione pelo menos uma especialidade compativel.";

    for (const config of Object.values(form.configs)) {
      const duration = config.duracao_minutos.trim() ? Number(config.duracao_minutos) : null;
      const returnDays = config.dias_retorno_recomendado.trim() ? Number(config.dias_retorno_recomendado) : null;
      const price = config.preco.trim() ? parseCurrency(config.preco) : null;
      if (!compatibleSpecialties.some((specialty) => specialty.id === config.especialidade_id)) return "Existe especialidade incompativel no formulario.";
      if (config.ativo && config.aceita_agendamento_online && (duration == null || !Number.isInteger(duration) || duration <= 0)) return "Duracao maior que zero e obrigatoria para combinacoes online.";
      if (price != null && price < 0) return "Preco deve ser maior ou igual a zero.";
      if (returnDays != null && (!Number.isInteger(returnDays) || returnDays <= 0)) return "Retorno deve ser maior que zero quando informado.";
    }

    return "";
  }

  function toPayload(): SalonServicePayload {
    return {
      ativo: form.ativo,
      especialidade_ids: selectedSpecialtyIds,
      especialidades_config: selectedSpecialtyIds.map((id) => {
        const config = form.configs[id];
        return {
          especialidade_id: id,
          preco: config.preco.trim() ? parseCurrency(config.preco) : null,
          duracao_minutos: config.duracao_minutos.trim() ? Number(config.duracao_minutos) : null,
          dias_retorno_recomendado: config.dias_retorno_recomendado.trim() ? Number(config.dias_retorno_recomendado) : null,
          aceita_agendamento_online: config.ativo ? config.aceita_agendamento_online : false,
          ativo: config.ativo
        };
      })
    };
  }

  async function handleCreateCustomSpecialty() {
    if (!session || !selectedCatalog?.categoria || !customSpecialtyRoleId || !customSpecialtyName.trim()) return;

    setIsCreatingSpecialty(true);
    setCustomSpecialtyError("");
    setError("");

    try {
      const specialty = await teamService.createSpecialty(session, {
        cargo_id: customSpecialtyRoleId,
        nome: customSpecialtyName.trim(),
        taxonomy_category_key: selectedCatalog.categoria
      });

      setCompatibleSpecialties((current) => current.some((item) => item.id === specialty.id) ? current : [...current, specialty]);
      setForm((current) => ({
        ...current,
        configs: current.configs[specialty.id]
          ? current.configs
          : {
            ...current.configs,
            [specialty.id]: {
              especialidade_id: specialty.id,
              preco: "",
              duracao_minutos: "",
              dias_retorno_recomendado: "",
              aceita_agendamento_online: true,
              ativo: true
            }
          }
      }));
      setFormDirty(true);
      setCustomSpecialtyName("");
      setMessage("Especialidade customizada criada para este estabelecimento.");
    } catch (err) {
      setCustomSpecialtyError(getErrorMessage(err, "Nao foi possivel criar a especialidade customizada."));
      focusEditor();
    } finally {
      setIsCreatingSpecialty(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const validation = validateForm();
    if (validation) {
      setError(validation);
      focusEditor();
      return;
    }
    if (!hasPendingChanges) return;

    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      if (!editingId) return;
      const saved = await servicesService.update(session, editingId, toPayload());
      setServices((current) => {
        const exists = current.some((item) => item.id === saved.id);
        const next = exists ? current.map((item) => (item.id === saved.id ? saved : item)) : [...current, saved];
        return sortServices(next);
      });
      setEditingId(null);
      setForm(EMPTY_FORM);
      setFormDirty(false);
      setInitialFormSignature("");
      setMessage("Configurações do serviço atualizadas com sucesso.");
      focusServiceCard(saved.id);
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível atualizar a oferta."));
      focusEditor();
    } finally {
      setIsSaving(false);
    }
  }

  async function deactivateOffer(service: SalonService) {
    if (!session) return;
    if (!window.confirm(`Deseja inativar o serviço ${service.nome}? Ele deixará de ser oferecido pelo estabelecimento.`)) return;
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await servicesService.update(session, service.id, { ativo: false });
      setServices((current) => sortServices(current.map((item) => (item.id === service.id ? updated : item))));
      setMessage("Oferta desativada para este estabelecimento.");
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível desativar a oferta."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-5">
      {!embedded ? (
        <div className="rounded-[1.75rem] border border-white/80 bg-white/82 p-5 shadow-soft backdrop-blur-xl sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Catalogo operacional</p>
          <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">Serviços disponíveis para o salão</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Ative os servicos que o salao oferece e configure preco, duracao, retorno e online para cada especialidade compativel.
          </p>
        </div>
      ) : null}

      {error ? <FeedbackMessage tone="error" message={error} /> : null}
      {message ? <FeedbackMessage tone="success" message={message} /> : null}

      {editingId ? (
        <div ref={editorRef} tabIndex={-1} className={`scroll-mt-24 rounded-2xl outline-none transition-shadow ${highlightEditor ? "shadow-[0_0_0_4px_rgba(226,109,124,0.24)]" : ""}`}>
          <DashboardCard title={`Editando oferta: ${selectedService?.nome || "Servico"}`} description="O conceito do catalogo e somente leitura; a configuracao comercial pertence ao estabelecimento.">
            <ServiceOfferForm
              selectedCatalog={selectedCatalog}
              selectedService={selectedService}
              compatibleSpecialties={compatibleSpecialties}
              roles={roles}
              form={form}
              setForm={(value) => {
                setFormDirty(true);
                setForm(value);
              }}
              isLoading={isLoading || isLoadingSpecialties}
              isLoadingRoles={isLoadingRoles}
              isCreatingSpecialty={isCreatingSpecialty}
              isSaving={isSaving}
              hasPendingChanges={hasPendingChanges}
              canSave={canSave}
              customSpecialtyName={customSpecialtyName}
              customSpecialtyRoleId={customSpecialtyRoleId}
              customSpecialtyError={customSpecialtyError}
              onCustomSpecialtyNameChange={setCustomSpecialtyName}
              onCustomSpecialtyRoleChange={setCustomSpecialtyRoleId}
              onCreateCustomSpecialty={handleCreateCustomSpecialty}
              onSubmit={handleSubmit}
              onCancel={() => {
                if (formDirty && !window.confirm("Descartar alteracoes nao salvas?")) return;
                setEditingId(null);
                setForm(EMPTY_FORM);
                setFormDirty(false);
                setInitialFormSignature("");
              }}
            />
          </DashboardCard>
        </div>
      ) : null}

      <DashboardCard title="Serviços disponibilizados ao estabelecimento" description="Serviço disponível pertence ao estabelecimento; serviço ativo é efetivamente oferecido.">
        {isLoading ? (
          <p className="text-sm font-semibold text-muted-foreground">Carregando servicos...</p>
        ) : services.length ? (
          <div className="grid gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" aria-hidden="true" />
              <Input
                value={serviceSearch}
                onChange={(event) => setServiceSearch(event.target.value)}
                placeholder="Pesquisar serviço"
                className="h-12 pr-12 pl-11"
                aria-label="Pesquisar serviço"
              />
              {serviceSearch ? (
                <button
                  type="button"
                  onClick={() => setServiceSearch("")}
                  className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-primary"
                  aria-label="Limpar pesquisa"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            {filteredServices.length ? filteredServices.map((service) => (
              <ServiceOfferCard key={service.id} service={service} onEdit={startEdit} onDeactivate={deactivateOffer} isSaving={isSaving} />
            )) : (
              <div className="rounded-2xl border border-dashed border-border bg-white/70 p-4">
                <p className="text-sm font-bold text-foreground">Nenhum serviço encontrado.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-white/70 p-4">
            <p className="text-sm font-bold text-foreground">Nenhum servico disponibilizado ainda.</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">A sincronizacao cria os servicos permitidos pelos tipos de negocio do estabelecimento.</p>
          </div>
        )}
      </DashboardCard>
    </section>
  );
}

function ServiceOfferForm({
  selectedCatalog,
  selectedService,
  compatibleSpecialties,
  roles,
  form,
  setForm,
  isLoading,
  isLoadingRoles,
  isCreatingSpecialty,
  isSaving,
  hasPendingChanges,
  canSave,
  customSpecialtyName,
  customSpecialtyRoleId,
  customSpecialtyError,
  onCustomSpecialtyNameChange,
  onCustomSpecialtyRoleChange,
  onCreateCustomSpecialty,
  onSubmit,
  onCancel
}: {
  selectedCatalog: ServiceCatalog | null;
  selectedService: SalonService | null;
  compatibleSpecialties: TeamSpecialty[];
  roles: TeamRole[];
  form: OfferFormState;
  setForm: (value: OfferFormState | ((current: OfferFormState) => OfferFormState)) => void;
  isLoading: boolean;
  isLoadingRoles: boolean;
  isCreatingSpecialty: boolean;
  isSaving: boolean;
  hasPendingChanges: boolean;
  canSave: boolean;
  customSpecialtyName: string;
  customSpecialtyRoleId: string;
  customSpecialtyError: string;
  onCustomSpecialtyNameChange: (value: string) => void;
  onCustomSpecialtyRoleChange: (value: string) => void;
  onCreateCustomSpecialty: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
}) {
  function toggleSpecialty(specialty: TeamSpecialty) {
    setForm((current) => {
      const configs = { ...current.configs };
      if (configs[specialty.id]) {
        delete configs[specialty.id];
      } else {
        configs[specialty.id] = {
          especialidade_id: specialty.id,
          preco: "",
          duracao_minutos: "",
          dias_retorno_recomendado: "",
          aceita_agendamento_online: true,
          ativo: true
        };
      }
      return { ...current, configs };
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_0.45fr_auto_auto]">
        <CatalogSummary catalog={selectedCatalog} service={selectedService} />
        <label className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-input bg-white/90 px-4 text-sm font-bold text-foreground">
          <input type="checkbox" checked={form.ativo} onChange={(event) => setForm((current) => ({ ...current, ativo: event.target.checked }))} />
          Servico ativo
        </label>
        <Button type="submit" variant="accent" disabled={!canSave} className="hidden lg:inline-flex">
          <Save className="h-4 w-4" />
          {isSaving ? "Salvando..." : "Salvar"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" size="icon" onClick={onCancel} disabled={isSaving} className="hidden lg:inline-flex" aria-label="Cancelar edicao">
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {selectedCatalog?.natureza === "ocasional" ? <FeedbackMessage tone="info" message="Servico ocasional: retorno recomendado pode nao se aplicar para algumas combinacoes." /> : null}

      {form.servico_catalogo_id && isLoading ? (
        <FeedbackMessage tone="info" message="Carregando especialidades compativeis..." />
      ) : form.servico_catalogo_id && compatibleSpecialties.length ? (
        <>
          <div className="rounded-2xl border border-primary/15 bg-white/85 p-3 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Especialidades compativeis</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {compatibleSpecialties.map((specialty) => {
                const selected = Boolean(form.configs[specialty.id]);
                return (
                  <button
                    key={specialty.id}
                    type="button"
                    onClick={() => toggleSpecialty(specialty)}
                    className={`rounded-full border px-3 py-2 text-xs font-bold transition ${selected ? "border-primary bg-primary text-primary-foreground shadow-blush" : "border-border bg-white text-muted-foreground hover:border-primary/40 hover:text-primary"}`}
                  >
                    {selected ? <Check className="mr-1 inline h-3 w-3" /> : null}
                    {specialty.cargo?.nome ? `${specialty.cargo.nome} - ` : ""}{specialty.nome}
                  </button>
                );
              })}
            </div>
          </div>
          {Object.keys(form.configs).length ? (
            <SpecialtyConfigEditor configs={form.configs} specialties={compatibleSpecialties} onChange={(id, patch) => setForm((current) => ({ ...current, configs: { ...current.configs, [id]: { ...current.configs[id], ...patch } } }))} />
          ) : (
            <FeedbackMessage tone="warning" message="Adicione pelo menos uma especialidade para configurar preco e duracao." />
          )}
          <CustomSpecialtyCreator
            name={customSpecialtyName}
            roleId={customSpecialtyRoleId}
            roles={roles}
            isLoadingRoles={isLoadingRoles}
            isSaving={isCreatingSpecialty}
            error={customSpecialtyError}
            onNameChange={onCustomSpecialtyNameChange}
            onRoleChange={onCustomSpecialtyRoleChange}
            onCreate={onCreateCustomSpecialty}
          />
        </>
      ) : form.servico_catalogo_id ? (
        <>
          <FeedbackMessage tone="warning" message="Servico sem especialidade compativel retornada pelo backend." />
          <CustomSpecialtyCreator
            name={customSpecialtyName}
            roleId={customSpecialtyRoleId}
            roles={roles}
            isLoadingRoles={isLoadingRoles}
            isSaving={isCreatingSpecialty}
            error={customSpecialtyError}
            onNameChange={onCustomSpecialtyNameChange}
            onRoleChange={onCustomSpecialtyRoleChange}
            onCreate={onCreateCustomSpecialty}
          />
        </>
      ) : null}

      <div className="grid gap-3 rounded-2xl border border-border bg-white/90 p-3 lg:hidden">
        {hasPendingChanges ? <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Alterações não salvas</p> : null}
        <div className="grid gap-2 sm:grid-cols-2">
          {onCancel ? (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
              Cancelar
            </Button>
          ) : null}
          <Button type="submit" variant="accent" disabled={!canSave}>
            <Save className="h-4 w-4" />
            {isSaving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </div>
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
          Use somente quando a tecnica ainda nao existir para este estabelecimento.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <Input value={name} onChange={(event) => onNameChange(event.target.value)} placeholder="Ex.: Trancista" />
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
        <Button type="button" variant="outline" onClick={onCreate} disabled={isSaving || !name.trim() || !roleId}>
          {isSaving ? "Criando..." : "Criar"}
        </Button>
      </div>
      {error ? <FeedbackMessage tone="error" message={error} /> : null}
    </div>
  );
}

function CatalogSummary({ catalog, service }: { catalog: ServiceCatalog | null; service?: SalonService | null }) {
  if (!catalog && !service) {
    return <FeedbackMessage tone="info" message="Servico em edicao nao encontrado no catalogo local." />;
  }
  const typeNames = catalog?.tipos_negocio?.map((item) => item.nome).filter(Boolean) || [];
  return (
    <div className="grid gap-2 rounded-2xl border border-border bg-white/80 p-3 text-sm md:grid-cols-4">
      <Info label="Servico" value={catalog?.nome || service?.nome || "Servico"} />
      <Info label="Categoria" value={categoryLabel(catalog?.categoria || catalog?.categoria_key || service?.categoria || service?.categoria_key)} />
      <Info label="Natureza" value={natureLabel(catalog?.natureza || service?.natureza)} />
      <Info label="Status" value={service?.ativo === false ? "Disponível" : "Ativo"} />
      {typeNames.length ? <p className="text-muted-foreground md:col-span-4">Disponibilizado por: {typeNames.join(", ")}.</p> : null}
      {catalog?.descricao ? <p className="text-muted-foreground md:col-span-4">{catalog.descricao}</p> : null}
    </div>
  );
}

function SpecialtyConfigEditor({ configs, specialties, onChange }: { configs: Record<string, SpecialtyConfigForm>; specialties: TeamSpecialty[]; onChange: (specialtyId: string, patch: Partial<SpecialtyConfigForm>) => void }) {
  const specialtyById = new Map(specialties.map((specialty) => [specialty.id, specialty]));
  const rows = Object.values(configs);
  return (
    <div className="rounded-2xl border border-border bg-white/80">
      <div className="hidden lg:block">
        <div className="grid grid-cols-[1.2fr_0.75fr_0.6fr_0.65fr_0.9fr_0.45fr] gap-2 border-b border-border px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
          <span>Especialidade</span><span>Preco</span><span>Duracao</span><span>Retorno</span>
          <span className="inline-flex items-center gap-1" title="Define se esta especialidade podera ser escolhida pelo cliente no agendamento publico.">
            Agendamento online <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span>Ativa</span>
        </div>
        <div className="grid gap-2 p-3">
          {rows.map((config) => (
            <div key={config.especialidade_id} className="grid grid-cols-[1.2fr_0.75fr_0.6fr_0.65fr_0.9fr_0.45fr] items-center gap-2 text-sm">
              <span className="min-w-0 truncate font-semibold text-foreground">{specialtyById.get(config.especialidade_id)?.nome || "Especialidade"}</span>
              <Input value={config.preco} onChange={(event) => onChange(config.especialidade_id, { preco: formatCurrencyInput(event.target.value) })} placeholder="Sob consulta" />
              <Input type="number" min={1} value={config.duracao_minutos} onChange={(event) => onChange(config.especialidade_id, { duracao_minutos: event.target.value })} placeholder="min" />
              <Input type="number" min={1} value={config.dias_retorno_recomendado} onChange={(event) => onChange(config.especialidade_id, { dias_retorno_recomendado: event.target.value })} placeholder="Nao definido" title="Numero de dias normalmente esperado para o cliente retornar para este servico/especialidade." />
              <input type="checkbox" checked={config.ativo ? config.aceita_agendamento_online : false} disabled={!config.ativo} onChange={(event) => onChange(config.especialidade_id, { aceita_agendamento_online: event.target.checked })} aria-label="Permite agendamento online" title="Define se esta especialidade podera ser escolhida pelo cliente no agendamento publico." />
              <input type="checkbox" checked={config.ativo} onChange={(event) => onChange(config.especialidade_id, { ativo: event.target.checked, aceita_agendamento_online: event.target.checked ? config.aceita_agendamento_online : false })} aria-label="Combinacao ativa" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-3 p-3 lg:hidden">
        {rows.map((config) => (
          <div key={config.especialidade_id} className="grid gap-3 rounded-xl border border-border bg-white/85 p-3">
            <p className="font-semibold text-foreground">{specialtyById.get(config.especialidade_id)?.nome || "Especialidade"}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Preco">
                <Input value={config.preco} onChange={(event) => onChange(config.especialidade_id, { preco: formatCurrencyInput(event.target.value) })} placeholder="Sob consulta" />
              </Field>
              <Field label="Duracao">
                <Input type="number" min={1} value={config.duracao_minutos} onChange={(event) => onChange(config.especialidade_id, { duracao_minutos: event.target.value })} placeholder="min" />
              </Field>
              <Field label="Retorno">
                <Input type="number" min={1} value={config.dias_retorno_recomendado} onChange={(event) => onChange(config.especialidade_id, { dias_retorno_recomendado: event.target.value })} placeholder="Nao definido" />
              </Field>
              <div className="grid gap-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <input type="checkbox" checked={config.ativo} onChange={(event) => onChange(config.especialidade_id, { ativo: event.target.checked, aceita_agendamento_online: event.target.checked ? config.aceita_agendamento_online : false })} />
                  Ativa
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <input type="checkbox" checked={config.ativo ? config.aceita_agendamento_online : false} disabled={!config.ativo} onChange={(event) => onChange(config.especialidade_id, { aceita_agendamento_online: event.target.checked })} />
                  Agendamento online
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

function ServiceOfferCard({ service, onEdit, onDeactivate, isSaving }: { service: SalonService; onEdit: (service: SalonService) => void; onDeactivate: (service: SalonService) => void; isSaving: boolean }) {
  const configs = service.especialidades_config || [];
  const activeConfigs = configs.filter((config) => config.ativo !== false);
  const isActive = service.ativo !== false;
  return (
    <article data-service-offer-id={service.id} tabIndex={-1} className="min-w-0 scroll-mt-28 overflow-hidden rounded-2xl border border-white/80 bg-white/92 p-4 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/35">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="break-words text-base font-bold text-foreground">{service.nome}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{categoryLabel(service.categoria || service.categoria_key)} - {natureLabel(service.natureza)} - {isActive ? "Servico ativo" : "Servico disponivel"}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={isActive ? "default" : "warning"}>{isActive ? "Ativo" : "Disponível para ativar"}</Badge>
            <Badge>{activeConfigs.length} especialidade(s) ativa(s)</Badge>
            {configs.length ? <Badge>{configs.length} configuração(ões)</Badge> : <Badge tone="warning">Configuração pendente</Badge>}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 lg:flex-nowrap">
          <Button type="button" variant="outline" onClick={() => onEdit(service)} disabled={isSaving} aria-label={`Editar serviço ${service.nome}`} title={`Editar serviço ${service.nome}`} className="lg:h-11 lg:w-11 lg:p-0">
            <Pencil className="h-4 w-4" />
            <span className="lg:sr-only">Editar</span>
          </Button>
          <Button type="button" variant="ghost" onClick={() => onDeactivate(service)} disabled={isSaving || service.ativo === false} aria-label={`Inativar serviço ${service.nome}`} title={`Inativar serviço ${service.nome}`} className="lg:h-11 lg:w-11 lg:p-0">
            <Ban className="h-4 w-4" />
            <span className="lg:sr-only">Inativar</span>
          </Button>
        </div>
      </div>
      {configs.length ? (
        <>
        <div className="mt-4 hidden overflow-x-auto rounded-xl border border-border bg-white/80 lg:block">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-[1.2fr_0.7fr_0.6fr_0.7fr_0.85fr_0.45fr] gap-2 border-b border-border px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              <span>Especialidade</span><span>Preco</span><span>Duracao</span><span>Retorno</span>
              <span className="inline-flex items-center gap-1" title="Define se esta especialidade podera ser escolhida pelo cliente no agendamento publico.">
                Agendamento online <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span>Ativa</span>
            </div>
            <div className="grid gap-1 p-3">
              {configs.map((config) => (
                <div key={config.especialidade_id} className="grid grid-cols-[1.2fr_0.7fr_0.6fr_0.7fr_0.85fr_0.45fr] gap-2 text-sm">
                  <span className="font-semibold text-foreground">{config.especialidade?.nome || specialtyName(service, config.especialidade_id)}</span>
                  <span>{formatNullablePrice(config.preco)}</span>
                  <span>{formatDuration(config.duracao_minutos)}</span>
                  <span>{config.dias_retorno_recomendado ? `${config.dias_retorno_recomendado} dias` : "Nao definido"}</span>
                  <span>{config.ativo !== false && config.aceita_agendamento_online !== false ? "Sim" : "Nao"}</span>
                  <span>{config.ativo !== false ? "Sim" : "Nao"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:hidden">
          {configs.map((config) => (
            <div key={config.especialidade_id} className="grid min-w-0 gap-3 rounded-xl border border-border bg-white/80 p-3">
              <div className="min-w-0">
                <p className="break-words text-sm font-bold text-foreground">{config.especialidade?.nome || specialtyName(service, config.especialidade_id)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Configuracao da especialidade</p>
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <MobileConfigFact label="Preco" value={formatNullablePrice(config.preco)} />
                <MobileConfigFact label="Duracao" value={formatDuration(config.duracao_minutos)} />
                <MobileConfigFact label="Retorno" value={config.dias_retorno_recomendado ? `${config.dias_retorno_recomendado} dias` : "Nao definido"} />
                <MobileConfigFact label="Agendamento online" value={config.ativo !== false && config.aceita_agendamento_online !== false ? "Sim" : "Nao"} />
                <MobileConfigFact label="Ativa" value={config.ativo !== false ? "Sim" : "Nao"} />
              </dl>
            </div>
          ))}
        </div>
        </>
      ) : <FeedbackMessage tone="warning" message="Configuração pendente. Adicione pelo menos uma especialidade para configurar preço e duração." />}
    </article>
  );
}

function MobileConfigFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className="mt-1 font-semibold text-foreground">{value}</p></div>;
}

function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "warning" }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${tone === "warning" ? "bg-amber-100 text-amber-800" : "bg-secondary text-primary"}`}>{children}</span>;
}

function categoryLabel(category?: string | null) {
  const normalized = normalizeServiceCategory(category || "");
  return normalized ? SERVICE_CATEGORY_LABELS[normalized as ServiceCategory] : "Categoria nao informada";
}

function natureLabel(nature?: string | null) {
  return nature === "ocasional" ? "Ocasional" : "Recorrente";
}

function parseCurrency(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) / 100 : null;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatCurrencyInput(value: string) {
  const parsed = parseCurrency(value);
  return parsed == null ? "" : formatCurrency(parsed);
}

function formatNullablePrice(value?: number | null) {
  return value == null ? "Sob consulta" : formatCurrency(value);
}

function formatDuration(value?: number | null) {
  if (!value) return "Nao definida";
  if (value < 60) return `${value} min`;
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return minutes ? `${hours}h${minutes}` : `${hours}h`;
}

function specialtyName(service: SalonService, specialtyId: string) {
  return service.especialidades?.find((specialty) => specialty.id === specialtyId)?.nome || "Especialidade";
}

function sortServices(items: SalonService[]) {
  return [...items].sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", { sensitivity: "base" }));
}
