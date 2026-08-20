"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CalendarClock, ShieldCheck, ToggleLeft, Trash2 } from "lucide-react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { TEAM_OPERATIONAL_ROLES, TEAM_OWNER_ROLES, canTeamRoleExecuteServices, canTeamRoleUseCargoCategory } from "@/constants/team-professional-roles";
import { useAuth } from "@/hooks/useAuth";
import { servicesService, type SalonService } from "@/services/services.service";
import { teamService, type TeamProfessional, type TeamRole, type TeamSpecialty, type TeamUserRole } from "@/services/team.service";
import { getErrorMessage } from "@/lib/messages";
import { normalizePhoneToE164, type PhoneCountry } from "@/utils/phone";

const PERMISSION_LABELS: Record<string, string> = {
  "dashboard.read": "Acessar dashboard",
  "agenda.read": "Visualizar agenda",
  "agenda.write": "Criar/editar agenda",
  "clientes.read": "Visualizar clientes",
  "clientes.write": "Editar clientes",
  "financeiro.read": "Visualizar financeiro",
  "campanhas.read": "Visualizar campanhas",
  "equipe.read": "Visualizar equipe",
  "tenant.read": "Ver configurações"
};

type TeamMaintenancePageProps = {
  professionalId: string;
};

type EditFormState = {
  nome_publico: string;
  tipo_usuario: TeamUserRole;
  cargo_id: string;
  possui_acesso: boolean;
  email: string;
  telefone: string;
  senha_temporaria: string;
  aceita_agendamento_online: boolean;
  percentual_comissao: string;
  servico_ids: string[];
  especialidade_ids: string[];
};

