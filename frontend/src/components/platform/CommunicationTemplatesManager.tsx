"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Eye, FileText, MessageSquareText, RefreshCcw, Save, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  platformService,
  type CommunicationTemplate,
  type CommunicationTemplatePayload,
  type CommunicationProviderStatus,
  type WhatsAppMessageLog
} from "@/services/platform.service";
import { APP_BRAND } from "@/config/app-brand";
import { cn } from "@/lib/utils";

type TemplateForm = {
  tenant_id: string;
  nome: string;
  canal: "whatsapp" | "email" | "sms" | "push";
  tipo: string;
  assunto: string;
  conteudo: string;
  variaveis: string;
  provider_template_name: string;
  language: string;
  categoria_provider: string;
  ultima_sincronizacao_provider: string;
  observacoes: string;
  aprovado_provider: boolean;
  ativo: boolean;
};

const EMPTY_FORM: TemplateForm = {
  tenant_id: "",
  nome: "",
  canal: "whatsapp",
  tipo: "operacional",
  assunto: "",
  conteudo: "",
  variaveis: "",
  provider_template_name: "",
  language: "pt_BR",
  categoria_provider: "agendamento",
  ultima_sincronizacao_provider: "",
  observacoes: "",
  aprovado_provider: false,
  ativo: true
};

type CommunicationTab = "templates" | "messages" | "approved" | "queue" | "providers";

const NAV_ITEMS: Array<{ id: CommunicationTab; label: string }> = [
  { id: "templates", label: "Templates de Comunicacao" },
  { id: "messages", label: "Mensagens WhatsApp" },
  { id: "approved", label: "Templates Aprovados" },
  { id: "queue", label: "Fila de Envio" },
  { id: "providers", label: "Configuracao dos Providers" }
];

function extractVariables(content: string) {
  return Array.from(content.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g))
    .map((match) => match[1])
    .filter((value, index, list) => list.indexOf(value) === index)
    .sort();
}

function extractPlaceholders(content: string) {
  return Array.from(content.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g))
    .map((match) => match[1].trim())
    .filter(Boolean);
}

function parseVariables(value: string) {
  return value
    .split(/[\n,;]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index);
}

function getWhatsAppValidationIssues(content: string, variables: string[]) {
  const placeholders = extractPlaceholders(content);
  const namedPlaceholders = placeholders.filter((placeholder) => !/^\d+$/.test(placeholder));
  const positions = placeholders
    .filter((placeholder) => /^\d+$/.test(placeholder))
    .map((placeholder) => Number(placeholder));
  const uniquePositions = Array.from(new Set(positions)).sort((left, right) => left - right);
  const duplicatePositions = uniquePositions.filter((position) => (
    positions.filter((item) => item === position).length > 1
  ));
  const expectedPositions = Array.from({ length: variables.length }, (_, index) => index + 1);

  return {
    namedPlaceholders,
    duplicatePositions,
    missingPositions: expectedPositions.filter((position) => !uniquePositions.includes(position)),
    positionsWithoutVariables: uniquePositions.filter((position) => position < 1 || position > variables.length),
    countMismatch: uniquePositions.length !== variables.length
  };
}

function toForm(template: CommunicationTemplate): TemplateForm {
  return {
    tenant_id: template.tenant_id || "",
    nome: template.nome || "",
    canal: template.canal || "whatsapp",
    tipo: template.tipo || "operacional",
    assunto: template.assunto || "",
    conteudo: template.conteudo || "",
    variaveis: (template.variaveis || []).join("\n"),
    provider_template_name: template.provider_template_name || "",
    language: template.language || "pt_BR",
    categoria_provider: template.categoria_provider || "",
    ultima_sincronizacao_provider: template.ultima_sincronizacao_provider || "",
    observacoes: template.observacoes || "",
    aprovado_provider: template.aprovado_provider === true,
    ativo: template.ativo !== false
  };
}

