"use client";

import { Pencil, Plus, ShieldCheck, Trash2, UserRound, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { CompletionCard } from "@/components/onboarding/CompletionCard";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { SetupCard } from "@/components/onboarding/SetupCard";
import { WelcomeCard } from "@/components/onboarding/WelcomeCard";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { APP_BRAND } from "@/config/app-brand";
import {
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABELS,
  SERVICE_DURATION_OPTIONS,
  type ServiceCategory
} from "@/constants/service-categories";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { cn } from "@/lib/utils";
import { type PhoneCountry } from "@/utils/phone";

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
  const [phoneCountry, setPhoneCountry] = useState<PhoneCountry>("BR");
  const [whatsappCountry, setWhatsappCountry] = useState<PhoneCountry>("BR");

  return (
    <SetupCard title="Informacoes do salao" description="Use os dados que seus clientes reconhecem no dia a dia.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome fantasia" className="sm:col-span-2">
          <Input
            value={data.nome_fantasia}
            onChange={(event) => updateData({ nome_fantasia: event.target.value })}
            placeholder={`${APP_BRAND.appName} Beauty Studio`}
          />
        </Field>
        <Field label="Telefone">
          <PhoneInput
            value={data.telefone}
            onChange={(value) => updateData({ telefone: value })}
            country={phoneCountry}
            onCountryChange={(country) => {
              setPhoneCountry(country);
              updateData({ telefone: "" });
            }}
          />
        </Field>
        <Field label="WhatsApp">
          <PhoneInput
            value={data.whatsapp}
            onChange={(value) => updateData({ whatsapp: value })}
            country={whatsappCountry}
            onCountryChange={(country) => {
              setWhatsappCountry(country);
              updateData({ whatsapp: "" });
            }}
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
        <Field
          label="Intervalo padrao da agenda"
          description="Define a distancia entre os horarios oferecidos na agenda online, como 09:00, 09:30 e 10:00."
        >
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
        <Field
          label="Duracao padrao dos servicos"
          description="Usada como sugestao inicial para novos servicos; cada servico ainda pode ter sua propria duracao."
        >
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
        <Field label="Como voce usa WhatsApp no negocio?" description="Essa resposta ajuda o Bellory a preparar campanhas do jeito certo.">
          <select
            value={data.whatsapp_usage_type}
            onChange={(event) => updateData({ whatsapp_usage_type: event.target.value as typeof data.whatsapp_usage_type })}
            className="h-12 w-full rounded-2xl border border-input bg-white/90 px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
          >
            <option value="business_app">WhatsApp Business App</option>
            <option value="messenger">WhatsApp Messenger</option>
            <option value="cloud_api">WhatsApp Business Platform</option>
            <option value="not_used">Ainda nao uso WhatsApp</option>
          </select>
        </Field>
        <Field label="Como deseja enviar campanhas?" description="Voce ainda podera decidir por campanha depois.">
          <select
            value={data.campaign_execution_mode}
            onChange={(event) => updateData({ campaign_execution_mode: event.target.value as typeof data.campaign_execution_mode })}
            className="h-12 w-full rounded-2xl border border-input bg-white/90 px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
          >
            <option value="tenant_assisted">Eu mesmo envio pelo meu WhatsApp</option>
            <option value="saas_managed">Usar envio da plataforma quando disponivel</option>
            <option value="choose_each_campaign">Decidir a cada campanha</option>
          </select>
        </Field>
        {data.campaign_execution_mode !== "saas_managed" ? (
          <Field label="Distribuicao manual preferida">
            <select
              value={data.manual_distribution_preference}
              onChange={(event) => updateData({ manual_distribution_preference: event.target.value as typeof data.manual_distribution_preference })}
              className="h-12 w-full rounded-2xl border border-input bg-white/90 px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
            >
              <option value="choose_each_campaign">Escolher a cada campanha</option>
              <option value="broadcast_list">Lista de Transmissao</option>
              <option value="manual_contacts">Envio manual para contatos</option>
              <option value="other_whatsapp_method">Outro metodo do WhatsApp</option>
            </select>
          </Field>
        ) : null}
      </div>
    </SetupCard>
  );
}