export function TeamMaintenancePage({ professionalId }: TeamMaintenancePageProps) {
  const { session, isLoading: isAuthLoading } = useAuth();
  const [professional, setProfessional] = useState<TeamProfessional | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [roles, setRoles] = useState<TeamRole[]>([]);
  const [specialties, setSpecialties] = useState<TeamSpecialty[]>([]);
  const [services, setServices] = useState<SalonService[]>([]);
  const [phoneCountry, setPhoneCountry] = useState<PhoneCountry>("BR");
  const [editForm, setEditForm] = useState<EditFormState>({
    nome_publico: "",
    tipo_usuario: "Funcionario",
    cargo_id: "",
    possui_acesso: false,
    email: "",
    telefone: "",
    senha_temporaria: "",
    percentual_comissao: "",
    aceita_agendamento_online: false,
    servico_ids: [],
    especialidade_ids: []
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const load = useCallback(async () => {
    if (!session) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await teamService.getById(session, professionalId);
      setProfessional(response);
      setEditForm({
        nome_publico: response.nome_publico || "",
        tipo_usuario: response.tipo_usuario || "Funcionario",
        cargo_id: response.cargo_id || "",
        possui_acesso: Boolean(response.possui_acesso),
        email: "",
        telefone: "",
        senha_temporaria: "",
        percentual_comissao: String(response.percentual_comissao || 0),
        aceita_agendamento_online: response.aceita_agendamento_online,
        servico_ids: response.servico_ids || [],
        especialidade_ids: response.especialidade_ids || []
      });
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível carregar o profissional."));
    } finally {
      setIsLoading(false);
    }
  }, [professionalId, session]);

  useEffect(() => {
    if (isAuthLoading) return;
    load();
  }, [isAuthLoading, load]);

  useEffect(() => {
    if (!session || !editForm.tipo_usuario) return;

    let isActive = true;

    teamService
      .listRoles(session, editForm.tipo_usuario)
      .then((data) => {
        if (!isActive) return;
        const renderedRoles = data.filter((role) => (
          canTeamRoleUseCargoCategory(editForm.tipo_usuario, role.categoria_profissional)
        ));

        if (process.env.NODE_ENV !== "production") {
          console.debug("[team-maintenance:cargos]", {
            tipo_usuario: editForm.tipo_usuario,
            recebidos: data.length,
            renderizados: renderedRoles.length,
            cargos_recebidos: data.map((role) => role.nome),
            cargos_renderizados: renderedRoles.map((role) => role.nome)
          });
        }

        setRoles(renderedRoles);
      })
      .catch((err) => {
        if (isActive) setError(getErrorMessage(err, "Não foi possível carregar cargos."));
      });

    return () => {
      isActive = false;
    };
  }, [session, editForm.tipo_usuario]);

  useEffect(() => {
    if (!session || !editForm.cargo_id || !canTeamRoleExecuteServices(editForm.tipo_usuario)) {
      setSpecialties([]);
      return;
    }

    let isActive = true;

    teamService
      .listSpecialties(session, editForm.cargo_id)
      .then((data) => {
        if (isActive) setSpecialties(data);
      })
      .catch((err) => {
        if (isActive) setError(getErrorMessage(err, "Não foi possível carregar especialidades."));
      });

    return () => {
      isActive = false;
    };
  }, [session, editForm.cargo_id, editForm.tipo_usuario]);

  useEffect(() => {
    if (!session || !canTeamRoleExecuteServices(editForm.tipo_usuario)) {
      setServices([]);
      setEditForm((current) => current.servico_ids.length ? { ...current, servico_ids: [] } : current);
      return;
    }

    let isActive = true;

    servicesService
      .list(session)
      .then((data) => {
        if (!isActive) return;

        setServices(data);
        const compatibleIds = new Set(data.map((service) => service.id));
        setEditForm((current) => {
          const nextServiceIds = current.servico_ids.filter((id) => compatibleIds.has(id));
          return nextServiceIds.length === current.servico_ids.length ? current : { ...current, servico_ids: nextServiceIds };
        });
      })
      .catch((err) => {
        if (isActive) setError(getErrorMessage(err, "Não foi possível carregar os serviços do salão."));
      });

    return () => {
      isActive = false;
    };
  }, [session, editForm.tipo_usuario]);

  async function toggleStatus() {
    if (!session || !professional) return;

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const updated = await teamService.update(session, professional.id, { ativo: !professional.ativo });
      setProfessional(updated);
      setSuccess(updated.ativo ? "Profissional ativado." : "Profissional inativado.");
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível alterar o status."));
    } finally {
      setIsSaving(false);
    }
  }

  function startEditing() {
    if (!professional) return;

    setEditForm({
      nome_publico: professional.nome_publico || "",
      tipo_usuario: professional.tipo_usuario || "Funcionario",
      cargo_id: professional.cargo_id || "",
      possui_acesso: Boolean(professional.possui_acesso),
      email: "",
      telefone: "",
      senha_temporaria: "",
      percentual_comissao: String(professional.percentual_comissao || 0),
      aceita_agendamento_online: professional.aceita_agendamento_online,
      servico_ids: professional.servico_ids || [],
      especialidade_ids: professional.especialidade_ids || []
    });
    setIsEditing(true);
    setError("");
    setSuccess("");
  }

  async function saveEdit() {
    if (!session || !professional) return;

    if (!editForm.nome_publico.trim()) {
      setError("Informe o nome público do profissional.");
      return;
    }

    if (!editForm.cargo_id) {
      setError("Selecione o cargo do profissional.");
      return;
    }

    const editRoleExecutesServices = canTeamRoleExecuteServices(editForm.tipo_usuario);
    if (editForm.tipo_usuario === "Autonomo" && !editForm.servico_ids.length) {
      setError("Autônomo deve estar vinculado a ao menos um serviço.");
      return;
    }

    if (editForm.possui_acesso && !professional.possui_acesso && (!editForm.email.trim() || editForm.senha_temporaria.length < 8)) {
      setError("Informe email e senha temporária com ao menos 8 caracteres para criar acesso.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const updated = await teamService.update(session, professional.id, {
        nome_publico: editForm.nome_publico.trim(),
        tipo_usuario: editForm.tipo_usuario,
        cargo_id: editForm.cargo_id,
        criar_acesso: editForm.possui_acesso && !professional.possui_acesso,
        email: editForm.possui_acesso && !professional.possui_acesso ? editForm.email.trim() : undefined,
        telefone: editForm.telefone ? normalizePhoneToE164(editForm.telefone, phoneCountry) : undefined,
        senha_temporaria: editForm.possui_acesso && !professional.possui_acesso ? editForm.senha_temporaria : undefined,
        percentual_comissao: Number(editForm.percentual_comissao || 0),
        aceita_agendamento_online: editRoleExecutesServices ? editForm.aceita_agendamento_online : false,
        servico_ids: editRoleExecutesServices ? editForm.servico_ids : [],
        especialidade_ids: editRoleExecutesServices ? editForm.especialidade_ids : []
      });
      setProfessional(updated);
      setIsEditing(false);
      setSuccess("Profissional atualizado.");
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível editar o profissional."));
    } finally {
      setIsSaving(false);
    }
  }

  function setEditType(nextType: TeamUserRole) {
    const nextExecutesServices = canTeamRoleExecuteServices(nextType);
    setEditForm((current) => ({
      ...current,
      tipo_usuario: nextType,
      cargo_id: "",
      aceita_agendamento_online: nextExecutesServices ? current.aceita_agendamento_online : false,
      servico_ids: nextExecutesServices ? current.servico_ids : [],
      especialidade_ids: []
    }));
    setSpecialties([]);
  }

  function toggleService(serviceId: string) {
    setEditForm((current) => ({
      ...current,
      servico_ids: current.servico_ids.includes(serviceId)
        ? current.servico_ids.filter((id) => id !== serviceId)
        : [...current.servico_ids, serviceId]
    }));
  }

  function toggleSpecialty(specialtyId: string) {
    setEditForm((current) => ({
      ...current,
      especialidade_ids: current.especialidade_ids.includes(specialtyId)
        ? current.especialidade_ids.filter((id) => id !== specialtyId)
        : [...current.especialidade_ids, specialtyId]
    }));
  }

  async function removeProfessional() {
    if (!session || !professional) return;

    const confirmed = window.confirm("Remover este profissional da equipe?");
    if (!confirmed) return;

    setIsSaving(true);
    setError("");

    try {
      await teamService.remove(session, professional.id);
      window.location.href = "/equipe";
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível remover o profissional."));
      setIsSaving(false);
    }
  }

  if (isLoading || isAuthLoading) {
    return (
      <section className="space-y-5">
        <DashboardCard title="Carregando profissional" description="Buscando dados da equipe.">
          <p className="text-sm font-semibold text-muted-foreground">Carregando...</p>
        </DashboardCard>
      </section>
    );
  }

  if (!professional) {
    return (
      <section className="space-y-5">
        <DashboardCard title="Profissional não encontrado" description={error || "O registro não está disponível."}>
          <Button asChild variant="outline">
            <Link href="/equipe">Voltar para equipe</Link>
          </Button>
        </DashboardCard>
      </section>
    );
  }

  const type = professional.tipo_usuario || "Funcionario";
  const canHaveOperationalSchedule = canTeamRoleExecuteServices(type);
  const isAdministrativeProfessional = type === "Profissional Adm";
  const editRoleExecutesServices = canTeamRoleExecuteServices(editForm.tipo_usuario);
  const permissions = professional.permissoes_sugeridas || [];
  const linkedServices = professional.servicos || [];
  const roleOptions = professional.vinculo_tipo === "owner"
    ? TEAM_OWNER_ROLES.filter((role) => role.value === type)
    : TEAM_OPERATIONAL_ROLES;

  return (
    <section className="space-y-5">
      <div className="rounded-[1.75rem] border border-white/80 bg-white/82 p-5 shadow-soft backdrop-blur-xl sm:p-6">
        <Button asChild variant="ghost">
          <Link href="/equipe">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-accent">Manutenção da equipe</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">{professional.nome_publico}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Dados operacionais, acesso, permissões e escala ficam centralizados neste cadastro.
        </p>
      </div>

      {(error || success) ? (
        <FeedbackMessage tone={error ? "error" : "success"} message={error || success} />
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <DashboardCard title="Dados do profissional" description="Visão consolidada do cadastro operacional.">
          {isEditing ? (
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nome do profissional">
                  <Input
                    value={editForm.nome_publico}
                    onChange={(event) => setEditForm({ ...editForm, nome_publico: event.target.value })}
                    placeholder="Nome público"
                  />
                </Field>
                <Field label="Comissao (%)">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={editForm.percentual_comissao}
                    onChange={(event) => setEditForm({ ...editForm, percentual_comissao: event.target.value })}
                    placeholder="Comissão %"
                  />
                </Field>
                <Field label="Tipo profissional">
                  <select
                    value={editForm.tipo_usuario}
                    onChange={(event) => setEditType(event.target.value as TeamUserRole)}
                    className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm font-semibold text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    {roleOptions.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Cargo">
                  <select
                    value={editForm.cargo_id}
                    onChange={(event) => setEditForm({ ...editForm, cargo_id: event.target.value, especialidade_ids: [] })}
                    className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm font-semibold text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">{roles.length ? "Selecione o cargo" : "Nenhum cargo ativo"}</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.nome}
                      </option>
                    ))}
                  </select>
                  {editRoleExecutesServices && !roles.length ? (
                    <span className="text-xs font-semibold leading-5 text-muted-foreground">
                      Nenhum cargo ativo está disponível para este tipo profissional.
                    </span>
                  ) : null}
                </Field>
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/80 bg-white/75 p-3 text-sm font-semibold text-foreground">
                <input
                  type="checkbox"
                  checked={editForm.possui_acesso}
                  disabled={professional.possui_acesso}
                  onChange={(event) => setEditForm({ ...editForm, possui_acesso: event.target.checked })}
                  className="h-5 w-5 rounded border-border accent-primary"
                />
                {professional.possui_acesso ? "Acesso ao sistema ativo" : "Criar acesso ao sistema"}
              </label>
              {editForm.possui_acesso && !professional.possui_acesso ? (
                <div className="grid gap-3 md:grid-cols-3">
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(event) => setEditForm({ ...editForm, email: event.target.value })}
                    placeholder="email@exemplo.com"
                  />
                  <PhoneInput
                    value={editForm.telefone}
                    onChange={(value) => setEditForm({ ...editForm, telefone: value })}
                    country={phoneCountry}
                    onCountryChange={(country) => {
                      setPhoneCountry(country);
                      setEditForm({ ...editForm, telefone: "" });
                    }}
                  />
                  <Input
                    type="password"
                    value={editForm.senha_temporaria}
                    onChange={(event) => setEditForm({ ...editForm, senha_temporaria: event.target.value })}
                    placeholder="Senha temporária"
                  />
                </div>
              ) : null}
              {editRoleExecutesServices ? (
                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/80 bg-white/75 p-3 text-sm font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={editForm.aceita_agendamento_online}
                    onChange={(event) => setEditForm({ ...editForm, aceita_agendamento_online: event.target.checked })}
                    className="h-5 w-5 rounded border-border accent-primary"
                  />
                  Aceita agendamento online
                </label>
              ) : null}
              {editRoleExecutesServices ? (
                <>
                  <SelectableGroup
                    title="Especialidades"
                    empty={!editForm.cargo_id ? "Selecione um cargo para listar especialidades." : "Nenhuma especialidade ativa para este cargo."}
                  >
                    {specialties.map((specialty) => (
                      <TogglePill
                        key={specialty.id}
                        selected={editForm.especialidade_ids.includes(specialty.id)}
                        onClick={() => toggleSpecialty(specialty.id)}
                      >
                        {specialty.nome}
                      </TogglePill>
                    ))}
                  </SelectableGroup>
                  <SelectableGroup
                    title="Serviços executados"
                    description="Marque explicitamente todos os serviços executados pelo profissional. O cargo principal e as especialidades não restringem esta lista."
                    empty="Nenhum serviço ativo cadastrado neste salão."
                  >
                    {services.map((service) => (
                      <TogglePill
                        key={service.id}
                        selected={editForm.servico_ids.includes(service.id)}
                        onClick={() => toggleService(service.id)}
                      >
                        {service.nome}
                      </TogglePill>
                    ))}
                  </SelectableGroup>
                </>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="accent" onClick={saveEdit} disabled={isSaving}>
                  {isSaving ? "Salvando..." : "Salvar alterações"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <Info label="Tipo profissional" value={type} />
              <Info label="Cargo" value={professional.cargo || professional.cargo_ref?.nome || "-"} />
              <Info label="Status" value={professional.ativo ? "Ativo" : "Inativo"} />
              <Info label="Acesso ao sistema" value={professional.possui_acesso ? "Com acesso" : "Sem acesso"} />
              <Info label="Agenda online" value={professional.aceita_agendamento_online ? "Sim" : "Não"} />
              <Info label="Comissão" value={`${professional.percentual_comissao || 0}%`} />
              <Info label="Serviços vinculados" value={`${linkedServices.length}`} />
              <Info label="Especialidades" value={professional.especialidade || "Sem especialidades"} />
            </div>
          )}
        </DashboardCard>

        <DashboardCard title="Ações de manutenção" description="Acesse as rotinas ligadas a este profissional.">
          <div className="grid gap-3">
            <Button type="button" variant="outline" onClick={startEditing} disabled={isSaving || isEditing}>
              Editar profissional
            </Button>
            {canHaveOperationalSchedule ? (
              <Button asChild variant="outline">
                <Link href={`/equipe/manutencao/${professional.id}/horarios`}>
                  <CalendarClock className="h-4 w-4" />
                  Configurar horários
                </Link>
              </Button>
            ) : null}
            {isAdministrativeProfessional ? (
              <Button asChild variant="outline">
                <Link href={`/equipe/manutencao/${professional.id}/permissoes`}>
                  <ShieldCheck className="h-4 w-4" />
                  Configurar permissões
                </Link>
              </Button>
            ) : null}
            <Button type="button" variant="outline" onClick={toggleStatus} disabled={isSaving}>
              <ToggleLeft className="h-4 w-4" />
              {professional.ativo ? "Inativar" : "Ativar"}
            </Button>
            <Button type="button" variant="outline" onClick={removeProfessional} disabled={isSaving}>
              <Trash2 className="h-4 w-4" />
              Remover da equipe
            </Button>
          </div>
        </DashboardCard>
      </div>

      {isAdministrativeProfessional ? (
        <DashboardCard title="Permissões sugeridas" description="Base inicial por cargo administrativo, preparada para expansão RBAC.">
          {permissions.length ? (
            <div className="flex flex-wrap gap-2">
              {permissions.map((permission) => (
                <span key={permission} className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">
                  {PERMISSION_LABELS[permission] || permission}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              Nenhuma permissão sugerida para este cargo administrativo.
            </p>
          )}
        </DashboardCard>
      ) : null}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/75 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function SelectableGroup({
  title,
  description,
  empty,
  children
}: {
  title: string;
  description?: string;
  empty: string;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <div className="rounded-2xl border border-white/80 bg-white/70 p-3">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
      {description ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p> : null}
      {hasChildren ? (
        <div className="mt-3 flex flex-wrap gap-2">{children}</div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">{empty}</p>
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
