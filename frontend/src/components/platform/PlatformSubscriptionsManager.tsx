"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, PauseCircle, RefreshCcw, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  platformService,
  type PlatformPlan,
  type PlatformSubscription,
  type PlatformSubscriptionHistory
} from "@/services/platform.service";
import { APP_BRAND } from "@/config/app-brand";

const STATUS_OPTIONS = [
  "",
  "trial",
  "ativa",
  "expirada",
  "suspensa",
  "inadimplente",
  "cancelada",
  "pendente_pagamento"
];

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    trial: "Trial",
    ativa: "Ativa",
    ativo: "Ativo",
    expirada: "Expirada",
    vencida: "Vencida",
    suspensa: "Suspensa",
    inadimplente: "Inadimplente",
    cancelada: "Cancelada",
    pendente_pagamento: "Pendente pagamento"
  };
  return labels[status] || status;
}

export function PlatformSubscriptionsManager() {
  const { session, isLoading } = useAuth();
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<PlatformSubscription[]>([]);
  const [selected, setSelected] = useState<PlatformSubscription | null>(null);
  const [history, setHistory] = useState<PlatformSubscriptionHistory[]>([]);
  const [filters, setFilters] = useState({ status: "", plano_id: "", tenant: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredSubscriptions = useMemo(() => {
    const tenantTerm = filters.tenant.trim().toLowerCase();
    return subscriptions.filter((subscription) => {
      const tenantMatch = !tenantTerm
        || subscription.tenant?.nome_fantasia.toLowerCase().includes(tenantTerm)
        || subscription.tenant?.slug.toLowerCase().includes(tenantTerm);
      return tenantMatch;
    });
  }, [subscriptions, filters.tenant]);

  async function load() {
    if (!session) return;
    setIsRefreshing(true);
    setError("");

    try {
      const [plansResult, subscriptionsResult] = await Promise.all([
        platformService.listPlans(session),
        platformService.listSubscriptions(session, {
          status: filters.status,
          plano_id: filters.plano_id
        })
      ]);
      setPlans(plansResult);
      setSubscriptions(subscriptionsResult);
      if (selected) {
        const next = subscriptionsResult.find((item) => item.id === selected.id) || null;
        setSelected(next);
        if (next) setHistory(await platformService.listSubscriptionHistory(session, next.id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar assinaturas.");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function selectSubscription(subscription: PlatformSubscription) {
    if (!session) return;
    setError("");
    setSuccess("");
    setSelected(subscription);
    setHistory(await platformService.listSubscriptionHistory(session, subscription.id));
  }

  async function withObservation(action: (observacao: string) => Promise<void>, successMessage = "Alteração realizada com sucesso.") {
    const observacao = window.prompt("Informe a observacao/motivo da alteracao:");
    if (!observacao || observacao.trim().length < 3) return;
    if (!window.confirm("Confirmar alteracao critica da assinatura?")) return;
    setIsSubmitting(true);
    setError("");
    setSuccess("");

    try {
      await action(observacao.trim());
      setSuccess(successMessage);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível realizar a alteração.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function changeStatus(status: string, observationLabel = "masteradmin") {
    if (!session || !selected) return;
    await withObservation(async (observacao) => {
      const updated = await platformService.updateSubscriptionStatus(session, selected.id, {
        status,
        origem: "masteradmin",
        observacao,
        motivo_bloqueio: ["suspensa", "inadimplente", "cancelada", "expirada"].includes(status) ? observationLabel : null,
        confirm: true
      });
      setSelected(updated);
      setHistory(await platformService.listSubscriptionHistory(session, updated.id));
    }, "Status da assinatura atualizado.");
  }

  async function extendTrial() {
    if (!session || !selected) return;
    const days = window.prompt("Quantos dias deseja adicionar ao trial?", "30");
    const parsed = Number(days);
    if (!Number.isInteger(parsed) || parsed < 1) return;
    await withObservation(async (observacao) => {
      const updated = await platformService.extendSubscriptionTrial(session, selected.id, {
        dias: parsed,
        observacao,
        confirm: true
      });
      setSelected(updated);
      setHistory(await platformService.listSubscriptionHistory(session, updated.id));
    }, "Trial estendido com sucesso.");
  }

  async function changePlan(planId: string, changeType: "upgrade" | "downgrade" | "manual") {
    if (!session || !selected || !planId) return;
    await withObservation(async (observacao) => {
      const updated = await platformService.updateSubscriptionPlan(session, selected.id, {
        plano_id: planId,
        tipo_alteracao: changeType,
        origem: "masteradmin",
        observacao,
        confirm: true
      });
      setSelected(updated);
      setHistory(await platformService.listSubscriptionHistory(session, updated.id));
    }, "Plano da assinatura atualizado.");
  }

  useEffect(() => {
    if (!isLoading && session) load();
  }, [isLoading, session?.access_token, filters.status, filters.plano_id]);

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-soft">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
                {APP_BRAND.appName} Plataforma
              </p>
              <h1 className="mt-1 text-2xl font-bold text-foreground">Assinaturas dos estabelecimentos</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Manutenção MasterAdmin com histórico obrigatório para cada alteração.
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/admin">
                  <ArrowLeft className="h-4 w-4" />
                  Admin SaaS
                </Link>
              </Button>
              <Button type="button" onClick={load} disabled={isRefreshing || !session}>
                <RefreshCcw className={isRefreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                Atualizar
              </Button>
            </div>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-primary/25 bg-secondary/70 p-4 text-sm font-semibold text-foreground">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
            {success}
          </div>
        ) : null}

        <section className="grid gap-3 rounded-2xl border border-white/80 bg-white/85 p-5 shadow-soft md:grid-cols-3">
          <input
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            placeholder="Filtrar por estabelecimento ou slug"
            value={filters.tenant}
            onChange={(event) => setFilters((current) => ({ ...current, tenant: event.target.value }))}
          />
          <select
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status || "all"} value={status}>
                {status ? statusLabel(status) : "Todos os status"}
              </option>
            ))}
          </select>
          <select
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            value={filters.plano_id}
            onChange={(event) => setFilters((current) => ({ ...current, plano_id: event.target.value }))}
          >
            <option value="">Todos os planos</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>{plan.nome}</option>
            ))}
          </select>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="grid gap-3 rounded-2xl border border-white/80 bg-white/85 p-5 shadow-soft">
            <h2 className="text-lg font-bold text-foreground">Assinaturas</h2>
            {filteredSubscriptions.map((subscription) => (
              <button
                key={subscription.id}
                type="button"
                onClick={() => selectSubscription(subscription)}
                className="rounded-xl border border-border bg-background/80 p-4 text-left transition hover:border-primary"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-foreground">{subscription.tenant?.nome_fantasia || "Estabelecimento"}</p>
                    <p className="text-xs text-muted-foreground">{subscription.tenant?.slug}</p>
                  </div>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">
                    {statusLabel(subscription.status)}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  <span>Plano: {subscription.plano?.nome || "-"}</span>
                  <span>Pagamento: {subscription.status_pagamento || "-"}</span>
                  <span>Trial ate: {formatDate(subscription.trial_ate)}</span>
                  <span>Expira em: {formatDate(subscription.expira_em || subscription.data_fim)}</span>
                </div>
              </button>
            ))}
          </div>

          <aside className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-soft">
            {selected ? (
              <div className="grid gap-5">
                <div>
                  <h2 className="text-lg font-bold text-foreground">{selected.tenant?.nome_fantasia}</h2>
                  <p className="text-sm text-muted-foreground">{selected.tenant?.slug}</p>
                </div>

                <div className="grid gap-2 rounded-xl border border-border bg-background/70 p-4 text-sm">
                  <p><strong>Status:</strong> {statusLabel(selected.status)}</p>
                  <p><strong>Plano:</strong> {selected.plano?.nome || "-"}</p>
                  <p><strong>Inicio:</strong> {formatDate(selected.data_inicio)}</p>
                  <p><strong>Trial ate:</strong> {formatDate(selected.trial_ate)}</p>
                  <p><strong>Proxima renovacao:</strong> {formatDate(selected.proxima_renovacao)}</p>
                  <p><strong>Expira em:</strong> {formatDate(selected.expira_em || selected.data_fim)}</p>
                  <p><strong>Motivo bloqueio:</strong> {selected.bloqueio_motivo || "-"}</p>
                  <p><strong>Ultima origem:</strong> {selected.origem_ultima_alteracao || "-"}</p>
                  <p><strong>Responsavel:</strong> {selected.alterado_por?.nome || "-"}</p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <Button type="button" onClick={() => changeStatus("ativa")} disabled={isSubmitting}>
                    <CheckCircle2 className="h-4 w-4" />
                    Ativar
                  </Button>
                  <Button type="button" variant="outline" onClick={extendTrial} disabled={isSubmitting}>
                    <RotateCcw className="h-4 w-4" />
                    Estender trial
                  </Button>
                  <Button type="button" variant="outline" onClick={() => changeStatus("suspensa", "suspensao administrativa")} disabled={isSubmitting}>
                    <PauseCircle className="h-4 w-4" />
                    Suspender
                  </Button>
                  <Button type="button" variant="outline" onClick={() => changeStatus("cancelada", "cancelamento administrativo")} disabled={isSubmitting}>
                    <XCircle className="h-4 w-4" />
                    Cancelar
                  </Button>
                </div>

                <div className="grid gap-2">
                  <select
                    className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    defaultValue=""
                    onChange={(event) => {
                      const planId = event.target.value;
                      if (planId && !isSubmitting) changePlan(planId, "manual");
                      event.target.value = "";
                    }}
                    disabled={isSubmitting}
                  >
                    <option value="">Alterar plano...</option>
                    {plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>{plan.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <h3 className="font-bold text-foreground">Histórico</h3>
                  <div className="mt-3 grid max-h-80 gap-2 overflow-auto">
                    {history.map((item) => (
                      <div key={item.id} className="rounded-xl border border-border bg-background/70 p-3 text-sm">
                        <p className="font-semibold text-foreground">
                          {item.tipo_alteracao} - {item.status_anterior || "-"} para {item.status_novo || "-"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.origem} - {new Date(item.created_at).toLocaleString("pt-BR")} - {item.usuario?.nome || "Sistema"}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">{item.observacao || "-"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Selecione uma assinatura para visualizar detalhes e acoes.</p>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}
