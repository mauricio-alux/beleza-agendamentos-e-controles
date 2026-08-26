"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BriefcaseBusiness, Check, Layers3, Pencil, Plus, RefreshCcw, Save, Search, Sparkles, Tags, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/messages";
import {
  businessTypesService,
  type BusinessType,
  type BusinessTypeCatalogAssociation,
  type OperationalProfile,
  type TaxonomyRole,
  type TaxonomySpecialty
} from "@/services/business-types.service";
import type { ServiceCatalog } from "@/services/services.service";
import {
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABELS,
  type ServiceCategory
} from "@/constants/service-categories";

type FormState = {
  id: string;
  nome: string;
  slug: string;
  descricao: string;
  icone: string;
  ordem_exibicao: string;
  ativo: boolean;
};

type CatalogFormState = {
  id: string;
  codigo_canonico: string;
  nome: string;
  descricao: string;
  categoria_key: ServiceCategory | "";
  natureza: "recorrente" | "ocasional";
  ativo: boolean;
};

type RoleFormState = {
  id: string;
  nome: string;
  descricao: string;
  categoria_profissional: "operacional" | "administrativo";
  ativo: boolean;
};

type SpecialtyFormState = {
  id: string;
  cargo_id: string;
  nome: string;
  descricao: string;
  taxonomy_category_key: ServiceCategory | "";
  ativo: boolean;
};

type ProfileDraftState = {
  serviceId: string;
  roleId: string;
  defaultServiceId: string;
  defaultSpecialtyId: string;
  defaultPrice: string;
  defaultDuration: string;
  defaultReturn: string;
};

const EMPTY_FORM: FormState = {
  id: "",
  nome: "",
  slug: "",
  descricao: "",
  icone: "",
  ordem_exibicao: "",
  ativo: true
};

const EMPTY_CATALOG_FORM: CatalogFormState = {
  id: "",
  codigo_canonico: "",
  nome: "",
  descricao: "",
  categoria_key: "",
  natureza: "recorrente",
  ativo: true
};

const EMPTY_ROLE_FORM: RoleFormState = {
  id: "",
  nome: "",
  descricao: "",
  categoria_profissional: "operacional",
  ativo: true
};

const EMPTY_SPECIALTY_FORM: SpecialtyFormState = {
  id: "",
  cargo_id: "",
  nome: "",
  descricao: "",
  taxonomy_category_key: "",
  ativo: true
};

const EMPTY_PROFILE_DRAFT: ProfileDraftState = {
  serviceId: "",
  roleId: "",
  defaultServiceId: "",
  defaultSpecialtyId: "",
  defaultPrice: "",
  defaultDuration: "",
  defaultReturn: ""
};