function toPayload(form: TemplateForm, editing: boolean): CommunicationTemplatePayload {
  const payload: CommunicationTemplatePayload = {
    conteudo: form.conteudo,
    variaveis: parseVariables(form.variaveis),
    provider_template_name: form.provider_template_name || null,
    language: form.language || "pt_BR",
    categoria_provider: form.categoria_provider || null,
    ultima_sincronizacao_provider: form.ultima_sincronizacao_provider || null,
    observacoes: form.observacoes || null,
    aprovado_provider: form.aprovado_provider,
    ativo: form.ativo
  };

  if (!editing) {
    payload.tenant_id = form.tenant_id || null;
    payload.nome = form.nome;
    payload.canal = form.canal;
    payload.tipo = form.tipo;
    payload.assunto = form.assunto || null;
  }

  return payload;
}

function StatusBadge({ template }: { template: CommunicationTemplate }) {
  if (!template.ativo) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
        <XCircle className="h-3.5 w-3.5" />
        Inativo
      </span>
    );
  }

  if (template.aprovado_provider && template.provider_template_name && template.language) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Aprovado provider
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-secondary px-3 py-1 text-xs font-bold text-primary">
      <Eye className="h-3.5 w-3.5" />
      Pendente aprovacao
    </span>
  );
}

function MessageStatusBadge({ status }: { status: string }) {
  const isSuccess = status === "enviado";
  const isError = status === "erro";

  return (
    <span className={cn(
      "inline-flex rounded-full border px-3 py-1 text-xs font-bold",
      isSuccess ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "",
      isError ? "border-primary/20 bg-secondary text-primary" : "",
      !isSuccess && !isError ? "border-border bg-muted text-muted-foreground" : ""
    )}>
      {status}
    </span>
  );
}

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-background/70 p-6 text-sm text-muted-foreground">
      <p className="text-base font-bold text-foreground">{title}</p>
      <p className="mt-2">{description}</p>
    </div>
  );
}

