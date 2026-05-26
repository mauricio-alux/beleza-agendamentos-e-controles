"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { CalendarClock, Plus, UserRoundCog } from "lucide-react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { teamService, type TeamProfessional } from "@/services/team.service";

type TeamFormState = {
  nome_publico: string;
  cargo: string;
  especialidade: string;
  percentual_comissao: string;
  aceita_agendamento_online: boolean;
};

const EMPTY_FORM: TeamFormState = {
  nome_publico: "",
  cargo: "",
  especialidade: "",
  percentual_comissao: "",
  aceita_agendamento_online: true
};

export function TeamManager() {
  const { session } = useAuth();
  const formRef = useRef<HTMLDivElement | null>(null);
  const [professionals, setProfessionals] = useState<TeamProfessional[]>([]);
  const [form, setForm] = useState<TeamFormState>(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    if (!session) return;

    setIsLoading(true);
    setError("");

    try {
      setProfessionals(await teamService.list(session));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar a equipe.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [session]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !form.nome_publico.trim()) return;

    setIsSaving(true);
    setError("");

    try {
      const created = await teamService.create(session, {
        nome_publico: form.nome_publico.trim(),
        cargo: form.cargo.trim() || null,
        especialidade: form.especialidade.trim() || null,
        percentual_comissao: Number(form.percentual_comissao || 0),
        aceita_agendamento_online: form.aceita_agendamento_online
      });

      setProfessionals((current) => [...current, created]);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel cadastrar o profissional.");
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
          Cadastre profissionais, defina se atendem online e configure horarios individuais para alimentar a agenda inteligente.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-sm font-semibold text-destructive shadow-sm">
          {error}
        </div>
      ) : null}

      <DashboardCard title="Acoes rapidas" description="Atalhos para organizar o time sem complexidade.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <button
            type="button"
            onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            className="group flex min-h-24 items-center gap-3 rounded-[1.35rem] border border-white/80 bg-white/90 p-4 text-left text-sm font-bold text-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:text-primary hover:shadow-blush"
          >
            <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-secondary text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
              <Plus className="h-5 w-5" />
            </span>
            Novo profissional
          </button>
        </div>
      </DashboardCard>

      <div ref={formRef}>
        <DashboardCard title="Novo profissional" description="Depois do cadastro, configure os horarios de atendimento individual.">
          <form onSubmit={handleCreate} className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr_0.9fr_0.65fr_auto]">
            <Input
              value={form.nome_publico}
              onChange={(event) => setForm({ ...form, nome_publico: event.target.value })}
              placeholder="Nome publico"
            />
            <Input value={form.cargo} onChange={(event) => setForm({ ...form, cargo: event.target.value })} placeholder="Cargo" />
            <Input
              value={form.especialidade}
              onChange={(event) => setForm({ ...form, especialidade: event.target.value })}
              placeholder="Especialidade"
            />
            <Input
              type="number"
              min={0}
              max={100}
              value={form.percentual_comissao}
              onChange={(event) => setForm({ ...form, percentual_comissao: event.target.value })}
              placeholder="Comissao %"
            />
            <Button type="submit" variant="accent" disabled={isSaving || !form.nome_publico.trim()}>
              <Plus className="h-4 w-4" />
              {isSaving ? "Salvando..." : "Adicionar"}
            </Button>
          </form>
          <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm font-semibold text-foreground">
            <input
              type="checkbox"
              checked={form.aceita_agendamento_online}
              onChange={(event) => setForm({ ...form, aceita_agendamento_online: event.target.checked })}
              className="h-5 w-5 rounded border-border accent-primary"
            />
            Aceita agendamento online
          </label>
        </DashboardCard>
      </div>

      <DashboardCard title="Equipe cadastrada" description="Profissionais disponiveis para agenda, servicos e escala individual.">
        {isLoading ? (
          <p className="text-sm font-semibold text-muted-foreground">Carregando equipe...</p>
        ) : professionals.length ? (
          <div className="grid gap-3">
            {professionals.map((professional) => (
              <article key={professional.id} className="rounded-2xl border border-white/80 bg-white/92 p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-primary">
                      <UserRoundCog className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="text-base font-bold text-foreground">{professional.nome_publico}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {[professional.cargo, professional.especialidade].filter(Boolean).join(" - ") || "Profissional"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-primary">
                        <span className="rounded-full bg-secondary px-3 py-1">
                          {professional.aceita_agendamento_online ? "Agenda online" : "Agenda interna"}
                        </span>
                        <span className="rounded-full bg-secondary px-3 py-1">
                          {professional.percentual_comissao}% comissao
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button asChild variant="outline">
                    <Link href={`/configuracoes/equipe/${professional.id}/agenda`}>
                      <CalendarClock className="h-4 w-4" />
                      Configurar horarios
                    </Link>
                  </Button>
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