function ServicesStep() {
  const { data, updateService, upsertService, removeService } = useOnboarding();
  const [serviceName, setServiceName] = useState("");
  const [duration, setDuration] = useState(45);
  const [customDuration, setCustomDuration] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<ServiceCategory | "">("");
  const [editingService, setEditingService] = useState<string | null>(null);

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const finalDuration = duration === 0 ? Number(customDuration) : duration;
    upsertService({
      nome: serviceName,
      duracao_minutos: finalDuration || data.duracao_padrao_servico,
      preco: parseCurrency(price),
      categoria: category,
      custom: true,
      selected: true
    });
    setServiceName("");
    setDuration(45);
    setCustomDuration("");
    setPrice("");
    setCategory("");
  }

  function startEdit(serviceNameValue: string) {
    setEditingService((current) => (current === serviceNameValue ? null : serviceNameValue));
  }

  return (
    <SetupCard title="Servicos iniciais" description="Selecione o que ja faz sentido para seu salao comecar hoje.">
      <div className="grid gap-3">
        {data.services.map((service) => (
          <div
            key={service.nome}
            className={cn(
              "rounded-2xl border p-4 transition duration-200",
              service.selected
                ? "border-primary/40 bg-secondary shadow-sm"
                : "border-border bg-background hover:border-primary/30"
            )}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <button
                type="button"
                onClick={() => updateService(service.nome, !service.selected)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block text-base font-bold text-foreground">{service.nome}</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {service.duracao_minutos} min · {formatCurrency(service.preco)}
                  {service.categoria ? ` · ${SERVICE_CATEGORY_LABELS[service.categoria]}` : ""}
                </span>
              </button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="icon" onClick={() => startEdit(service.nome)} aria-label="Editar servico">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeService(service.nome)} aria-label="Remover servico">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {editingService === service.nome ? (
              <ServiceInlineEditor
                service={service}
                onClose={() => setEditingService(null)}
                onSave={(nextService) => {
                  upsertService(nextService);
                  setEditingService(null);
                }}
              />
            ) : null}
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="mt-5 grid gap-3 rounded-2xl border border-border bg-background p-3 lg:grid-cols-[1.4fr_0.9fr_0.9fr_1fr_auto]">
        <Input value={serviceName} onChange={(event) => setServiceName(event.target.value)} placeholder="Nome do servico" />
        <DurationSelect duration={duration} customDuration={customDuration} onDurationChange={setDuration} onCustomDurationChange={setCustomDuration} />
        <Input value={price} onChange={(event) => setPrice(formatCurrencyInput(event.target.value))} placeholder="R$ 80,00" />
        <CategorySelect value={category} onChange={setCategory} />
        <Button type="submit" variant="accent">
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </form>
    </SetupCard>
  );
}

type ServiceEditorPayload = {
  nome: string;
  duracao_minutos: number;
  preco: number;
  categoria?: ServiceCategory | "";
  custom?: boolean;
  selected?: boolean;
  metadata?: Record<string, unknown>;
};

function ServiceInlineEditor({
  service,
  onSave,
  onClose
}: {
  service: ServiceEditorPayload;
  onSave: (service: ServiceEditorPayload) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(service.nome);
  const [duration, setDuration] = useState(
    SERVICE_DURATION_OPTIONS.includes(service.duracao_minutos as (typeof SERVICE_DURATION_OPTIONS)[number])
      ? service.duracao_minutos
      : 0
  );
  const [customDuration, setCustomDuration] = useState(
    SERVICE_DURATION_OPTIONS.includes(service.duracao_minutos as (typeof SERVICE_DURATION_OPTIONS)[number])
      ? ""
      : String(service.duracao_minutos)
  );
  const [price, setPrice] = useState(formatCurrency(service.preco));
  const [category, setCategory] = useState<ServiceCategory | "">(service.categoria || "");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({
      nome: name,
      duracao_minutos: duration === 0 ? Number(customDuration) : duration,
      preco: parseCurrency(price),
      categoria: category,
      custom: service.custom,
      selected: service.selected,
      metadata: service.metadata
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 grid gap-3 rounded-2xl border border-white/70 bg-white/80 p-3 lg:grid-cols-[1.4fr_0.9fr_0.9fr_1fr_auto_auto]">
      <Input value={name} onChange={(event) => setName(event.target.value)} />
      <DurationSelect duration={duration} customDuration={customDuration} onDurationChange={setDuration} onCustomDurationChange={setCustomDuration} />
      <Input value={price} onChange={(event) => setPrice(formatCurrencyInput(event.target.value))} />
      <CategorySelect value={category} onChange={setCategory} />
      <Button type="submit" variant="accent">Salvar</Button>
      <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar edicao">
        <X className="h-4 w-4" />
      </Button>
    </form>
  );
}

function DurationSelect({
  duration,
  customDuration,
  onDurationChange,
  onCustomDurationChange
}: {
  duration: number;
  customDuration: string;
  onDurationChange: (value: number) => void;
  onCustomDurationChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <select
        value={duration}
        onChange={(event) => onDurationChange(Number(event.target.value))}
        className="h-12 w-full rounded-2xl border border-input bg-white/90 px-4 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25"
      >
        {SERVICE_DURATION_OPTIONS.map((option) => (
          <option key={option} value={option}>{option} min</option>
        ))}
        <option value={0}>Personalizado</option>
      </select>
      {duration === 0 ? (
        <Input
          type="number"
          min={1}
          value={customDuration}
          onChange={(event) => onCustomDurationChange(event.target.value)}
          placeholder="75 min"
        />
      ) : null}
    </div>
  );
}

function CategorySelect({ value, onChange }: { value: ServiceCategory | ""; onChange: (value: ServiceCategory | "") => void }) {
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
  className,
  description
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  description?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      {children}
      {description ? <p className="text-xs leading-5 text-muted-foreground">{description}</p> : null}
    </div>
  );
}
