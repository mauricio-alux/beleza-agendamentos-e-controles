"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Mail, Pencil, Phone, Plus, Search, UsersRound, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { useAuth } from "@/hooks/useAuth";
import { clientsService, type SalonClient } from "@/services/clients.service";
import { formatStoredPhone, getNationalPhone, isValidPhone, normalizePhoneToE164, type PhoneCountry } from "@/utils/phone";

type ClientFormState = {
  data_nascimento: string;
  nome: string;
  telefone: string;
  email: string;
  cep: string;
  uf: string;
  cidade: string;
  logradouro: string;
  numero: string;
  observacoes: string;
  aceita_campanhas: boolean;
  status: "ativo" | "inativo";
};

const EMPTY_FORM: ClientFormState = {
  data_nascimento: "",
  nome: "",
  telefone: "",
  email: "",
  cep: "",
  uf: "",
  cidade: "",
  logradouro: "",
  numero: "",
  observacoes: "",
  aceita_campanhas: true,
  status: "ativo"
};

export function ClientsManager() {
  const { session } = useAuth();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLDivElement | null>(null);
  const successRef = useRef<HTMLDivElement | null>(null);
  const editTitleRef = useRef<HTMLHeadingElement | null>(null);
  const editBaseline = useRef<ReturnType<typeof buildClientPayload> | null>(null);
  const [clients, setClients] = useState<SalonClient[]>([]);
  const [form, setForm] = useState<ClientFormState>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<ClientFormState>(EMPTY_FORM);
  const [editingClient, setEditingClient] = useState<SalonClient | null>(null);
  const [phoneCountry, setPhoneCountry] = useState<PhoneCountry>("BR");
  const [editPhoneCountry, setEditPhoneCountry] = useState<PhoneCountry>("BR");
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [cepMessage, setCepMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    if (!session) return;

    setIsLoading(true);
    setError("");

    try {
      setClients(await clientsService.list(session));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar os clientes.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [session]);

  useEffect(() => {
    if (searchParams.get("novo") === "1") {
      window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, [searchParams]);

  useEffect(() => {
    const digits = form.cep.replace(/\D/g, "");

    if (digits.length < 8) {
      setCepMessage("");
      if (!digits.length) {
        setForm((current) => ({
          ...current,
          uf: "",
          cidade: "",
          logradouro: "",
          numero: ""
        }));
      }
      return;
    }

    const controller = new AbortController();

    async function loadCep() {
      setIsLoadingCep(true);
      setCepMessage("");

      try {
        const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal: controller.signal });
        const data = (await response.json()) as {
          erro?: boolean;
          uf?: string;
          localidade?: string;
          logradouro?: string;
        };

        if (data.erro) {
          setCepMessage("CEP não encontrado.");
          return;
        }

        setForm((current) => ({
          ...current,
          uf: data.uf || "",
          cidade: data.localidade || "",
          logradouro: data.logradouro || ""
        }));
      } catch {
        if (!controller.signal.aborted) {
          setCepMessage("Não foi possível consultar o CEP.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingCep(false);
        }
      }
    }

    loadCep();

    return () => controller.abort();
  }, [form.cep]);

  useEffect(() => {
    if (!editingClient) return;
    window.setTimeout(() => editTitleRef.current?.focus({ preventScroll: true }), 80);
  }, [editingClient]);

  function validateClientForm(state: ClientFormState, country: PhoneCountry) {
    if (state.nome.trim().length < 2) return "Informe um nome válido.";
    if (!isValidPhone(state.telefone, country)) return "Informe um WhatsApp válido.";
    if (state.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim())) {
      return "Informe um email válido ou deixe o campo em branco.";
    }
    return "";
  }

  function buildClientPayload(state: ClientFormState, country: PhoneCountry) {
    const cepDigits = state.cep.replace(/\D/g, "");

    return {
      data_nascimento: state.data_nascimento,
      nome: state.nome.trim(),
      telefone: normalizePhoneToE164(state.telefone, country),
      email: state.email.trim() || null,
      observacoes: state.observacoes.trim() || null,
      endereco: cepDigits.length === 8
        ? {
            cep: cepDigits,
            uf: state.uf.trim() || undefined,
            cidade: state.cidade.trim() || undefined,
            logradouro: state.logradouro.trim() || undefined,
            numero: state.numero.trim() || undefined
          }
        : undefined,
      aceita_campanhas: state.aceita_campanhas,
      status: state.status
    };
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;

    if (!event.currentTarget.reportValidity()) return;
    if (!form.data_nascimento) { setError('Informe a data de nascimento.'); return; }
    const validationMessage = validateClientForm(form, phoneCountry);
    if (validationMessage) {
      setError(validationMessage);
      setSuccess("");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const created = await clientsService.create(session, buildClientPayload(form, phoneCountry));
      setClients((current) => [created, ...current.filter((client) => client.id !== created.id)]);
      setForm(EMPTY_FORM);
      setPhoneCountry("BR");
      setCepMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível cadastrar o cliente.");
    } finally {
      setIsSaving(false);
    }
  }

  function openEdit(client: SalonClient) {
    setError("");
    setSuccess("");
    setEditingClient(client);
    setEditPhoneCountry("BR");
    const nextForm: ClientFormState = {
      data_nascimento: client.data_nascimento || "",
      nome: client.nome || "",
      telefone: getNationalPhone(client.telefone || "", "BR"),
      email: client.email || "",
      cep: formatCep(client.endereco?.cep || ""),
      uf: client.endereco?.uf || "",
      cidade: client.endereco?.cidade || "",
      logradouro: client.endereco?.logradouro || "",
      numero: client.endereco?.numero || "",
      observacoes: client.observacoes || "",
      aceita_campanhas: client.aceita_campanhas !== false,
      status: client.status === "inativo" ? "inativo" : "ativo"
    };
    setEditForm(nextForm);
    editBaseline.current = buildClientPayload(nextForm, "BR");
  }

  function closeEdit() {
    setEditingClient(null);
    setEditForm(EMPTY_FORM);
    setEditPhoneCountry("BR");
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !editingClient) return;

    if (!event.currentTarget.reportValidity()) return;
    if (editingClient.data_nascimento && !editForm.data_nascimento) { setError('A data de nascimento não pode ser apagada.'); return; }
    const validationMessage = validateClientForm(editForm, editPhoneCountry);
    if (validationMessage) {
      setError(validationMessage);
      setSuccess("");
      return;
    }

    setIsUpdating(true);
    setError("");
    setSuccess("");

    try {
      const proposed = buildClientPayload(editForm, editPhoneCountry);
      const baseline = editBaseline.current!;
      const patch: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(proposed)) {
        if (key === 'endereco') {
          if (value && typeof value === 'object') {
            const previous = baseline.endereco || {};
            const changes = Object.fromEntries(Object.entries(value).filter(([field, next]) => next !== undefined && next !== previous[field as keyof typeof previous]));
            if (Object.keys(changes).length) patch.endereco = changes;
          }
        } else if (value !== baseline[key as keyof typeof baseline] && !(key === 'data_nascimento' && !value)) patch[key] = value;
      }
      const updated = await clientsService.update(session, editingClient.id, patch);
      setClients((current) => current.map((client) => (client.id === updated.id ? updated : client)));
      closeEdit();
      setSuccess("Cliente atualizado com sucesso.");
      window.setTimeout(() => successRef.current?.focus({ preventScroll: true }), 120);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível atualizar o cliente.");
    } finally {
      setIsUpdating(false);
    }
  }

  const filteredClients = clients.filter((client) => {
    const needle = query.toLowerCase();
    return [client.nome, client.telefone, formatStoredPhone(client.telefone), client.email || ""].some((value) => value.toLowerCase().includes(needle));
  });

  return (
    <section className="space-y-5">
      <div className="rounded-[1.75rem] border border-white/80 bg-white/82 p-5 shadow-soft backdrop-blur-xl sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Relacionamento</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">Clientes do salão</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Cadastre contatos, encontre clientes rapidamente e mantenha a base pronta para agenda, campanhas e CRM.
        </p>
      </div>

      {error ? <FeedbackMessage tone="error" message={error} /> : null}
      {success ? <FeedbackMessage ref={successRef} tone="success" message={success} /> : null}

      <DashboardCard title="Ações rápidas" description="Atalhos para manter sua base organizada.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="group flex min-h-24 items-center gap-3 rounded-[1.35rem] border border-white/80 bg-white/90 p-4 text-left text-sm font-bold text-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-blush"
          >
            <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-secondary text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
              <Plus className="h-5 w-5" />
            </span>
            Novo cliente
          </button>
        </div>
      </DashboardCard>

      <div ref={formRef}>
        <DashboardCard title="Novo cliente" description="Informe nome, WhatsApp e data de nascimento para cadastrar um novo cliente.">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-[1.2fr_0.9fr_1fr_0.8fr_auto]">
              <Input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} placeholder="Nome do cliente" />
              <PhoneInput
                value={form.telefone}
                onChange={(value) => setForm({ ...form, telefone: value })}
                country={phoneCountry}
                onCountryChange={(country) => {
                  setPhoneCountry(country);
                  setForm({ ...form, telefone: "" });
                }}
              />
              <label className="grid gap-1 text-xs font-bold">Data de nascimento (obrigatória)
                <Input type="date" required min="0001-01-01" max={new Date().toISOString().slice(0, 10)} value={form.data_nascimento}
                  onChange={(event) => setForm({ ...form, data_nascimento: event.target.value })}
                  onInvalid={() => setError("Informe uma data de nascimento válida e não futura.")} />
              </label>
              <Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="email opcional" />
              <Input
                value={form.cep}
                onChange={(event) => setForm({ ...form, cep: formatCep(event.target.value) })}
                placeholder="CEP opcional"
                maxLength={9}
              />
              <Button type="submit" variant="accent" disabled={isSaving || !form.nome.trim() || !form.telefone.trim()}>
                <Plus className="h-4 w-4" />
                {isSaving ? "Salvando..." : "Adicionar"}
              </Button>
            </div>

            {form.cep.replace(/\D/g, "").length === 8 || isLoadingCep || cepMessage ? (
              <div className="rounded-2xl border border-border bg-background/80 p-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[110px_1fr_1.4fr_120px]">
                  <Input
                    value={form.uf}
                    onChange={(event) => setForm({ ...form, uf: event.target.value.toUpperCase().slice(0, 2) })}
                    placeholder="Estado"
                  />
                  <Input value={form.cidade} onChange={(event) => setForm({ ...form, cidade: event.target.value })} placeholder="Cidade" />
                  <Input
                    value={form.logradouro}
                    onChange={(event) => setForm({ ...form, logradouro: event.target.value })}
                    placeholder="Logradouro"
                  />
                  <Input value={form.numero} onChange={(event) => setForm({ ...form, numero: event.target.value })} placeholder="Número" />
                </div>
                {isLoadingCep || cepMessage ? (
                  <p className="mt-3 text-xs font-semibold text-muted-foreground">
                    {isLoadingCep ? "Consultando CEP..." : cepMessage}
                  </p>
                ) : null}
              </div>
            ) : null}
          </form>
        </DashboardCard>
      </div>

      <DashboardCard title="Clientes cadastrados" description="Base operacional para agenda, recorrência e campanhas futuras.">
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-border bg-white/90 px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome, telefone ou email"
            className="border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
        </div>

        {isLoading ? (
          <p className="text-sm font-semibold text-muted-foreground">Carregando clientes...</p>
        ) : filteredClients.length ? (
          <div className="grid gap-3">
            {filteredClients.map((client) => (
              <article key={client.id} className="rounded-2xl border border-white/80 bg-white/92 p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-primary">
                      <UsersRound className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="text-base font-bold text-foreground">{client.nome}</h2>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {formatStoredPhone(client.telefone)}
                        </span>
                        {client.email ? (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            {client.email}
                          </span>
                        ) : null}
                      </div>
                      {client.observacoes ? (
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">{client.observacoes}</p>
                      ) : null}
                      {client.endereco?.cidade || client.endereco?.logradouro ? (
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">
                          {[client.endereco.logradouro, client.endereco.numero, client.endereco.cidade, client.endereco.uf]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-primary sm:justify-end">
                    <span className="rounded-full bg-secondary px-3 py-1">{client.qtd_atendimentos} atend.</span>
                    <span className="rounded-full bg-secondary px-3 py-1">{client.status}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => openEdit(client)}
                      title="Editar cliente"
                      aria-label={`Editar cliente ${client.nome}`}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">
            Nenhum cliente encontrado. Cadastre o primeiro cliente para começar a construir sua base de relacionamento.
          </p>
        )}
      </DashboardCard>

      {editingClient ? (
        <div className="fixed inset-0 z-50 flex items-end bg-foreground/35 px-3 py-4 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-client-title"
            className="max-h-[92vh] w-full overflow-y-auto rounded-[1.5rem] border border-white/80 bg-white p-5 shadow-2xl sm:max-w-3xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Manutenção de cliente</p>
                <h2
                  id="edit-client-title"
                  ref={editTitleRef}
                  tabIndex={-1}
                  className="mt-2 text-xl font-bold text-foreground outline-none sm:text-2xl"
                >
                  Editar cliente — {editingClient.nome}
                </h2>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={closeEdit} aria-label="Fechar edição">
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>

            <form onSubmit={handleUpdate} className="mt-5 space-y-4">
              {error ? <FeedbackMessage tone="error" message={error} /> : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-bold text-foreground">Data de nascimento
                  <Input type="date" required={Boolean(editingClient?.data_nascimento)} min="0001-01-01" max={new Date().toISOString().slice(0, 10)} value={editForm.data_nascimento}
                    onChange={(event) => setEditForm({ ...editForm, data_nascimento: event.target.value })}
                    onInvalid={() => setError("Informe uma data de nascimento válida e não futura. Nascimento preenchido não pode ser apagado.")} />
                </label>
                <label className="space-y-1 text-xs font-bold text-foreground">
                  Nome
                  <Input value={editForm.nome} onChange={(event) => setEditForm({ ...editForm, nome: event.target.value })} />
                </label>
                <label className="space-y-1 text-xs font-bold text-foreground">
                  WhatsApp
                  <PhoneInput
                    value={editForm.telefone}
                    onChange={(value) => setEditForm({ ...editForm, telefone: value })}
                    country={editPhoneCountry}
                    onCountryChange={(country) => {
                      setEditPhoneCountry(country);
                      setEditForm({ ...editForm, telefone: "" });
                    }}
                  />
                </label>
                <label className="space-y-1 text-xs font-bold text-foreground">
                  Email
                  <Input value={editForm.email} onChange={(event) => setEditForm({ ...editForm, email: event.target.value })} />
                </label>
                <label className="space-y-1 text-xs font-bold text-foreground">
                  CEP
                  <Input
                    value={editForm.cep}
                    onChange={(event) => setEditForm({ ...editForm, cep: formatCep(event.target.value) })}
                    maxLength={9}
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-border bg-background/80 p-4">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[110px_1fr_1.4fr_120px]">
                  <label className="space-y-1 text-xs font-bold text-foreground">
                    Estado
                    <Input
                      value={editForm.uf}
                      onChange={(event) => setEditForm({ ...editForm, uf: event.target.value.toUpperCase().slice(0, 2) })}
                    />
                  </label>
                  <label className="space-y-1 text-xs font-bold text-foreground">
                    Cidade
                    <Input value={editForm.cidade} onChange={(event) => setEditForm({ ...editForm, cidade: event.target.value })} />
                  </label>
                  <label className="space-y-1 text-xs font-bold text-foreground">
                    Logradouro
                    <Input value={editForm.logradouro} onChange={(event) => setEditForm({ ...editForm, logradouro: event.target.value })} />
                  </label>
                  <label className="space-y-1 text-xs font-bold text-foreground">
                    Número
                    <Input value={editForm.numero} onChange={(event) => setEditForm({ ...editForm, numero: event.target.value })} />
                  </label>
                </div>
              </div>

              <label className="space-y-1 text-xs font-bold text-foreground">
                Observações
                <textarea
                  value={editForm.observacoes}
                  onChange={(event) => setEditForm({ ...editForm, observacoes: event.target.value })}
                  maxLength={1000}
                  className="min-h-24 w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-bold text-foreground">
                  Status
                  <select
                    value={editForm.status}
                    onChange={(event) => setEditForm({ ...editForm, status: event.target.value as ClientFormState["status"] })}
                    className="min-h-11 w-full rounded-full border border-border bg-white px-4 text-sm font-semibold text-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </label>
                <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-border bg-white px-4 text-sm font-semibold text-foreground shadow-sm">
                  <input
                    type="checkbox"
                    checked={editForm.aceita_campanhas}
                    onChange={(event) => setEditForm({ ...editForm, aceita_campanhas: event.target.checked })}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
                  />
                  Aceita campanhas
                </label>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={closeEdit} disabled={isUpdating}>
                  Cancelar
                </Button>
                <Button type="submit" variant="accent" disabled={isUpdating}>
                  {isUpdating ? "Salvando..." : "Salvar alterações"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function formatCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}