export function BusinessTypesManager() {
  const { session } = useAuth();
  const [types, setTypes] = useState<BusinessType[]>([]);
  const [catalog, setCatalog] = useState<ServiceCatalog[]>([]);
  const [catalogForm, setCatalogForm] = useState<CatalogFormState>(EMPTY_CATALOG_FORM);
  const [isCreatingCatalog, setIsCreatingCatalog] = useState(false);
  const [roles, setRoles] = useState<TaxonomyRole[]>([]);
  const [specialties, setSpecialties] = useState<TaxonomySpecialty[]>([]);
  const [operationalProfiles, setOperationalProfiles] = useState<OperationalProfile[]>([]);
  const [profileDrafts, setProfileDrafts] = useState<Record<string, ProfileDraftState>>({});
  const [roleForm, setRoleForm] = useState<RoleFormState>(EMPTY_ROLE_FORM);
  const [specialtyForm, setSpecialtyForm] = useState<SpecialtyFormState>(EMPTY_SPECIALTY_FORM);
  const [catalogSpecialtyIds, setCatalogSpecialtyIds] = useState<string[]>([]);
  const [associations, setAssociations] = useState<BusinessTypeCatalogAssociation[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [query, setQuery] = useState("");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [showInactive, setShowInactive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedType = types.find((item) => item.id === selectedTypeId) || null;
  const associationByCatalogId = useMemo(
    () => new Map(associations.map((item) => [item.servico_catalogo_id, item])),
    [associations]
  );
  const filteredTypes = types.filter((item) => {
    const haystack = `${item.nome} ${item.slug}`.toLowerCase();
    return (!query || haystack.includes(query.toLowerCase())) && (showInactive || item.ativo !== false);
  });
  const filteredCatalog = catalog.filter((item) => {
    const haystack = `${item.nome} ${item.codigo_canonico} ${item.categoria}`.toLowerCase();
    return !catalogQuery || haystack.includes(catalogQuery.toLowerCase());
  });
  const activeRoles = roles.filter((role) => role.ativo !== false);
  const activeSpecialties = specialties.filter((specialty) => specialty.ativo !== false);
  const operationalRoles = activeRoles.filter((role) => role.categoria_profissional !== "administrativo");
  const isCatalogEditorOpen = isCreatingCatalog || Boolean(catalogForm.id);
  const activeServiceCategories = useMemo(() => (
    SERVICE_CATEGORIES
      .map((category) => ({ key: category, label: SERVICE_CATEGORY_LABELS[category] }))
      .sort((a, b) => a.label.localeCompare(b.label, "pt-BR", { sensitivity: "base" }))
  ), []);
  const categoryLabel = (value?: string | null) => (
    value && (SERVICE_CATEGORY_LABELS as Record<string, string>)[value] ? (SERVICE_CATEGORY_LABELS as Record<string, string>)[value] : value || "Sem categoria"
  );

  async function load() {
    if (!session) return;
    setIsLoading(true);
    setError("");
    try {
      const [nextTypes, nextCatalog, nextRoles, nextGlobalSpecialties, nextProfiles] = await Promise.all([
        businessTypesService.listAdmin(session, { includeInactive: "true" }),
        businessTypesService.listAdminCatalog(session),
        businessTypesService.listAdminRoles(session),
        businessTypesService.listAdminGlobalSpecialties(session),
        businessTypesService.listOperationalProfiles(session)
      ]);
      setTypes(nextTypes || []);
      setCatalog(nextCatalog || []);
      setRoles(nextRoles || []);
      setSpecialties(nextGlobalSpecialties || []);
      setOperationalProfiles(nextProfiles || []);
      const nextSelected = selectedTypeId || nextTypes?.[0]?.id || "";
      setSelectedTypeId(nextSelected);
      if (nextSelected) {
        setAssociations(await businessTypesService.listAdminTypeServices(session, nextSelected));
      }
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível carregar tipos de negócio."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [session?.access_token]);

  async function selectType(id: string) {
    if (!session) return;
    setSelectedTypeId(id);
    setForm(EMPTY_FORM);
    setError("");
    setMessage("");
    try {
      setAssociations(await businessTypesService.listAdminTypeServices(session, id));
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível carregar associações."));
    }
  }

  function editType(type: BusinessType) {
    setForm({
      id: type.id,
      nome: type.nome,
      slug: type.slug,
      descricao: type.descricao || "",
      icone: type.icone || "",
      ordem_exibicao: type.ordem_exibicao == null ? "" : String(type.ordem_exibicao),
      ativo: type.ativo !== false
    });
  }

  async function editCatalog(item: ServiceCatalog) {
    if (!session) return;
    setIsCreatingCatalog(false);
    setCatalogForm({
      id: item.id,
      codigo_canonico: item.codigo_canonico || "",
      nome: item.nome,
      descricao: item.descricao || "",
      categoria_key: (item.categoria_key || item.categoria || "") as ServiceCategory | "",
      natureza: item.natureza === "ocasional" ? "ocasional" : "recorrente",
      ativo: item.ativo !== false
    });
    setError("");
    setMessage("");
    try {
      const rows = await businessTypesService.listAdminCatalogSpecialties(session, item.id);
      setCatalogSpecialtyIds((rows || []).filter((row) => row.ativo !== false).map((row) => row.especialidade_id));
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível carregar compatibilidades."));
    }
  }

  function keepCatalogHash() {
    if (typeof window === "undefined") return;
    window.history.replaceState(null, "", "#servicos-catalogo");
  }

  function closeCatalogEditor() {
    setCatalogForm(EMPTY_CATALOG_FORM);
    setCatalogSpecialtyIds([]);
    setIsCreatingCatalog(false);
    keepCatalogHash();
  }

  function startCreateCatalog() {
    setCatalogForm(EMPTY_CATALOG_FORM);
    setCatalogSpecialtyIds([]);
    setIsCreatingCatalog(true);
    setError("");
    setMessage("");
    keepCatalogHash();
  }

  async function openCatalogEditor(item: ServiceCatalog) {
    await editCatalog(item);
    setCatalogQuery(item.nome || "");
    if (typeof window === "undefined") return;
    keepCatalogHash();
    window.requestAnimationFrame(() => {
      document.getElementById("servicos-catalogo")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function saveCatalog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setError("");
    setMessage("");
    if (!catalogForm.categoria_key || !activeServiceCategories.some((category) => category.key === catalogForm.categoria_key)) {
      setError("Selecione uma categoria oficial.");
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        codigo_canonico: catalogForm.codigo_canonico.trim() || undefined,
        nome: catalogForm.nome.trim(),
        descricao: catalogForm.descricao.trim() || null,
        categoria_key: catalogForm.categoria_key,
        natureza: catalogForm.natureza,
        ativo: catalogForm.ativo
      };
      const saved = catalogForm.id
        ? await businessTypesService.updateAdminCatalog(session, catalogForm.id, payload)
        : await businessTypesService.createAdminCatalog(session, payload);
      await businessTypesService.replaceAdminCatalogSpecialties(session, saved.id, catalogSpecialtyIds);
      setCatalog((current) => catalogForm.id ? current.map((item) => (item.id === saved.id ? saved : item)) : [...current, saved]);
      closeCatalogEditor();
      setMessage("Servico do catalogo atualizado.");
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível salvar serviço do catálogo."));
    } finally {
      setIsSaving(false);
    }
  }

  function toggleCatalogSpecialty(id: string) {
    setCatalogSpecialtyIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function editRole(role: TaxonomyRole) {
    setRoleForm({
      id: role.id,
      nome: role.nome,
      descricao: role.descricao || "",
      categoria_profissional: role.categoria_profissional || "operacional",
      ativo: role.ativo !== false
    });
  }

  function editSpecialty(specialty: TaxonomySpecialty) {
    setSpecialtyForm({
      id: specialty.id,
      cargo_id: specialty.cargo_id,
      nome: specialty.nome,
      descricao: specialty.descricao || "",
      taxonomy_category_key: (specialty.taxonomy_category_key || "") as ServiceCategory | "",
      ativo: specialty.ativo !== false
    });
  }

  async function saveRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        nome: roleForm.nome.trim(),
        descricao: roleForm.descricao.trim() || null,
        categoria_profissional: roleForm.categoria_profissional,
        ativo: roleForm.ativo
      };
      const saved = roleForm.id
        ? await businessTypesService.updateAdminRole(session, roleForm.id, payload)
        : await businessTypesService.createAdminRole(session, payload);
      setRoles((current) => roleForm.id ? current.map((item) => (item.id === saved.id ? saved : item)) : [...current, saved]);
      setRoleForm(EMPTY_ROLE_FORM);
      setMessage(roleForm.id ? "Cargo atualizado." : "Cargo criado.");
    } catch (err) {
      setError(getErrorMessage(err, "Nao foi possivel salvar cargo."));
    } finally {
      setIsSaving(false);
    }
  }

  async function saveSpecialty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !specialtyForm.cargo_id || !specialtyForm.taxonomy_category_key) return;
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        cargo_id: specialtyForm.cargo_id,
        nome: specialtyForm.nome.trim(),
        descricao: specialtyForm.descricao.trim() || null,
        taxonomy_category_key: specialtyForm.taxonomy_category_key,
        ativo: specialtyForm.ativo
      };
      const saved = specialtyForm.id
        ? await businessTypesService.updateAdminSpecialty(session, specialtyForm.id, payload)
        : await businessTypesService.createAdminSpecialty(session, payload);
      setSpecialties((current) => specialtyForm.id ? current.map((item) => (item.id === saved.id ? saved : item)) : [...current, saved]);
      setSpecialtyForm(EMPTY_SPECIALTY_FORM);
      setMessage(specialtyForm.id ? "Especialidade atualizada." : "Especialidade criada.");
    } catch (err) {
      setError(getErrorMessage(err, "Nao foi possivel salvar especialidade."));
    } finally {
      setIsSaving(false);
    }
  }

  async function saveType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    if (!form.nome.trim()) {
      setError("Nome e obrigatorio.");
      return;
    }

    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        nome: form.nome.trim(),
        slug: form.slug.trim() || undefined,
        descricao: form.descricao.trim() || null,
        icone: form.icone.trim() || null,
        ordem_exibicao: form.ordem_exibicao.trim() ? Number(form.ordem_exibicao) : null,
        ativo: form.ativo
      };
      const saved = form.id
        ? await businessTypesService.updateAdmin(session, form.id, payload)
        : await businessTypesService.createAdmin(session, payload);
      setTypes((current) => form.id ? current.map((item) => (item.id === saved.id ? saved : item)) : [...current, saved]);
      setSelectedTypeId(saved.id);
      setForm(EMPTY_FORM);
      setMessage(form.id ? "Tipo de negocio atualizado." : "Tipo de negocio criado.");
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível salvar tipo de negócio."));
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleStatus(type: BusinessType) {
    if (!session) return;
    setIsSaving(true);
    setError("");
    try {
      const saved = await businessTypesService.updateStatus(session, type.id, !type.ativo);
      setTypes((current) => current.map((item) => (item.id === type.id ? saved : item)));
      setMessage(saved.ativo ? "Tipo ativado." : "Tipo inativado.");
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível alterar status."));
    } finally {
      setIsSaving(false);
    }
  }

  async function saveAssociations(next: BusinessTypeCatalogAssociation[], successMessage = "Associações do catálogo atualizadas.") {
    if (!session || !selectedTypeId || isSaving) return;
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      const saved = await businessTypesService.replaceAdminTypeServices(
        session,
        selectedTypeId,
        next.map((item) => ({
          servico_catalogo_id: item.servico_catalogo_id,
          recomendado: item.recomendado,
          ativo: item.ativo,
          ordem_exibicao: item.ordem_exibicao ?? 0
        }))
      );
      setAssociations(saved);
      setMessage(successMessage);
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível atualizar a associação. Tente novamente."));
    } finally {
      setIsSaving(false);
    }
  }

  async function updateOperationalProfile(profile: OperationalProfile, patch: Partial<OperationalProfile>) {
    if (!session || isSaving) return;
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      const saved = await businessTypesService.updateOperationalProfile(session, profile.id, patch);
      setOperationalProfiles((current) => current.map((item) => item.id === saved.id ? { ...item, ...saved } : item));
      setMessage("Perfil operacional atualizado.");
    } catch (err) {
      setError(getErrorMessage(err, "Nao foi possivel atualizar perfil operacional."));
    } finally {
      setIsSaving(false);
    }
  }

  function profileDraft(profileId: string) {
    return profileDrafts[profileId] || EMPTY_PROFILE_DRAFT;
  }

  function updateProfileDraft(profileId: string, patch: Partial<ProfileDraftState>) {
    setProfileDrafts((current) => ({
      ...current,
      [profileId]: {
        ...(current[profileId] || EMPTY_PROFILE_DRAFT),
        ...patch
      }
    }));
  }

  async function addProfileService(profile: OperationalProfile) {
    const draft = profileDraft(profile.id);
    if (!session || !draft.serviceId || isSaving) return;
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      await businessTypesService.upsertOperationalProfileService(session, profile.id, {
        servico_catalogo_id: draft.serviceId,
        recomendado: true,
        ativo: true,
        prioridade: profile.servicos?.length || 0
      });
      await load();
      setMessage("Servico recomendado atualizado.");
    } catch (err) {
      setError(getErrorMessage(err, "Nao foi possivel atualizar servicos recomendados."));
    } finally {
      setIsSaving(false);
    }
  }

  async function addProfileRole(profile: OperationalProfile) {
    const draft = profileDraft(profile.id);
    if (!session || !draft.roleId || isSaving) return;
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      await businessTypesService.upsertOperationalProfileRole(session, profile.id, {
        cargo_id: draft.roleId,
        recomendado: true,
        ativo: true,
        prioridade: profile.cargos?.length || 0
      });
      await load();
      setMessage("Cargo recomendado atualizado.");
    } catch (err) {
      setError(getErrorMessage(err, "Nao foi possivel atualizar cargos recomendados."));
    } finally {
      setIsSaving(false);
    }
  }

  async function addProfileDefault(profile: OperationalProfile) {
    const draft = profileDraft(profile.id);
    if (!session || !draft.defaultServiceId || isSaving) return;
    setIsSaving(true);
    setError("");
    setMessage("");
    try {
      await businessTypesService.createOperationalProfileDefault(session, {
        perfil_operacional_id: profile.id,
        servico_catalogo_id: draft.defaultServiceId,
        especialidade_id: draft.defaultSpecialtyId || null,
        region_scope: "global",
        preco_referencia: draft.defaultPrice ? Number(draft.defaultPrice) : null,
        duracao_minutos: draft.defaultDuration ? Number(draft.defaultDuration) : null,
        dias_retorno_recomendado: draft.defaultReturn ? Number(draft.defaultReturn) : null,
        aceita_agendamento_online: true,
        fonte: "administrative_reference"
      });
      await load();
      setMessage("Preco inicial de referencia atualizado.");
    } catch (err) {
      setError(getErrorMessage(err, "Nao foi possivel atualizar defaults."));
    } finally {
      setIsSaving(false);
    }
  }

  function toggleCatalogItem(item: ServiceCatalog) {
    if (isSaving || item.ativo === false) return;
    const current = associationByCatalogId.get(item.id);
    const nextActive = current ? !current.ativo : true;
    const next = current
      ? associations.map((association) => association.servico_catalogo_id === item.id ? { ...association, ativo: nextActive } : association)
      : [...associations, { tipo_negocio_id: selectedTypeId, servico_catalogo_id: item.id, recomendado: false, ativo: true, servico_catalogo: item }];
    saveAssociations(
      next,
      selectedType
        ? `${item.nome} ${nextActive ? "agora é aplicável a" : "deixou de ser aplicável a"} ${selectedType.nome}.`
        : "Associação do catálogo atualizada."
    );
  }

  function toggleRecommended(item: ServiceCatalog) {
    if (isSaving || item.ativo === false) return;
    const current = associationByCatalogId.get(item.id);
    const nextRecommended = !current?.recomendado;
    const next = current
      ? associations.map((association) => association.servico_catalogo_id === item.id ? { ...association, ativo: true, recomendado: nextRecommended } : association)
      : [...associations, { tipo_negocio_id: selectedTypeId, servico_catalogo_id: item.id, recomendado: true, ativo: true, servico_catalogo: item }];
    saveAssociations(
      next,
      selectedType
        ? `${item.nome} ${nextRecommended ? "agora é recomendado para" : "não é mais recomendado para"} ${selectedType.nome}.`
        : "Recomendação do catálogo atualizada."
    );
  }

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="flex flex-col gap-4 rounded-2xl border border-white/80 bg-white/85 p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Button asChild variant="ghost" className="mb-2 px-0">
              <Link href="/admin"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
            </Button>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Governanca global</p>
            <h1 className="mt-1 text-2xl font-bold text-foreground">Taxonomia SaaS</h1>
          </div>
          <Button type="button" variant="outline" onClick={load} disabled={isLoading}>
            <RefreshCcw className={isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Atualizar
          </Button>
        </header>

        {error ? <FeedbackMessage tone="error" message={error} /> : null}
        {message ? <FeedbackMessage tone="success" message={message} /> : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TaxonomyMetric icon={Tags} label="Tipos de negocio" value={types.length} hint={`${types.filter((item) => item.ativo !== false).length} ativos`} />
          <TaxonomyMetric icon={Layers3} label="Servicos de catalogo" value={catalog.length} hint={`${catalog.filter((item) => item.ativo !== false).length} ativos`} />
          <TaxonomyMetric icon={Sparkles} label="Especialidades" value={specialties.length} hint={`${activeSpecialties.length} oficiais ativas`} />
          <TaxonomyMetric icon={BriefcaseBusiness} label="Cargos" value={roles.length} hint={`${activeRoles.length} ativos`} />
        </section>

        <nav className="flex flex-wrap gap-2 rounded-2xl border border-white/80 bg-white/85 p-3 shadow-soft">
          {[
            ["#tipos-negocio", "Tipos de negocio"],
            ["#perfis-operacionais", "Perfis operacionais"],
            ["#servicos-catalogo", "Servicos de catalogo"],
            ["#especialidades", "Especialidades"],
            ["#cargos", "Cargos"],
            ["#matrizes", "Matrizes N:N"]
          ].map(([href, label]) => (
            <Button key={href} asChild type="button" variant="outline">
              <a href={href}>{label}</a>
            </Button>
          ))}
        </nav>

        <section id="perfis-operacionais" className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-soft">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-foreground">Perfis operacionais</h2>
            <p className="text-sm text-muted-foreground">Defaults administrativos usados na inicializacao do estabelecimento.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {operationalProfiles.map((profile) => (
              <div key={profile.id} className="rounded-xl border border-border bg-white/75 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-foreground">{profile.tipo_negocio?.nome || profile.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {profile.metrics?.servicos || 0} servicos - {profile.metrics?.cargos || 0} cargos - {profile.metrics?.defaults || 0} defaults
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-bold ${profile.ativo ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                    {profile.ativo ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Field label="Classificacao">
                    <select
                      value={profile.classificacao}
                      onChange={(event) => updateOperationalProfile(profile, { classificacao: event.target.value as OperationalProfile["classificacao"] })}
                      className="h-11 w-full rounded-2xl border border-input bg-white/90 px-3 text-sm font-semibold text-foreground shadow-sm"
                    >
                      <option value="especializado">Especializado</option>
                      <option value="generalista">Generalista</option>
                    </select>
                  </Field>
                  <div className="grid content-end gap-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <input
                        type="checkbox"
                        checked={profile.exige_confirmacao_onboarding}
                        onChange={(event) => updateOperationalProfile(profile, { exige_confirmacao_onboarding: event.target.checked })}
                      />
                      Confirmar no onboarding
                    </label>
                    <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <input
                        type="checkbox"
                        checked={profile.ativo}
                        onChange={(event) => updateOperationalProfile(profile, { ativo: event.target.checked })}
                      />
                      Perfil ativo
                    </label>
                  </div>
                </div>
                <div className="mt-4 grid gap-3">
                  <ProfileSummary
                    title="Servicos recomendados"
                    items={(profile.servicos || []).map((item) => `${item.servico_catalogo?.nome || "Servico"} - ${item.recomendado ? "recomendado" : "opcional"} - ordem ${item.prioridade ?? 0}`)}
                  />
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <select
                      value={profileDraft(profile.id).serviceId}
                      onChange={(event) => updateProfileDraft(profile.id, { serviceId: event.target.value })}
                      className="h-11 w-full rounded-2xl border border-input bg-white/90 px-3 text-sm font-semibold text-foreground shadow-sm"
                    >
                      <option value="">Adicionar servico recomendado</option>
                      {catalog.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
                    </select>
                    <Button type="button" variant="outline" onClick={() => addProfileService(profile)} disabled={isSaving || !profileDraft(profile.id).serviceId}>
                      <Plus className="h-4 w-4" />
                      Adicionar
                    </Button>
                  </div>
                  <ProfileSummary
                    title="Cargos recomendados"
                    items={(profile.cargos || []).map((item) => `${item.cargo?.nome || "Cargo"} - ${item.principal ? "principal" : "recomendado"} - ordem ${item.prioridade ?? 0}`)}
                  />
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <select
                      value={profileDraft(profile.id).roleId}
                      onChange={(event) => updateProfileDraft(profile.id, { roleId: event.target.value })}
                      className="h-11 w-full rounded-2xl border border-input bg-white/90 px-3 text-sm font-semibold text-foreground shadow-sm"
                    >
                      <option value="">Adicionar cargo recomendado</option>
                      {operationalRoles.map((role) => <option key={role.id} value={role.id}>{role.nome}</option>)}
                    </select>
                    <Button type="button" variant="outline" onClick={() => addProfileRole(profile)} disabled={isSaving || !profileDraft(profile.id).roleId}>
                      <Plus className="h-4 w-4" />
                      Adicionar
                    </Button>
                  </div>
                  <ProfileSummary
                    title="Precos iniciais de referencia"
                    items={(profile.defaults || []).slice(0, 6).map((item) => {
                      const serviceName = catalog.find((catalogItem) => catalogItem.id === item.servico_catalogo_id)?.nome || "Servico";
                      const specialtyName = specialties.find((specialty) => specialty.id === item.especialidade_id)?.nome || "geral";
                      return `${serviceName} / ${specialtyName}: R$ ${item.preco_referencia ?? "-"} - ${item.duracao_minutos ?? "-"} min - retorno ${item.dias_retorno_recomendado ?? "-"} dias`;
                    })}
                  />
                  <div className="grid gap-2 md:grid-cols-5">
                    <select
                      value={profileDraft(profile.id).defaultServiceId}
                      onChange={(event) => updateProfileDraft(profile.id, { defaultServiceId: event.target.value, defaultSpecialtyId: "" })}
                      className="h-11 w-full rounded-2xl border border-input bg-white/90 px-3 text-sm font-semibold text-foreground shadow-sm md:col-span-2"
                    >
                      <option value="">Servico</option>
                      {catalog.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
                    </select>
                    <select
                      value={profileDraft(profile.id).defaultSpecialtyId}
                      onChange={(event) => updateProfileDraft(profile.id, { defaultSpecialtyId: event.target.value })}
                      className="h-11 w-full rounded-2xl border border-input bg-white/90 px-3 text-sm font-semibold text-foreground shadow-sm md:col-span-2"
                    >
                      <option value="">Especialidade geral</option>
                      {activeSpecialties.map((specialty) => <option key={specialty.id} value={specialty.id}>{specialty.nome}</option>)}
                    </select>
                    <Input value={profileDraft(profile.id).defaultPrice} onChange={(event) => updateProfileDraft(profile.id, { defaultPrice: event.target.value })} placeholder="Preco" />
                    <Input value={profileDraft(profile.id).defaultDuration} onChange={(event) => updateProfileDraft(profile.id, { defaultDuration: event.target.value })} placeholder="Duracao" />
                    <Input value={profileDraft(profile.id).defaultReturn} onChange={(event) => updateProfileDraft(profile.id, { defaultReturn: event.target.value })} placeholder="Retorno" />
                    <Button type="button" variant="outline" onClick={() => addProfileDefault(profile)} disabled={isSaving || !profileDraft(profile.id).defaultServiceId} className="md:col-span-2">
                      <Save className="h-4 w-4" />
                      Salvar referencia
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {!operationalProfiles.length ? (
              <FeedbackMessage tone="info" message="Nenhum perfil operacional encontrado." />
            ) : null}
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
          <div id="tipos-negocio" className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-soft">
            <div className="mb-4 flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar tipo" />
            </div>
            <label className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} />
              Exibir inativos
            </label>
            <div className="grid gap-2">
              {filteredTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => selectType(type.id)}
                  className={`rounded-xl border p-3 text-left transition ${selectedTypeId === type.id ? "border-primary bg-secondary/70" : "border-border bg-white/75 hover:border-primary/40"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-foreground">{type.nome}</span>
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${type.ativo ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{type.ativo ? "Ativo" : "Inativo"}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{type.slug} - {type.metrics?.servicos_associados || 0} servico(s)</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-5">
            <section className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-soft">
              <form onSubmit={saveType} className="grid gap-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-foreground">{form.id ? "Editar tipo" : "Criar tipo"}</h2>
                  {form.id ? <Button type="button" variant="ghost" size="icon" onClick={() => setForm(EMPTY_FORM)} aria-label="Cancelar edicao"><X className="h-4 w-4" /></Button> : null}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Nome"><Input value={form.nome} onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))} /></Field>
                  <Field label="Slug"><Input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} placeholder="gerado quando vazio" /></Field>
                  <Field label="Icone"><Input value={form.icone} onChange={(event) => setForm((current) => ({ ...current, icone: event.target.value }))} /></Field>
                  <Field label="Ordem"><Input type="number" value={form.ordem_exibicao} onChange={(event) => setForm((current) => ({ ...current, ordem_exibicao: event.target.value }))} /></Field>
                </div>
                <Field label="Descrição"><Input value={form.descricao} onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))} /></Field>
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <input type="checkbox" checked={form.ativo} onChange={(event) => setForm((current) => ({ ...current, ativo: event.target.checked }))} />
                  Ativo
                </label>
                <div className="flex justify-end gap-2">
                  <Button type="submit" disabled={isSaving}>
                    {form.id ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {isSaving ? "Salvando..." : form.id ? "Salvar" : "Criar"}
                  </Button>
                </div>
              </form>
            </section>

            {selectedType ? (
              <section id="matrizes" className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-soft">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{selectedType.nome}</h2>
                    <p className="text-sm text-muted-foreground">Associacao N:N com o catalogo oficial.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="ghost" onClick={() => toggleStatus(selectedType)} disabled={isSaving}>{selectedType.ativo ? "Inativar" : "Ativar"}</Button>
                  </div>
                </div>
                <div className="mb-4 flex items-center gap-2">
                  <Search className="h-4 w-4 text-primary" />
                  <Input value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} placeholder="Buscar servico do catalogo" />
                </div>
                <div className="grid gap-2">
                  {filteredCatalog.map((item) => {
                    const association = associationByCatalogId.get(item.id);
                    const active = association?.ativo === true;
                    return (
                      <div key={item.id} className="grid gap-3 rounded-xl border border-border bg-white/75 p-3 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
                        <div>
                          <p className="font-bold text-foreground">{item.nome}</p>
                          <p className="text-xs text-muted-foreground">{item.codigo_canonico} - {item.categoria} - {item.ativo === false ? "catalogo inativo" : "catalogo ativo"}</p>
                        </div>
                        <Button type="button" variant={active ? "default" : "outline"} onClick={() => toggleCatalogItem(item)} disabled={isSaving || item.ativo === false}>
                          {active ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                          Aplicavel
                        </Button>
                        <Button type="button" variant={association?.recomendado ? "accent" : "outline"} onClick={() => toggleRecommended(item)} disabled={isSaving || item.ativo === false}>
                          Recomendado
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => openCatalogEditor(item)}
                          disabled={isSaving}
                          aria-label={`Editar servico de catalogo ${item.nome}`}
                          title={`Editar servico de catalogo ${item.nome}`}
                        >
                          <Pencil className="h-4 w-4" />
                          Editar catalogo
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <section id="servicos-catalogo" className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-soft">
              {isCatalogEditorOpen ? (
              <form onSubmit={saveCatalog} className="grid gap-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Button type="button" variant="ghost" className="mb-2 px-0" onClick={closeCatalogEditor}>
                      <ArrowLeft className="h-4 w-4" />
                      Voltar para a lista
                    </Button>
                    <h2 className="text-lg font-bold text-foreground">{catalogForm.id ? "Editar serviço do catálogo" : "Criar serviço do catálogo"}</h2>
                    <p className="text-sm text-muted-foreground">Manutenção global do conceito canônico e compatibilidades.</p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={closeCatalogEditor} aria-label="Voltar para a lista de servicos de catalogo" title="Voltar para a lista">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Nome canonico"><Input value={catalogForm.nome} onChange={(event) => setCatalogForm((current) => ({ ...current, nome: event.target.value }))} /></Field>
                  <Field label="Codigo canonico"><Input value={catalogForm.codigo_canonico} onChange={(event) => setCatalogForm((current) => ({ ...current, codigo_canonico: event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_") }))} placeholder="gerado quando vazio" /></Field>
                  <Field label="Categoria">
                    <select
                      value={catalogForm.categoria_key}
                      onChange={(event) => setCatalogForm((current) => ({ ...current, categoria_key: event.target.value as ServiceCategory | "" }))}
                      disabled={!activeServiceCategories.length}
                      className="h-12 w-full min-w-0 rounded-2xl border border-input bg-white/90 px-4 text-sm font-semibold text-foreground shadow-sm disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                    >
                      <option value="">Selecione uma categoria</option>
                      {activeServiceCategories.map((category) => (
                        <option key={category.key} value={category.key}>{category.label}</option>
                      ))}
                    </select>
                    {!activeServiceCategories.length ? (
                      <p className="text-xs font-semibold text-muted-foreground">Nenhuma categoria disponível.</p>
                    ) : null}
                  </Field>
                  <Field label="Natureza">
                    <select value={catalogForm.natureza} onChange={(event) => setCatalogForm((current) => ({ ...current, natureza: event.target.value as CatalogFormState["natureza"] }))} className="h-12 w-full rounded-2xl border border-input bg-white/90 px-4 text-sm font-semibold text-foreground shadow-sm">
                      <option value="recorrente">Recorrente</option>
                      <option value="ocasional">Ocasional</option>
                    </select>
                  </Field>
                </div>
                <Field label="Descrição"><Input value={catalogForm.descricao} onChange={(event) => setCatalogForm((current) => ({ ...current, descricao: event.target.value }))} /></Field>
                <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <input type="checkbox" checked={catalogForm.ativo} onChange={(event) => setCatalogForm((current) => ({ ...current, ativo: event.target.checked }))} />
                  Servico global ativo
                </label>
                <div className="rounded-xl border border-border bg-white/75 p-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Especialidades compativeis</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {activeSpecialties.map((specialty) => {
                      const checked = catalogSpecialtyIds.includes(specialty.id);
                      return (
                        <button key={specialty.id} type="button" onClick={() => toggleCatalogSpecialty(specialty.id)} className={`rounded-full border px-3 py-2 text-xs font-bold transition ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white text-muted-foreground hover:border-primary/40 hover:text-primary"}`}>
                          {checked ? <Check className="mr-1 inline h-3 w-3" /> : null}
                          {specialty.nome}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSaving || !catalogForm.nome.trim() || !catalogForm.categoria_key || !activeServiceCategories.length}>
                    <Save className="h-4 w-4" />
                    {isSaving ? "Salvando..." : catalogForm.id ? "Salvar catalogo" : "Criar catalogo"}
                  </Button>
                </div>
              </form>
              ) : (
                <div className="grid gap-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-foreground">Serviços do catálogo</h2>
                      <p className="text-sm text-muted-foreground">Lista completa dos conceitos canônicos cadastrados.</p>
                    </div>
                    <Button type="button" onClick={startCreateCatalog} disabled={isSaving}>
                      <Plus className="h-4 w-4" />
                      Novo serviço
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-primary" />
                    <Input value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} placeholder="Buscar serviço do catálogo" />
                  </div>
                  <div className="grid gap-2">
                    {filteredCatalog.map((item) => (
                      <div key={item.id} className="grid gap-3 rounded-xl border border-border bg-white/75 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                        <div className="min-w-0">
                          <p className="truncate font-bold text-foreground">{item.nome}</p>
                          <p className="text-xs text-muted-foreground">{item.codigo_canonico} - {categoryLabel(item.categoria_key || item.categoria)} - {item.ativo === false ? "catalogo inativo" : "catalogo ativo"}</p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => openCatalogEditor(item)}
                          disabled={isSaving}
                          aria-label={`Editar servico de catalogo ${item.nome}`}
                          title={`Editar servico de catalogo ${item.nome}`}
                        >
                          <Pencil className="h-4 w-4" />
                          Editar
                        </Button>
                      </div>
                    ))}
                    {!filteredCatalog.length ? (
                      <FeedbackMessage tone="info" message="Nenhum serviço de catálogo encontrado." />
                    ) : null}
                  </div>
                </div>
              )}
            </section>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <section id="cargos" className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-soft">
            <form onSubmit={saveRole} className="grid gap-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Cargos globais</h2>
                  <p className="text-sm text-muted-foreground">Funcoes oficiais usadas pelos estabelecimentos.</p>
                </div>
                {roleForm.id ? <Button type="button" variant="ghost" size="icon" onClick={() => setRoleForm(EMPTY_ROLE_FORM)} aria-label="Cancelar edicao de cargo"><X className="h-4 w-4" /></Button> : null}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Nome"><Input value={roleForm.nome} onChange={(event) => setRoleForm((current) => ({ ...current, nome: event.target.value }))} /></Field>
                <Field label="Categoria profissional">
                  <select value={roleForm.categoria_profissional} onChange={(event) => setRoleForm((current) => ({ ...current, categoria_profissional: event.target.value as RoleFormState["categoria_profissional"] }))} className="h-12 w-full rounded-2xl border border-input bg-white/90 px-4 text-sm font-semibold text-foreground shadow-sm">
                    <option value="operacional">Operacional</option>
                    <option value="administrativo">Administrativo</option>
                  </select>
                </Field>
              </div>
              <Field label="Descricao"><Input value={roleForm.descricao} onChange={(event) => setRoleForm((current) => ({ ...current, descricao: event.target.value }))} /></Field>
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <input type="checkbox" checked={roleForm.ativo} onChange={(event) => setRoleForm((current) => ({ ...current, ativo: event.target.checked }))} />
                Cargo ativo
              </label>
              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving || !roleForm.nome.trim()}>
                  <Save className="h-4 w-4" />
                  {isSaving ? "Salvando..." : roleForm.id ? "Salvar cargo" : "Criar cargo"}
                </Button>
              </div>
            </form>

            <div className="mt-5 grid gap-2">
              {roles.map((role) => (
                <button key={role.id} type="button" onClick={() => editRole(role)} className="rounded-xl border border-border bg-white/75 p-3 text-left transition hover:border-primary/40">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-foreground">{role.nome}</span>
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${role.ativo ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{role.ativo ? "Ativo" : "Inativo"}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{role.categoria_profissional} - {role.metrics?.especialidades || 0} especialidade(s)</p>
                </button>
              ))}
            </div>
          </section>

          <section id="especialidades" className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-soft">
            <form onSubmit={saveSpecialty} className="grid gap-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Especialidades globais</h2>
                  <p className="text-sm text-muted-foreground">Variacoes tecnicas oficiais vinculadas a um cargo.</p>
                </div>
                {specialtyForm.id ? <Button type="button" variant="ghost" size="icon" onClick={() => setSpecialtyForm(EMPTY_SPECIALTY_FORM)} aria-label="Cancelar edicao de especialidade"><X className="h-4 w-4" /></Button> : null}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Nome"><Input value={specialtyForm.nome} onChange={(event) => setSpecialtyForm((current) => ({ ...current, nome: event.target.value }))} /></Field>
                <Field label="Cargo">
                  <select value={specialtyForm.cargo_id} onChange={(event) => setSpecialtyForm((current) => ({ ...current, cargo_id: event.target.value }))} className="h-12 w-full rounded-2xl border border-input bg-white/90 px-4 text-sm font-semibold text-foreground shadow-sm">
                    <option value="">Selecione</option>
                    {operationalRoles.map((role) => <option key={role.id} value={role.id}>{role.nome}</option>)}
                  </select>
                </Field>
                <Field label="Categoria oficial">
                  <select value={specialtyForm.taxonomy_category_key} onChange={(event) => setSpecialtyForm((current) => ({ ...current, taxonomy_category_key: event.target.value as ServiceCategory }))} className="h-12 w-full rounded-2xl border border-input bg-white/90 px-4 text-sm font-semibold text-foreground shadow-sm">
                    <option value="">Selecione</option>
                    {SERVICE_CATEGORIES.map((category) => <option key={category} value={category}>{SERVICE_CATEGORY_LABELS[category]}</option>)}
                  </select>
                </Field>
                <label className="flex items-end gap-2 pb-3 text-sm font-semibold text-foreground">
                  <input type="checkbox" checked={specialtyForm.ativo} onChange={(event) => setSpecialtyForm((current) => ({ ...current, ativo: event.target.checked }))} />
                  Especialidade ativa
                </label>
              </div>
              <Field label="Descricao"><Input value={specialtyForm.descricao} onChange={(event) => setSpecialtyForm((current) => ({ ...current, descricao: event.target.value }))} /></Field>
              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving || !specialtyForm.nome.trim() || !specialtyForm.cargo_id || !specialtyForm.taxonomy_category_key}>
                  <Save className="h-4 w-4" />
                  {isSaving ? "Salvando..." : specialtyForm.id ? "Salvar especialidade" : "Criar especialidade"}
                </Button>
              </div>
            </form>

            <div className="mt-5 grid gap-2">
              {specialties.map((specialty) => (
                <button key={specialty.id} type="button" onClick={() => editSpecialty(specialty)} className="rounded-xl border border-border bg-white/75 p-3 text-left transition hover:border-primary/40">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-foreground">{specialty.nome}</span>
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${specialty.ativo ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{specialty.ativo ? "Ativa" : "Inativa"}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{specialty.cargo?.nome || "Cargo"} - {categoryLabel(specialty.taxonomy_category_key)}</p>
                </button>
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function TaxonomyMetric({ icon: Icon, label, value, hint }: { icon: typeof Tags; label: string; value: number; hint: string }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs font-semibold text-muted-foreground">{hint}</p>
    </div>
  );
}

function ProfileSummary({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-border bg-white/80 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.length ? items.map((item) => (
          <span key={item} className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground">{item}</span>
        )) : (
          <span className="text-xs font-semibold text-muted-foreground">Nenhum item configurado.</span>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
