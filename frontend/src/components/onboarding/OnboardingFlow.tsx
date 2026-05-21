"use client";

import { Plus, ShieldCheck, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { CompletionCard } from "@/components/onboarding/CompletionCard";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { SetupCard } from "@/components/onboarding/SetupCard";
import { WelcomeCard } from "@/components/onboarding/WelcomeCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { cn } from "@/lib/utils";

export function OnboardingFlow() {
  const { currentStep } = useOnboarding();

  return (
    <OnboardingLayout>
      {currentStep.id === "welcome" ? <WelcomeCard /> : null}
      {currentStep.id === "salon" ? <SalonStep /> : null}
      {currentStep.id === "operation" ? <OperationStep /> : null}
      {currentStep.id === "services" ? <ServicesStep /> : null}
      {currentStep.id === "professional" ? <ProfessionalStep /> : null}
      {currentStep.id === "completion" ? <CompletionCard /> : null}
    </OnboardingLayout>
  );
}

function SalonStep() {
  const { data, updateData } = useOnboarding();

  return (
    <SetupCard title="Informacoes do salao" description="Use os dados que seus clientes reconhecem no dia a dia.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome fantasia" className="sm:col-span-2">
          <Input
            value={data.nome_fantasia}
            onChange={(event) => updateData({ nome_fantasia: event.target.value })}
            placeholder="Bellory Beauty Studio"
          />
        </Field>
        <Field label="Telefone">
          <Input
            value={data.telefone}
            onChange={(event) => updateData({ telefone: event.target.value })}
            placeholder="(11) 99999-9999"
          />
        </Field>
        <Field label="WhatsApp">
          <Input
            value={data.whatsapp}
            onChange={(event) => updateData({ whatsapp: event.target.value })}
            placeholder="(11) 99999-9999"
          />
        </Field>
        <Field label="Cidade">
          <Input
            value={data.cidade}
            onChange={(event) => updateData({ cidade: event.target.value })}
            placeholder="Sao Paulo"
          />
        </Field>
        <Field label="Estado">
          <Input
            value={data.estado}
            onChange={(event) => updateData({ estado: event.target.value.toUpperCase().slice(0, 2) })}
            placeholder="SP"
          />
        </Field>
        <Field label="Inicio do expediente">
          <Input
            type="time"
            value={data.horario_inicio_padrao}
            onChange={(event) => updateData({ horario_inicio_padrao: event.target.value })}
          />
        </Field>
        <Field label="Fim do expediente">
          <Input
            type="time"
            value={data.horario_fim_padrao}
            onChange={(event) => updateData({ horario_fim_padrao: event.target.value })}
          />
        </Field>
      </div>
    </SetupCard>
  );
}

function OperationStep() {
  const { data, updateData } = useOnboarding();

  return (
    <SetupCard title="Configuracao operacional" description="Defina a cadencia inicial da agenda. Voce pode ajustar depois.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Intervalo padrao da agenda">
          <select
            value={data.intervalo_agendamento}
            onChange={(event) => updateData({ intervalo_agendamento: Number(event.target.value) })}
            className="h-12 w-full rounded-2xl border border-input bg-white/90 px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
          >
            <option value={15}>15 minutos</option>
            <option value={30}>30 minutos</option>
            <option value={45}>45 minutos</option>
            <option value={60}>60 minutos</option>
          </select>
        </Field>
        <Field label="Duracao padrao dos servicos">
          <select
            value={data.duracao_padrao_servico}
            onChange={(event) => updateData({ duracao_padrao_servico: Number(event.target.value) })}
            className="h-12 w-full rounded-2xl border border-input bg-white/90 px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
          >
            <option value={30}>30 minutos</option>
            <option value={45}>45 minutos</option>
            <option value={60}>60 minutos</option>
            <option value={90}>90 minutos</option>
          </select>
        </Field>
        <Field label="Moeda">
          <select
            value={data.moeda}
            onChange={(event) => updateData({ moeda: event.target.value })}
            className="h-12 w-full rounded-2xl border border-input bg-white/90 px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
          >
            <option value="BRL">Real brasileiro</option>
            <option value="USD">Dolar</option>
            <option value="EUR">Euro</option>
          </select>
        </Field>
        <Field label="Timezone">
          <select
            value={data.timezone}
            onChange={(event) => updateData({ timezone: event.target.value })}
            className="h-12 w-full rounded-2xl border border-input bg-white/90 px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
          >
            <option value="America/Sao_Paulo">America/Sao_Paulo</option>
            <option value="America/Manaus">America/Manaus</option>
            <option value="America/Recife">America/Recife</option>
          </select>
        </Field>
      </div>
    </SetupCard>
  );
}

function ServicesStep() {
  const { data, updateService, addService } = useOnboarding();
  const [serviceName, setServiceName] = useState("");

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addService(serviceName);
    setServiceName("");
  }

  return (
    <SetupCard title="Servicos iniciais" description="Selecione o que ja faz sentido para seu salao comecar hoje.">
      <div className="grid gap-3 sm:grid-cols-2">
        {data.services.map((service) => (
          <button
            key={service.nome}
            type="button"
            onClick={() => updateService(service.nome, !service.selected)}
            className={cn(
              "rounded-2xl border p-4 text-left transition duration-200",
              service.selected
                ? "border-primary/40 bg-secondary shadow-sm"
                : "border-border bg-background hover:border-primary/30"
            )}
          >
            <span className="block text-base font-bold text-foreground">{service.nome}</span>
            <span className="mt-1 block text-sm text-muted-foreground">{service.duracao_minutos} minutos</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleAdd} className="mt-5 flex flex-col gap-3 rounded-2xl border border-border bg-background p-3 sm:flex-row">
        <Input
          value={serviceName}
          onChange={(event) => setServiceName(event.target.value)}
          placeholder="Adicionar outro servico"
        />
        <Button type="submit" variant="accent" className="sm:w-auto">
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </form>
    </SetupCard>
  );
}

function ProfessionalStep() {
  const { session } = useAuth();

  return (
    <SetupCard
      title="Profissional administrador"
      description="Este usuario fica como responsavel inicial do salao. Depois, voce podera cadastrar outros profissionais."
    >
      <div className="rounded-[1.5rem] border border-border bg-background p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-secondary text-primary">
              <UserRound className="h-7 w-7" />
            </span>
            <div>
              <p className="text-lg font-bold text-foreground">{session?.usuario.nome}</p>
              <p className="text-sm text-muted-foreground">{session?.usuario.email}</p>
            </div>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-accent shadow-sm">
            <ShieldCheck className="h-4 w-4" />
            {session?.usuario.tipo_usuario || "Administrador"}
          </span>
        </div>
      </div>
    </SetupCard>
  );
}

function Field({
  label,
  children,
  className
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
