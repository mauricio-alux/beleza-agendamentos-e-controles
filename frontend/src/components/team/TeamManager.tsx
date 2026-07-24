"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Plus, Settings2, UserRoundCog } from "lucide-react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { TEAM_OPERATIONAL_ROLES, canTeamRoleExecuteServices, canTeamRoleUseCargoCategory } from "@/constants/team-professional-roles";
import { useAuth } from "@/hooks/useAuth";
import { servicesService, type SalonService } from "@/services/services.service";
import { teamService, type TeamProfessional, type TeamRole, type TeamSpecialty, type TeamUserRole } from "@/services/team.service";
import { getErrorMessage } from "@/lib/messages";
import { normalizePhoneToE164, type PhoneCountry } from "@/utils/phone";

type TeamFormState = {
  nome_publico: string;
  cargo_id: string;
  tipo_usuario: TeamUserRole;
  especialidade_ids: string[];
  servico_ids: string[];
  percentual_comissao: string;
  aceita_agendamento_online: boolean;
  criar_acesso: boolean;
  email: string;
  telefone: string;
  senha_temporaria: string;
};

const EMPTY_FORM: TeamFormState = {
  nome_publico: "",
  cargo_id: "",
  tipo_usuario: "Funcionario",
  especialidade_ids: [],
  servico_ids: [],
  percentual_comissao: "",
  aceita_agendamento_online: true,
  criar_acesso: false,
  email: "",
  telefone: "",
  senha_temporaria: ""
};

function requiresServiceLinks(form: TeamFormState) {
  return form.aceita_agendamento_online && canTeamRoleExecuteServices(form.tipo_usuario);
}