function MessagesPanel({ title, description, messages }: {
  title: string;
  description: string;
  messages: WhatsAppMessageLog[];
}) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-soft">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {messages.length ? (
        <div className="grid gap-3">
          {messages.map((message) => (
            <article key={message.id} className="rounded-xl border border-border bg-background/75 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="break-words text-base font-bold text-foreground">
                    {message.template_nome || message.tipo_evento || "Mensagem WhatsApp"}
                  </p>
                  <p className="mt-1 break-words text-sm text-muted-foreground">
                    {message.telefone_destino || "Destino nao informado"} · {message.provider || "provider nao informado"}
                  </p>
                </div>
                <MessageStatusBadge status={message.status_envio} />
              </div>

              <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
                <span className="min-w-0 rounded-lg border border-border px-3 py-2 break-words">
                  <strong>Evento:</strong> {message.tipo_evento || "-"}
                </span>
                <span className="min-w-0 rounded-lg border border-border px-3 py-2 break-words">
                  <strong>Tenant:</strong> {message.tenant_id || "-"}
                </span>
                <span className="min-w-0 rounded-lg border border-border px-3 py-2 break-words">
                  <strong>Provider ID:</strong> {message.provider_message_id || "-"}
                </span>
                <span className="min-w-0 rounded-lg border border-border px-3 py-2 break-words">
                  <strong>Criado:</strong> {new Date(message.created_at).toLocaleString("pt-BR")}
                </span>
                <span className="min-w-0 rounded-lg border border-border px-3 py-2 break-words">
                  <strong>Tentativas:</strong> {message.tentativas ?? 0}
                </span>
                <span className="min-w-0 rounded-lg border border-border px-3 py-2 break-words">
                  <strong>Agendado:</strong> {message.agendado_para ? new Date(message.agendado_para).toLocaleString("pt-BR") : "-"}
                </span>
                <span className="min-w-0 rounded-lg border border-border px-3 py-2 break-words">
                  <strong>Proxima:</strong> {message.proxima_tentativa_em ? new Date(message.proxima_tentativa_em).toLocaleString("pt-BR") : "-"}
                </span>
                <span className="min-w-0 rounded-lg border border-border px-3 py-2 break-words">
                  <strong>Idempotencia:</strong> {message.idempotency_key || "-"}
                </span>
              </div>

              {message.erro_envio || message.ultimo_erro_mensagem ? (
                <p className="mt-3 rounded-lg border border-primary/20 bg-secondary p-3 text-sm font-semibold text-primary">
                  {message.ultimo_erro_codigo ? `${message.ultimo_erro_codigo}: ` : ""}{message.erro_envio || message.ultimo_erro_mensagem}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <EmptyPanel title="Nenhum registro encontrado" description="A tela abre normalmente; os registros aparecem quando mensagens forem geradas pela fila operacional." />
      )}
    </div>
  );
}

function ProvidersPanel({ provider }: { provider: CommunicationProviderStatus | null }) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-soft">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-foreground">Configuracao dos Providers</h2>
        <p className="text-sm text-muted-foreground">
          Leitura segura da configuracao do provider. Tokens e secrets nao sao exibidos.
        </p>
      </div>

      {provider ? (
        <div className="grid gap-4">
          <div className="grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-3">
            <span className="rounded-lg border border-border px-3 py-2 break-words">
              <strong>Provider:</strong> {provider.provider}
            </span>
            <span className="rounded-lg border border-border px-3 py-2 break-words">
              <strong>Modo:</strong> {provider.mode}
            </span>
            <span className="rounded-lg border border-border px-3 py-2 break-words">
              <strong>API:</strong> {provider.api_version}
            </span>
            <span className="rounded-lg border border-border px-3 py-2 break-words">
              <strong>Cloud API:</strong> {provider.cloud_api_enabled ? "habilitada" : "desabilitada"}
            </span>
            <span className="rounded-lg border border-border px-3 py-2 break-words">
              <strong>Access token:</strong> {provider.credentials.access_token_configured ? "configurado" : "pendente"}
            </span>
            <span className="rounded-lg border border-border px-3 py-2 break-words">
              <strong>Phone number ID:</strong> {provider.credentials.phone_number_id_configured ? (provider.credentials.phone_number_id_masked || "configurado") : "pendente"}
            </span>
          </div>

          <div className="rounded-xl border border-border bg-background/70 p-4">
            <p className="font-bold text-foreground">Variaveis de ambiente</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {provider.required_env.map((item) => (
                <code key={item} className="rounded-full border border-border px-3 py-1 text-xs">
                  {item}
                </code>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background/70 p-4 text-sm text-muted-foreground">
            {provider.notes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        </div>
      ) : (
        <EmptyPanel title="Configuracao indisponivel" description="Nao foi possivel carregar a leitura segura do provider." />
      )}
    </div>
  );
}

export function CommunicationTemplatesManager() {
  const router = useRouter();
  const { session, isLoading } = useAuth();
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [messages, setMessages] = useState<WhatsAppMessageLog[]>([]);
  const [queueMessages, setQueueMessages] = useState<WhatsAppMessageLog[]>([]);
  const [providerStatus, setProviderStatus] = useState<CommunicationProviderStatus | null>(null);
  const [activeTab, setActiveTab] = useState<CommunicationTab>("templates");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<TemplateForm>(EMPTY_FORM);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selected = useMemo(
    () => templates.find((template) => template.id === selectedId) || null,
    [templates, selectedId]
  );
  const contentVariables = useMemo(() => extractVariables(form.conteudo), [form.conteudo]);
  const declaredVariables = useMemo(() => parseVariables(form.variaveis), [form.variaveis]);
  const whatsappIssues = useMemo(
    () => getWhatsAppValidationIssues(form.conteudo, declaredVariables),
    [form.conteudo, declaredVariables]
  );
  const providerConfigIssues = form.canal === "whatsapp"
    ? [
        !form.provider_template_name ? "Provider template name obrigatorio" : "",
        !form.language ? "Language obrigatorio" : "",
        !form.categoria_provider ? "Categoria provider obrigatoria" : ""
      ].filter(Boolean)
    : [];
  const missingVariables = form.canal === "whatsapp"
    ? []
    : contentVariables.filter((variable) => !declaredVariables.includes(variable));
  const unusedVariables = form.canal === "whatsapp"
    ? []
    : declaredVariables.filter((variable) => !contentVariables.includes(variable));
  const whatsappValidationMessages = [
    whatsappIssues.namedPlaceholders.length ? `Placeholders nomeados nao sao validos para WhatsApp: ${whatsappIssues.namedPlaceholders.join(", ")}` : "",
    whatsappIssues.duplicatePositions.length ? `Posicoes duplicadas: ${whatsappIssues.duplicatePositions.map((position) => `{{${position}}}`).join(", ")}` : "",
    whatsappIssues.missingPositions.length ? `Faltam posicoes: ${whatsappIssues.missingPositions.map((position) => `{{${position}}}`).join(", ")}` : "",
    whatsappIssues.positionsWithoutVariables.length ? `Posicoes sem variavel correspondente: ${whatsappIssues.positionsWithoutVariables.map((position) => `{{${position}}}`).join(", ")}` : "",
    whatsappIssues.countMismatch ? "A quantidade de posicoes deve corresponder a quantidade de variaveis declaradas." : "",
    ...providerConfigIssues
  ].filter(Boolean);
  const hasVariableErrors = Boolean(
    missingVariables.length
    || unusedVariables.length
    || whatsappValidationMessages.length
  );
  const isEditing = Boolean(selected);
  const approvedTemplates = useMemo(
    () => templates.filter((template) => (
      template.canal === "whatsapp"
      && template.ativo
      && template.aprovado_provider
      && Boolean(template.provider_template_name)
      && Boolean(template.language)
    )),
    [templates]
  );

  async function load() {
    if (!session) return;

    setIsRefreshing(true);
    setError("");

    try {
      const [nextTemplates, nextMessages, nextQueue, nextProvider] = await Promise.all([
        platformService.listCommunicationTemplates(session),
        platformService.listWhatsAppMessages(session),
        platformService.listWhatsAppQueue(session),
        platformService.getCommunicationProviders(session)
      ]);

      setTemplates(nextTemplates);
      setMessages(nextMessages);
      setQueueMessages(nextQueue);
      setProviderStatus(nextProvider);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar templates.");
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

  function selectTemplate(template: CommunicationTemplate) {
    setSelectedId(template.id);
    setForm(toForm(template));
    setSuccess("");
    setError("");
  }

  function startNewTemplate() {
    setActiveTab("templates");
    setSelectedId(null);
    setForm(EMPTY_FORM);
    setSuccess("");
    setError("");
  }

  function updateField<K extends keyof TemplateForm>(field: K, value: TemplateForm[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;

    if (hasVariableErrors) {
      setError("Revise as variaveis antes de salvar o template.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      if (selected) {
        await platformService.updateCommunicationTemplate(session, selected.id, toPayload(form, true));
        setSuccess("Template atualizado.");
      } else {
        await platformService.createCommunicationTemplate(session, toPayload(form, false));
        setSuccess("Template criado.");
        startNewTemplate();
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar o template.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deactivate(template: CommunicationTemplate) {
    if (!session) return;

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      await platformService.updateCommunicationTemplate(session, template.id, { ativo: false });
      setSuccess("Template desativado.");
      await load();
      if (selectedId === template.id) {
        setForm((current) => ({ ...current, ativo: false }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel desativar o template.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="flex flex-col gap-4 rounded-2xl border border-white/80 bg-white/85 p-5 shadow-soft lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
              {APP_BRAND.appName} Plataforma
            </p>
            <h1 className="mt-1 text-2xl font-bold text-foreground">Templates de Comunicacao</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Manutencao MasterAdmin de templates globais ou por tenant usados pela fila operacional.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild type="button" variant="outline">
              <Link href="/admin">
                <ArrowLeft className="h-4 w-4" />
                Admin SaaS
              </Link>
            </Button>
            <Button type="button" variant="outline" onClick={load} disabled={isRefreshing || !session}>
              <RefreshCcw className={isRefreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Atualizar
            </Button>
          </div>
        </header>

        <section className="rounded-2xl border border-primary/15 bg-secondary/70 p-4 text-sm text-foreground">
          <strong>Regra de envio real:</strong> com <code>WHATSAPP_DRY_RUN=false</code>, o envio usa somente templates ativos,
          aprovados no provider, com <code>provider_template_name</code> e <code>language</code> preenchidos.
        </section>

        {error ? (
          <div className="rounded-2xl border border-primary/25 bg-white/90 p-4 text-sm font-semibold text-primary">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            {success}
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-soft">
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Comunicacao</h2>
            </div>
            <div className="mt-4 grid gap-2">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "rounded-full px-4 py-2 text-left text-sm font-bold transition",
                    activeTab === item.id
                      ? "bg-secondary text-primary"
                      : "border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </aside>

          {activeTab === "messages" ? (
            <MessagesPanel
              title="Mensagens WhatsApp"
              description="Ultimos registros da tabela mensagens_whatsapp. Dry-run tambem aparece aqui."
              messages={messages}
            />
          ) : null}

          {activeTab === "queue" ? (
            <MessagesPanel
              title="Fila de Envio"
              description="Registros pendentes, em processamento ou com erro na fila baseada em mensagens_whatsapp."
              messages={queueMessages}
            />
          ) : null}

          {activeTab === "providers" ? (
            <ProvidersPanel provider={providerStatus} />
          ) : null}

          {activeTab === "approved" ? (
            <div className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-soft">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-foreground">Templates Aprovados</h2>
                <p className="text-sm text-muted-foreground">
                  WhatsApp ativos, aprovados no provider, com provider_template_name e language preenchidos.
                </p>
              </div>

              {approvedTemplates.length ? (
                <div className="grid gap-3">
                  {approvedTemplates.map((template) => (
                    <article key={template.id} className="rounded-xl border border-border bg-background/75 p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <p className="break-words text-base font-bold text-foreground">{template.nome}</p>
                          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            {template.canal} / {template.tipo}
                          </p>
                        </div>
                        <StatusBadge template={template} />
                      </div>
                      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
                        <span className="min-w-0 rounded-lg border border-border px-3 py-2 break-words">
                          <strong>Provider:</strong> {template.provider_template_name || "-"}
                        </span>
                        <span className="min-w-0 rounded-lg border border-border px-3 py-2 break-words">
                          <strong>Idioma:</strong> {template.language || "-"}
                        </span>
                        <span className="min-w-0 rounded-lg border border-border px-3 py-2 break-words">
                          <strong>Categoria:</strong> {template.categoria_provider || "-"}
                        </span>
                        <span className="min-w-0 rounded-lg border border-border px-3 py-2 break-words">
                          <strong>Tenant:</strong> {template.tenant_id || "global"}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyPanel title="Nenhum template aprovado" description="A navegacao esta disponivel; quando houver templates aprovados na Meta, eles aparecerao aqui." />
              )}
            </div>
          ) : null}

          {activeTab === "templates" ? (
          <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_440px]">
            <div className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-soft">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Templates cadastrados</h2>
                  <p className="text-sm text-muted-foreground">{templates.length} registro(s)</p>
                </div>
                <Button type="button" onClick={startNewTemplate}>
                  <FileText className="h-4 w-4" />
                  Novo template
                </Button>
              </div>

              <div className="grid gap-3">
                {templates.map((template) => (
                  <article
                    key={template.id}
                    className={cn(
                      "rounded-xl border bg-background/75 p-4 transition hover:border-primary/60",
                      selectedId === template.id ? "border-primary/60 shadow-soft" : "border-border"
                    )}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="break-words text-base font-bold text-foreground">{template.nome}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          {template.canal} / {template.tipo}
                        </p>
                        <p className="mt-2 break-words text-sm text-muted-foreground">
                          Tenant: {template.tenant_id || "global"}
                        </p>
                      </div>
                      <StatusBadge template={template} />
                    </div>

                    <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-5">
                      <span className="min-w-0 rounded-lg border border-border px-3 py-2 break-words">
                        <strong>Provider:</strong> {template.provider_template_name || "-"}
                      </span>
                      <span className="min-w-0 rounded-lg border border-border px-3 py-2 break-words">
                        <strong>Idioma:</strong> {template.language || "-"}
                      </span>
                      <span className="min-w-0 rounded-lg border border-border px-3 py-2 break-words">
                        <strong>Categoria:</strong> {template.categoria_provider || "-"}
                      </span>
                      <span className="min-w-0 rounded-lg border border-border px-3 py-2 break-words">
                        <strong>Formato:</strong> {template.provider_parameter_format || "nomeado"}
                      </span>
                      <span className="min-w-0 rounded-lg border border-border px-3 py-2 break-words">
                        <strong>Atualizado:</strong> {new Date(template.updated_at).toLocaleString("pt-BR")}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={() => selectTemplate(template)}>
                        <Eye className="h-4 w-4" />
                        Ver / editar
                      </Button>
                      {template.ativo ? (
                        <Button type="button" variant="ghost" onClick={() => deactivate(template)} disabled={isSaving}>
                          Desativar
                        </Button>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <form onSubmit={save} className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-soft">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-foreground">{isEditing ? "Editar template" : "Novo template"}</h2>
                <p className="text-sm text-muted-foreground">
                  {form.canal === "whatsapp" ? (
                    <>WhatsApp usa placeholders posicionais <code>{"{{1}}"}</code>, <code>{"{{2}}"}</code> e variaveis ordenadas.</>
                  ) : (
                    <>Variaveis usam o formato <code>{"{{nome_variavel}}"}</code>.</>
                  )}
                </p>
              </div>

              <div className="grid gap-3">
                <label className="grid gap-1 text-sm font-semibold text-foreground">
                  Tenant ID
                  <input
                    className="h-11 rounded-xl border border-border bg-background px-3 text-sm disabled:opacity-60"
                    value={form.tenant_id}
                    onChange={(event) => updateField("tenant_id", event.target.value)}
                    disabled={isEditing}
                    placeholder="vazio para global"
                  />
                </label>

                <label className="grid gap-1 text-sm font-semibold text-foreground">
                  Nome
                  <input
                    className="h-11 rounded-xl border border-border bg-background px-3 text-sm disabled:opacity-60"
                    value={form.nome}
                    onChange={(event) => updateField("nome", event.target.value)}
                    disabled={isEditing}
                    required
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm font-semibold text-foreground">
                    Canal
                    <select
                      className="h-11 rounded-xl border border-border bg-background px-3 text-sm disabled:opacity-60"
                      value={form.canal}
                      onChange={(event) => updateField("canal", event.target.value as TemplateForm["canal"])}
                      disabled={isEditing}
                    >
                      <option value="whatsapp">WhatsApp</option>
                      <option value="email">E-mail</option>
                      <option value="sms">SMS</option>
                      <option value="push">Push</option>
                    </select>
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-foreground">
                    Tipo
                    <input
                      className="h-11 rounded-xl border border-border bg-background px-3 text-sm disabled:opacity-60"
                      value={form.tipo}
                      onChange={(event) => updateField("tipo", event.target.value)}
                      disabled={isEditing}
                      required
                    />
                  </label>
                </div>

                <label className="grid gap-1 text-sm font-semibold text-foreground">
                  Conteudo
                  <textarea
                    className="min-h-32 rounded-xl border border-border bg-background p-3 text-sm"
                    value={form.conteudo}
                    onChange={(event) => updateField("conteudo", event.target.value)}
                    required
                  />
                </label>

                <label className="grid gap-1 text-sm font-semibold text-foreground">
                  Variaveis declaradas
                  <textarea
                    className="min-h-24 rounded-xl border border-border bg-background p-3 text-sm"
                    value={form.variaveis}
                    onChange={(event) => updateField("variaveis", event.target.value)}
                    placeholder="nome_cliente&#10;data_agendamento"
                  />
                </label>

                {form.canal === "whatsapp" && declaredVariables.length ? (
                  <div className="rounded-xl border border-border bg-background/70 p-3 text-sm">
                    <p className="font-bold text-foreground">Mapa Meta</p>
                    <div className="mt-2 grid gap-1 text-muted-foreground">
                      {declaredVariables.map((variable, index) => (
                        <span key={`${variable}-${index}`}>
                          <code>{`{{${index + 1}}}`}</code> &rarr; {variable}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {(missingVariables.length || unusedVariables.length || whatsappValidationMessages.length) ? (
                  <div className="rounded-xl border border-primary/25 bg-secondary p-3 text-sm font-semibold text-primary">
                    {missingVariables.length ? <p>Faltam em variaveis: {missingVariables.join(", ")}</p> : null}
                    {unusedVariables.length ? <p>Declaradas sem uso: {unusedVariables.join(", ")}</p> : null}
                    {whatsappValidationMessages.map((message) => (
                      <p key={message}>{message}</p>
                    ))}
                  </div>
                ) : null}

                <div className="rounded-xl border border-border bg-background/70 p-3">
                  <p className="text-sm font-bold text-foreground">Previa formatada</p>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                    {form.conteudo || "Conteudo ainda nao informado."}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm font-semibold text-foreground">
                    Provider template name
                    <input
                      className="h-11 rounded-xl border border-border bg-background px-3 text-sm"
                      value={form.provider_template_name}
                      onChange={(event) => updateField("provider_template_name", event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold text-foreground">
                    Language
                    <input
                      className="h-11 rounded-xl border border-border bg-background px-3 text-sm"
                      value={form.language}
                      onChange={(event) => updateField("language", event.target.value)}
                    />
                  </label>
                </div>

                <label className="grid gap-1 text-sm font-semibold text-foreground">
                  Categoria provider
                  <input
                    className="h-11 rounded-xl border border-border bg-background px-3 text-sm"
                    value={form.categoria_provider}
                    onChange={(event) => updateField("categoria_provider", event.target.value)}
                  />
                </label>

                <label className="grid gap-1 text-sm font-semibold text-foreground">
                  Ultima sincronizacao provider
                  <input
                    className="h-11 rounded-xl border border-border bg-background px-3 text-sm"
                    value={form.ultima_sincronizacao_provider}
                    onChange={(event) => updateField("ultima_sincronizacao_provider", event.target.value)}
                    placeholder="2026-07-06T15:00:00-03:00"
                  />
                </label>

                <label className="grid gap-1 text-sm font-semibold text-foreground">
                  Observacoes
                  <textarea
                    className="min-h-20 rounded-xl border border-border bg-background p-3 text-sm"
                    value={form.observacoes}
                    onChange={(event) => updateField("observacoes", event.target.value)}
                  />
                </label>

                <div className="grid gap-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <input
                      type="checkbox"
                      checked={form.aprovado_provider}
                      onChange={(event) => updateField("aprovado_provider", event.target.checked)}
                    />
                    Aprovado no provider WhatsApp
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <input
                      type="checkbox"
                      checked={form.ativo}
                      onChange={(event) => updateField("ativo", event.target.checked)}
                    />
                    Ativo
                  </label>
                </div>

                <Button type="submit" disabled={isSaving || hasVariableErrors}>
                  <Save className="h-4 w-4" />
                  {isSaving ? "Salvando..." : "Salvar template"}
                </Button>
              </div>
            </form>
          </section>
          ) : null}
        </div>
      </div>
    </main>
  );
}
