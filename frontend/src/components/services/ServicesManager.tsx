"use client";

import { FormEvent, useEffect, useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABELS,
  SERVICE_DURATION_OPTIONS,
  type ServiceCategory
} from "@/constants/service-categories";
import { useAuth } from "@/hooks/useAuth";
import { servicesService, type SalonService, type SalonServicePayload } from "@/services/services.service";

type ServiceFormState = {
  nome: string;
  duracao_minutos: number;
  customDuration: string;
  preco: string;
  categoria: ServiceCategory | "";
};

const EMPTY_FORM: ServiceFormState = {
  nome: "",
  duracao_minutos: 45,
  customDuration: "",
  preco: "",
  categoria: ""
};

export function ServicesManager() {
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
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar os servicos.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [session]);

  function toPayload(state: ServiceFormState): SalonServicePayload {
    return {
      nome: state.nome.trim(),
      duracao_minutos: state.duracao_minutos === 0 ? Number(state.customDuration) : state.duracao_minutos,
      preco: parseCurrency(state.preco),
      categoria: state.categoria || null,
      permite_online: true
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
      setError(err instanceof Error ? err.message : "Nao foi possivel criar o servico.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdate(id: string) {
    if (!session || !editingForm.nome.trim()) return;

    setIsSaving(true);
    setError("");

    try {
      const updated = await servicesService.update(session, id, toPayload(editingForm));
      setServices((current) => current.map((service) => (service.id === id ? updated : service)));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel atualizar o servico.");
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
      setError(err instanceof Error ? err.message : "Nao foi possivel remover o servico.");
    } finally {
      setIsSaving(false);
    }
  }

  function startEdit(service: SalonService) {
    setEditingId(service.id);
    setEditingForm({
      nome: service.nome,
      duracao_minutos: SERVICE_DURATION_OPTIONS.includes(service.duracao_minutos as never) ? service.duracao_minutos : 0,
      customDuration: SERVICE_DURATION_OPTIONS.includes(service.duracao_minutos as never) ? "" : String(service.duracao_minutos),
      preco: formatCurrency(service.preco),
      categoria: service.categoria || ""
    });
  }

  return (
    <section className="space-y-5">
      <div className="rounded-[1.75rem] border border-white/80 bg-white/82 p-5 shadow-soft backdrop-blur-xl sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Catalogo operacional</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">Servicos do salao</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Cadastre nome, duracao, preco e categoria para alimentar agenda, KPIs e campanhas futuras.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-sm font-semibold text-destructive shadow-sm">
          {error}
        </div>
      ) : null}

      <DashboardCard title="Novo servico" description="Comece simples. Voce pode ajustar depois.">
        <ServiceForm form={form} setForm={setForm} onSubmit={handleCreate} submitLabel="Adicionar" isSaving={isSaving} />
      </DashboardCard>

      <DashboardCard title="Servicos cadastrados" description="Duracao e preco ja impactam a agenda e os indicadores.">
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
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-base font-bold text-foreground">{service.nome}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {service.duracao_minutos} min · {formatCurrency(service.preco)}
                        {service.categoria ? ` · ${SERVICE_CATEGORY_LABELS[service.categoria]}` : ""}
                      </p>
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
  form,
  setForm,
  onSubmit,
  submitLabel,
  isSaving,
  onCancel
}: {
  form: ServiceFormState;
  setForm: (form: ServiceFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  isSaving: boolean;
  onCancel?: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-3 lg:grid-cols-[1.3fr_0.9fr_0.9fr_1fr_auto_auto]">
      <Input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} placeholder="Nome do servico" />
      <DurationField form={form} setForm={setForm} />
      <Input value={form.preco} onChange={(event) => setForm({ ...form, preco: formatCurrencyInput(event.target.value) })} placeholder="R$ 80,00" />
      <CategoryField value={form.categoria} onChange={(categoria) => setForm({ ...form, categoria })} />
      <Button type="submit" variant="accent" disabled={isSaving}>
        {submitLabel === "Salvar" ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {isSaving ? "Salvando..." : submitLabel}
      </Button>
      {onCancel ? (
        <Button type="button" variant="ghost" size="icon" onClick={onCancel} aria-label="Cancelar edicao">
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </form>
  );
}

function DurationField({ form, setForm }: { form: ServiceFormState; setForm: (form: ServiceFormState) => void }) {
  return (
    <div className="grid gap-2">
      <select
        value={form.duracao_minutos}
        onChange={(event) => setForm({ ...form, duracao_minutos: Number(event.target.value) })}
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
          onChange={(event) => setForm({ ...form, customDuration: event.target.value })}
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
      <option value="">Categoria opcional</option>
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
