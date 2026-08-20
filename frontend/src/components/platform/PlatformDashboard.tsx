"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Building2, CircleDollarSign, CreditCard, Gauge, LogOut, Megaphone, MessageSquareText, RefreshCcw, ShieldCheck, Tags, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { platformService, type PlatformSummary } from "@/services/platform.service";
import { APP_BRAND } from "@/config/app-brand";
import { resolveEventLabel } from "@/lib/event-display";

function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Gauge }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

export function PlatformDashboard() {
  const router = useRouter();
  const { session, isLoading, logout } = useAuth();
  const [summary, setSummary] = useState<PlatformSummary | null>(null);
  const [error, setError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function load() {
    if (!session) return;

    setIsRefreshing(true);
    setError("");

    try {
      setSummary(await platformService.getSummary(session));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar a plataforma.");
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    if (isLoading) return;

    if (!session) {
      router.replace("/login");
      return;
    }

    const isMaster = session.usuario.tipo_usuario_global === "MasterAdmin" || session.usuario.tipo_usuario === "MasterAdmin";
    if (!isMaster) {
      router.replace("/dashboard");
      return;
    }

    load();
  }, [isLoading, session?.access_token]);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="flex flex-col gap-4 rounded-2xl border border-white/80 bg-white/85 p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
              {APP_BRAND.appName} Plataforma
            </p>
            <h1 className="mt-1 text-2xl font-bold text-foreground">Admin SaaS</h1>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={load} disabled={isRefreshing || !session}>
              <RefreshCcw className={isRefreshing ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
              Atualizar
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={handleLogout} aria-label="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {error ? (
          <div className="rounded-2xl border border-primary/25 bg-secondary/70 p-4 text-sm font-semibold text-foreground">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="MRR" value={summary?.kpis.display.mrr || "R$ 0,00"} icon={CircleDollarSign} />
          <MetricCard label="Churn" value={summary?.kpis.display.churn || "0%"} icon={Activity} />
          <MetricCard label="Crescimento" value={summary?.kpis.display.growth || "0%"} icon={TrendingUp} />
          <MetricCard label="Estabelecimentos ativos" value={summary?.kpis.display.tenantsActive || "0"} icon={Building2} />
          <MetricCard label="Trial" value={summary?.kpis.display.tenantsTrial || "0"} icon={Gauge} />
        </section>

        <section className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-soft">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-primary">
                <MessageSquareText className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-foreground">Comunicação</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Templates globais e por estabelecimento para WhatsApp operacional.
                </p>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">
                  Próximos: Mensagens WhatsApp, Templates Aprovados, Fila de Envio, Providers.
                </p>
              </div>
            </div>
            <Button asChild type="button">
              <Link href="/admin/comunicacao/templates">
                <MessageSquareText className="h-4 w-4" />
                Templates de Comunicação
              </Link>
            </Button>
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-primary">
                <CreditCard className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-foreground">Assinaturas</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Manutenção de planos, trials e status dos estabelecimentos.
                </p>
              </div>
            </div>
            <Button asChild type="button" variant="outline">
              <Link href="/admin/assinaturas">
                <CreditCard className="h-4 w-4" />
                Assinaturas
              </Link>
            </Button>
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-primary">
                <Tags className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-foreground">Taxonomia SaaS</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tipos de negocio, catalogo oficial, cargos, especialidades e compatibilidades globais.
                </p>
              </div>
            </div>
            <Button asChild type="button" variant="outline">
              <Link href="/admin/taxonomia">
                <Tags className="h-4 w-4" />
                Taxonomia
              </Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-soft">
            <div className="mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Estabelecimentos recentes</h2>
            </div>
            <div className="grid gap-3">
              {(summary?.tenants || []).map((tenant) => (
                <div key={tenant.id} className="flex items-center justify-between rounded-xl border border-border bg-background/70 p-3">
                  <div>
                    <p className="font-semibold text-foreground">{tenant.nome_fantasia}</p>
                    <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                  </div>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">{tenant.status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-soft">
            <div className="mb-4 flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Campanhas globais</h2>
            </div>
            <div className="grid gap-3">
              {(summary?.campaigns || []).map((campaign) => (
                <div key={campaign.id} className="rounded-xl border border-border bg-background/70 p-3">
                  <p className="font-semibold text-foreground">{campaign.nome}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{campaign.escopo} · {campaign.status}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-soft">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">Auditoria</h2>
          </div>
          <div className="grid gap-3">
            {(summary?.auditLogs || []).map((log) => (
              <div key={log.id} className="min-w-0 rounded-xl border border-border bg-background/70 p-3">
                <p className="break-words font-semibold text-foreground">{resolveEventLabel(log.event_type)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{log.origem} · {new Date(log.created_at).toLocaleString("pt-BR")}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