export function TeamManager() {
  const { session } = useAuth();
  const [professionals, setProfessionals] = useState<TeamProfessional[]>([]);
  const [roles, setRoles] = useState<TeamRole[]>([]);
  const [specialties, setSpecialties] = useState<TeamSpecialty[]>([]);
  const [services, setServices] = useState<SalonService[]>([]);
  const [form, setForm] = useState<TeamFormState>(EMPTY_FORM);
  const [phoneCountry, setPhoneCountry] = useState<PhoneCountry>("BR");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [isLoadingSpecialties, setIsLoadingSpecialties] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const selectedRoleExecutesServices = canTeamRoleExecuteServices(form.tipo_usuario);
  const accessRequired = selectedRoleExecutesServices;
  const shouldShowAccessFields = accessRequired || form.criar_acesso;
  async function load() {
    if (!session) return;

    setIsLoading(true);
    setError("");

    try {
      const [nextProfessionals, nextServices] = await Promise.all([
        teamService.list(session),
        servicesService.list(session)
      ]);
      setProfessionals(nextProfessionals);
      setServices(nextServices);
    } catch (err) {
      setError(getErrorMessage(err, "Nao foi possivel carregar a equipe."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [session]);

  useEffect(() => {
    if (!session) return;

    let isActive = true;
    setIsLoadingRoles(true);
    setError("");

    teamService
      .listRoles(session, form.tipo_usuario)
      .then((data) => {
        if (!isActive) return;

        setRoles(data.filter((role) => canTeamRoleUseCargoCategory(form.tipo_usuario, role.categoria_profissional)));
      })
      .catch((err) => {
        if (isActive) setError(getErrorMessage(err, "Nao foi possivel carregar cargos."));
      })
      .finally(() => {
        if (isActive) setIsLoadingRoles(false);
      });

    return () => {
      isActive = false;
    };
  }, [session, form.tipo_usuario, selectedRoleExecutesServices]);

  useEffect(() => {
    if (!session || !form.cargo_id) {
      setSpecialties([]);
      return;
    }

    let isActive = true;
    setIsLoadingSpecialties(true);
    setError("");

    teamService
      .listSpecialties(session, form.cargo_id)
      .then((data) => {
        if (isActive) setSpecialties(data);
      })
      .catch((err) => {
        if (isActive) setError(getErrorMessage(err, "Nao foi possivel carregar especialidades."));
      })
      .finally(() => {
        if (isActive) setIsLoadingSpecialties(false);
      });

    return () => {
      isActive = false;
    };
  }, [session, form.cargo_id]);

  function toggleSpecialty(specialtyId: string) {
    setForm((current) => ({
      ...current,
      especialidade_ids: current.especialidade_ids.includes(specialtyId)
        ? current.especialidade_ids.filter((id) => id !== specialtyId)
        : [...current.especialidade_ids, specialtyId]
    }));
  }

  function toggleService(serviceId: string) {
    setForm((current) => ({
      ...current,
      servico_ids: current.servico_ids.includes(serviceId)
        ? current.servico_ids.filter((id) => id !== serviceId)
        : [...current.servico_ids, serviceId]
    }));
  }

  function handleProfessionalTypeChange(nextRole: TeamUserRole) {
    const nextExecutesServices = canTeamRoleExecuteServices(nextRole);

    setForm((current) => ({
      ...current,
      tipo_usuario: nextRole,
      cargo_id: "",
      especialidade_ids: [],
      servico_ids: nextExecutesServices ? current.servico_ids : [],
      aceita_agendamento_online: nextExecutesServices ? current.aceita_agendamento_online : false
    }));
    setSpecialties([]);
  }

  function validateForm() {
    if (!form.nome_publico.trim() || !form.cargo_id) {
      return "Informe nome publico e cargo.";
    }

    if (requiresServiceLinks(form) && !form.servico_ids.length) {
      return "Vincule ao menos um servico para permitir agendamento online.";
    }

    if ((accessRequired || form.criar_acesso) && (!form.email.trim() || form.senha_temporaria.length < 8)) {
      return "Informe email e senha temporaria com ao menos 8 caracteres para o acesso ao sistema.";
    }

    return "";
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await teamService.create(session, {
        nome_publico: form.nome_publico.trim(),
        cargo_id: form.cargo_id,
        tipo_usuario: form.tipo_usuario,
        especialidade_ids: selectedRoleExecutesServices ? form.especialidade_ids : [],
        servico_ids: selectedRoleExecutesServices ? form.servico_ids : [],
        percentual_comissao: Number(form.percentual_comissao || 0),
        aceita_agendamento_online: selectedRoleExecutesServices && form.aceita_agendamento_online,
        criar_acesso: accessRequired || form.criar_acesso,
        email: accessRequired || form.criar_acesso ? form.email.trim() : undefined,
        telefone: form.telefone ? normalizePhoneToE164(form.telefone, phoneCountry) : undefined,
        senha_temporaria: accessRequired || form.criar_acesso ? form.senha_temporaria : undefined
      });

      const nextProfessionals = await teamService.list(session);
      setProfessionals(nextProfessionals || []);
      setForm(EMPTY_FORM);
      setPhoneCountry("BR");
    } catch (err) {
      setError(getErrorMessage(err, "Nao foi possivel cadastrar o profissional."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-5">
      <div className="rounded-[1.75rem] border border-white/80 bg-white/82 p-5 shadow-soft backdrop-blur-xl sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Equipe operacional</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">Profissionais do salao</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Cadastre profissionais, defina o vinculo operacional e conecte servicos para alimentar a agenda inteligente.
        </p>
      </div>

      {error ? (
        <FeedbackMessage tone="error" message={error} />
      ) : null}

      <DashboardCard title="Novo profissional" description="Crie primeiro o profissional operacional. Funcionarios e terceiros recebem acesso automaticamente.">
        <form onSubmit={handleCreate} className="grid gap-4" autoComplete="off">
          <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr_0.9fr_0.55fr]">
            <Input
              value={form.nome_publico}
              onChange={(event) => setForm({ ...form, nome_publico: event.target.value })}
              placeholder="Nome publico"
            />
            <select
              value={form.tipo_usuario}
              onChange={(event) => handleProfessionalTypeChange(event.target.value as TeamUserRole)}
              aria-label="Tipo profissional"
              className="h-11 rounded-xl border border-border bg-white px-3 text-sm font-semibold text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {TEAM_OPERATIONAL_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            <select
              value={form.cargo_id}
              onChange={(event) => setForm({ ...form, cargo_id: event.target.value, especialidade_ids: [] })}
              aria-label="Cargo profissional"
              className="h-11 rounded-xl border border-border bg-white px-3 text-sm font-semibold text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">
                {isLoadingRoles
                  ? "Carregando cargos..."
                  : roles.length
                    ? "Selecione o cargo"
                    : "Nenhum cargo ativo"}
              </option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.nome}
                </option>
              ))}
            </select>
            <Input
              type="number"
              min={0}
              max={100}
              value={form.percentual_comissao}
              onChange={(event) => setForm({ ...form, percentual_comissao: event.target.value })}
              placeholder="Comissao %"
            />
          </div>

          <FeedbackMessage tone="info" message={TEAM_OPERATIONAL_ROLES.find((role) => role.value === form.tipo_usuario)?.description} />

          {selectedRoleExecutesServices && !isLoadingRoles && !roles.length ? (
            <FeedbackMessage tone="warning" message="Nenhum cargo ativo foi encontrado para este tipo profissional." />
          ) : null}

          {selectedRoleExecutesServices ? (
            <>
              <SelectableGroup
                title="Especialidades"
                empty={!form.cargo_id ? "Selecione um cargo para ver as especialidades disponiveis." : "Nenhuma especialidade ativa para este cargo."}
                isLoading={isLoadingSpecialties}
              >
                {specialties.map((specialty) => (
                  <TogglePill
                    key={specialty.id}
                    selected={form.especialidade_ids.includes(specialty.id)}
                    onClick={() => toggleSpecialty(specialty.id)}
                  >
                    {specialty.nome}
                  </TogglePill>
                ))}
              </SelectableGroup>

              <SelectableGroup
                title="Servicos executados"
                empty="Nenhum servico ativo cadastrado neste salao."
                description="Selecione todos os servicos que este profissional executa. O cargo principal tem funcao apenas organizacional."
              >
                {services.map((service) => (
                  <TogglePill
                    key={service.id}
                    selected={form.servico_ids.includes(service.id)}
                    onClick={() => toggleService(service.id)}
                  >
                    {service.nome}
                  </TogglePill>
                ))}
              </SelectableGroup>
            </>
          ) : (
            <FeedbackMessage tone="info" message="Profissional Adm nao aparece na agenda e nao pode ser vinculado a servicos de atendimento." />
          )}

          <div className="grid gap-3 rounded-2xl border border-primary/15 bg-white/85 p-3 shadow-sm">
            <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-foreground">
              <input
                type="checkbox"
                checked={selectedRoleExecutesServices && form.aceita_agendamento_online}
                disabled={!selectedRoleExecutesServices}
                onChange={(event) => setForm({ ...form, aceita_agendamento_online: event.target.checked })}
                className="h-5 w-5 rounded border-border accent-primary"
              />
              Aceita agendamento online
            </label>
            {!selectedRoleExecutesServices ? (
              <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-foreground">
                <input
                  type="checkbox"
                  checked={form.criar_acesso}
                  onChange={(event) => setForm({ ...form, criar_acesso: event.target.checked })}
                  className="h-5 w-5 rounded border-border accent-primary"
                />
                Criar acesso ao sistema
              </label>
            ) : (
              <FeedbackMessage tone="info" message="Acesso ao sistema sera criado automaticamente." />
            )}

            {shouldShowAccessFields ? (
              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  type="email"
                  name="team_access_email"
                  autoComplete="off"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  placeholder="email@exemplo.com"
                />
                <PhoneInput
                  value={form.telefone}
                  onChange={(value) => setForm({ ...form, telefone: value })}
                  country={phoneCountry}
                  onCountryChange={(country) => {
                    setPhoneCountry(country);
                    setForm({ ...form, telefone: "" });
                  }}
                />
                <Input
                  type="password"
                  name="team_access_temporary_password"
                  autoComplete="new-password"
                  value={form.senha_temporaria}
                  onChange={(event) => setForm({ ...form, senha_temporaria: event.target.value })}
                  placeholder="Senha temporaria"
                />
              </div>
            ) : null}
          </div>

          <Button type="submit" variant="accent" disabled={isSaving}>
            <Plus className="h-4 w-4" />
            {isSaving ? "Salvando..." : "Adicionar"}
          </Button>
        </form>
      </DashboardCard>

      <DashboardCard title="Equipe cadastrada" description="Profissionais disponiveis para agenda, servicos e escala individual.">
        {isLoading ? (
          <p className="text-sm font-semibold text-muted-foreground">Carregando equipe...</p>
        ) : professionals.length ? (
          <div className="grid gap-3">
            {professionals.map((professional) => (
              <article key={professional.id} className="rounded-2xl border border-white/80 bg-white/92 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Link href={`/equipe/manutencao/${professional.id}`} className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-primary">
                      <UserRoundCog className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-foreground">{professional.nome_publico}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {[professional.tipo_usuario || professional.cargo, professional.especialidade].filter(Boolean).join(" - ") || "Profissional"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-primary">
                        <span className="rounded-full bg-secondary px-3 py-1">
                          {professional.aceita_agendamento_online ? "Agenda online" : "Agenda interna"}
                        </span>
                        <span className="rounded-full bg-secondary px-3 py-1">
                          {professional.percentual_comissao}% comissao
                        </span>
                        <span className="rounded-full bg-secondary px-3 py-1">
                          {professional.possui_acesso ? "Com acesso" : "Sem acesso"}
                        </span>
                        <span className="rounded-full bg-secondary px-3 py-1">
                          {professional.servico_ids?.length || 0} servicos
                        </span>
                      </div>
                    </div>
                  </Link>
                  <div className="flex justify-end">
                    <Button asChild variant="outline">
                      <Link href={`/equipe/manutencao/${professional.id}`}>
                        <Settings2 className="h-4 w-4" />
                        Manutencao
                      </Link>
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            Nenhum profissional cadastrado ainda. Adicione o primeiro profissional para organizar a agenda do salao.
          </p>
        )}
      </DashboardCard>
    </section>
  );
}

function SelectableGroup({
  title,
  description,
  empty,
  isLoading,
  children
}: {
  title: string;
  description?: string;
  empty: string;
  isLoading?: boolean;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <div className="rounded-2xl border border-primary/15 bg-white/85 p-3 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{title}</p>
      {description ? <p className="mt-1 rounded-xl bg-secondary/70 px-3 py-2 text-xs font-semibold leading-5 text-foreground">{description}</p> : null}
      {isLoading ? (
        <p className="mt-2 rounded-xl border border-accent/20 bg-accent/10 px-3 py-2 text-sm font-bold text-accent">Carregando...</p>
      ) : hasChildren ? (
        <div className="mt-3 flex flex-wrap gap-2">{children}</div>
      ) : (
        <p className="mt-2 rounded-xl border border-primary/20 bg-secondary/70 px-3 py-2 text-sm font-semibold text-foreground">{empty}</p>
      )}
    </div>
  );
}

function TogglePill({
  selected,
  onClick,
  children
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-xs font-bold transition ${
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-blush"
          : "border-border bg-white text-muted-foreground hover:border-primary/40 hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}
