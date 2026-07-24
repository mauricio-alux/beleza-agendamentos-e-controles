"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Mail, Phone, Plus, Search, UsersRound } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { useAuth } from "@/hooks/useAuth";
import { clientsService, type SalonClient } from "@/services/clients.service";
import { formatStoredPhone, normalizePhoneToE164, type PhoneCountry } from "@/utils/phone";

type ClientFormState = {
  nome: string;
  telefone: string;
  email: string;
  cep: string;
  uf: string;
  cidade: string;
  logradouro: string;
  numero: string;
  aceita_campanhas: boolean;
};

const EMPTY_FORM: ClientFormState = {
  nome: "",
  telefone: "",
  email: "",
  cep: "",
  uf: "",
  cidade: "",
  logradouro: "",
  numero: "",
  aceita_campanhas: true
};

export function ClientsManager() {
  const { session } = useAuth();
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLDivElement | null>(null);
  const [clients, setClients] = useState<SalonClient[]>([]);
  const [form, setForm] = useState<ClientFormState>(EMPTY_FORM);
  const [phoneCountry, setPhoneCountry] = useState<PhoneCountry>("BR");
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [cepMessage, setCepMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    if (!session) return;

    setIsLoading(true);
    setError("");

    try {
      setClients(await clientsService.list(session));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar os clientes.");
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
          setCepMessage("CEP nao encontrado.");
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
          setCepMessage("Nao foi possivel consultar o CEP.");
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

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !form.nome.trim() || !form.telefone.trim()) return;

    setIsSaving(true);
    setError("");

    try {
      const created = await clientsService.create(session, {
        nome: form.nome.trim(),
        telefone: normalizePhoneToE164(form.telefone, phoneCountry),
        email: form.email.trim() || null,
        endereco: form.cep.replace(/\D/g, "").length === 8
          ? {
              cep: form.cep.replace(/\D/g, ""),
              uf: form.uf.trim() || undefined,
              cidade: form.cidade.trim() || undefined,
              logradouro: form.logradouro.trim() || undefined,
              numero: form.numero.trim() || undefined
            }
          : undefined,
        aceita_campanhas: form.aceita_campanhas
      });
      setClients((current) => [created, ...current.filter((client) => client.id !== created.id)]);
      setForm(EMPTY_FORM);
      setPhoneCountry("BR");
      setCepMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel cadastrar o cliente.");
    } finally {
      setIsSaving(false);
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
        <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">Clientes do salao</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Cadastre contatos, encontre clientes rapidamente e mantenha a base pronta para agenda, campanhas e CRM.
        </p>
      </div>

      {error ? <FeedbackMessage tone="error" message={error} /> : null}

      <DashboardCard title="Acoes rapidas" description="Atalhos para manter sua base organizada.">
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
        <DashboardCard title="Novo cliente" description="Nome e WhatsApp ja sao suficientes para operar a agenda.">
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
                  <Input value={form.numero} onChange={(event) => setForm({ ...form, numero: event.target.value })} placeholder="Numero" />
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

      <DashboardCard title="Clientes cadastrados" description="Base operacional para agenda, recorrencia e campanhas futuras.">
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
                  <div className="flex gap-2 text-xs font-bold text-primary">
                    <span className="rounded-full bg-secondary px-3 py-1">{client.qtd_atendimentos} atend.</span>
                    <span className="rounded-full bg-secondary px-3 py-1">{client.status}</span>
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
    </section>
  );
}

function formatCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}
