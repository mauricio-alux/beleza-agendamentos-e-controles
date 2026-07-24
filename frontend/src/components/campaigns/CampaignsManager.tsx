"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, ChevronLeft, ChevronRight, Gift, Info, Megaphone, Play, RefreshCcw, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import {
  campaignsService,
  type Campaign,
  type CampaignEstimate,
  type CampaignListFilters,
  type CampaignMessage,
  type CampaignMeta,
  type CampaignPreview,
  type CampaignSuggestion
} from "@/services/campaigns.service";
import { cn } from "@/lib/utils";

type CampaignForm = {
  nome: string;
  descricao: string;
  tipo: string;
  template_id: string;
  cupom_id: string;
  servico_id: string;
  publico: "all" | "inactive" | "birthday" | "recurring" | "no_future" | "manual";
  data_inicio: string;
  data_fim: string;
  valor_promocional: string;
  validade_promocao: string;
  agendada_para: string;
};

type ApprovalForm = {
  oferta: string;
  desconto: string;
  valor_promocional: string;
  brinde: string;
  texto_complementar: string;
  data_inicial: string;
  data_final: string;
  agendada_para: string;
  salvar_como_padrao: boolean;
  execution_mode: "tenant_assisted" | "saas_managed" | "choose_each_campaign";
  manual_distribution_preference: "broadcast_list" | "manual_contacts" | "other_whatsapp_method" | "choose_each_campaign";
};

const EMPTY_FORM: CampaignForm = {
  nome: "",
  descricao: "",
  tipo: "campanha_geral",
  template_id: "",
  cupom_id: "",
  servico_id: "",
  publico: "all",
  data_inicio: "",
  data_fim: "",
  valor_promocional: "",
  validade_promocao: "",
  agendada_para: ""
};

const CAMPAIGN_TYPES = [
  ["campanha_geral", "Campanha geral"],
  ["promocao_servico", "Promocao de servico"],
  ["recuperacao_inativos", "Recuperacao de inativos"],
  ["aniversario", "Aniversario"],
  ["novo_servico", "Novo servico"],
  ["horarios_disponiveis", "Horarios disponiveis"],
  ["relacionamento", "Relacionamento"]
];

const TYPE_DEFAULT_AUDIENCE: Record<string, CampaignForm["publico"]> = {
  campanha_geral: "all",
  promocao_servico: "all",
  recuperacao_inativos: "inactive",
  aniversario: "birthday",
  novo_servico: "all",
  horarios_disponiveis: "no_future",
  relacionamento: "recurring"
};

const RELATIONSHIP_HELP = "Campanha destinada a manter contato e fortalecer o relacionamento com clientes, sem exigir necessariamente desconto ou promocao. Exemplos: agradecimento, novidades, cuidados pos-atendimento e convite para retorno.";

const SERVICE_TYPES = new Set(["promocao_servico", "novo_servico", "horarios_disponiveis"]);
const OPTIONAL_SERVICE_TYPES = new Set(["recuperacao_inativos"]);
const OFFER_TYPES = new Set(["promocao_servico", "novo_servico", "aniversario", "recuperacao_inativos"]);
const PAGE_SIZE_OPTIONS = [20, 30, 50];
const CAMPAIGN_STATUS_FILTER_OPTIONS = [
  ["all", "Todos"],
  ["rascunho", "Rascunho"],
  ["pronta", "Pronta"],
  ["agendada", "Agendada"],
  ["gerando_mensagens", "Gerando mensagens"],
  ["em_processamento", "Em processamento"],
  ["concluida", "Concluida"],
  ["cancelada", "Cancelada"],
  ["falhou", "Falhou"]
];

const EMPTY_FILTERS: Required<Pick<CampaignListFilters, "search" | "status" | "tipo" | "ativo" | "created_from" | "created_to" | "send_from" | "send_to">> & { page: number; page_size: number } = {
  search: "",
  status: "all",
  tipo: "all",
  ativo: "all",
  created_from: "",
  created_to: "",
  send_from: "",
  send_to: "",
  page: 1,
  page_size: 20
};

const EMPTY_APPROVAL_FORM: ApprovalForm = {
  oferta: "",
  desconto: "",
  valor_promocional: "",
  brinde: "",
  texto_complementar: "",
  data_inicial: "",
  data_final: "",
  agendada_para: "",
  salvar_como_padrao: false,
  execution_mode: "tenant_assisted",
  manual_distribution_preference: "choose_each_campaign"
};

function criteriaFromAudience(publico: CampaignForm["publico"]) {
  if (publico === "inactive") return { mode: "segment", inactive_days: 60, no_future_appointment: true };
  if (publico === "birthday") return { mode: "segment", birthday_month: true };
  if (publico === "recurring") return { mode: "segment", recurring: true, min_completed: 2 };
  if (publico === "no_future") return { mode: "segment", no_future_appointment: true };
  return { mode: "all" };
}

function formatCurrency(value: string) {
  const parsed = Number(String(value || "").replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) return "";
  return parsed.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function paramsFromForm(form: CampaignForm, serviceName = "") {
  return {
    nome_servico: { source: "fixed", value: serviceName },
    valor_promocional: { source: "fixed", value: formatCurrency(form.valor_promocional) },
    validade_promocao: { source: "fixed", value: form.validade_promocao }
  };
}

function paramsFromApprovalForm(form: ApprovalForm) {
  return {
    desconto: form.desconto ? { source: "fixed", value: Number(form.desconto) } : undefined,
    valor_promocional: form.valor_promocional ? { source: "fixed", value: Number(form.valor_promocional) } : undefined,
    brinde: form.brinde ? { source: "fixed", value: form.brinde } : undefined,
    oferta: form.oferta ? { source: "fixed", value: form.oferta } : undefined,
    texto_complementar: form.texto_complementar ? { source: "fixed", value: form.texto_complementar } : undefined
  };
}

function templateLabel(template: CampaignMeta["templates"][number]) {
  const purpose = template.metadata?.finalidade || template.metadata?.categoria || template.categoria_provider || "Template";
  return `${purpose} - ${template.nome}`;
}

function hasCouponBenefit(coupon: CampaignMeta["coupons"][number]) {
  if (coupon.tipo_desconto === "percentual") return Number(coupon.percentual_desconto || 0) > 0;
  return Number(coupon.valor_desconto || 0) > 0;
}

function statusClass(status: string) {
  if (["concluida", "CONCLUIDO", "EM_ANDAMENTO", "enviado", "entregue", "lido"].includes(status)) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (["cancelada", "ENCERRADA", "REJEITADA", "ERRO", "erro", "falhou", "cancelado"].includes(status)) return "border-primary/20 bg-secondary text-primary";
  return "border-border bg-white text-muted-foreground";
}

function commercialStatusLabel(status = "") {
  const labels: Record<string, string> = {
    SUGERIDA: "Sugerida",
    APROVADA: "Aprovada",
    PARAMETRIZADA: "Parametrizada",
    AGENDADA: "Agendada",
    EM_ANDAMENTO: "Em andamento",
    ENCERRADA: "Encerrada",
    REJEITADA: "Rejeitada"
  };
  return labels[status] || status || "Parametrizada";
}

function processingStatusLabel(status = "") {
  const labels: Record<string, string> = {
    PENDENTE: "Pendente",
    EM_PROCESSAMENTO: "Em processamento",
    CONCLUIDO: "Concluido",
    ERRO: "Erro"
  };
  return labels[status] || status || "Pendente";
}

function campaignTypeLabel(type = "") {
  return CAMPAIGN_TYPES.find(([value]) => value === type)?.[1] || type || "Campanha";
}

function audienceLabel(criteria: Record<string, unknown> = {}) {
  if (criteria.inactive_days) return `Clientes inativos ha pelo menos ${criteria.inactive_days} dias`;
  if (criteria.birthday_month === true) return "Aniversariantes do mes";
  if (criteria.recurring === true) return "Clientes recorrentes";
  if (criteria.no_future_appointment === true) return "Clientes sem agendamento futuro";
  return "Todos os clientes elegiveis";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function CampaignsManager() {
  const { session } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [meta, setMeta] = useState<CampaignMeta | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<CampaignEstimate | null>(null);
  const [preview, setPreview] = useState<CampaignPreview | null>(null);
  const [messages, setMessages] = useState<CampaignMessage[]>([]);
  const [suggestions, setSuggestions] = useState<CampaignSuggestion[]>([]);
  const [form, setForm] = useState<CampaignForm>(EMPTY_FORM);
  const [approvalForm, setApprovalForm] = useState<ApprovalForm>(EMPTY_APPROVAL_FORM);
  const [couponForm, setCouponForm] = useState({ codigo: "", tipo_desconto: "percentual", percentual_desconto: "10", valor_desconto: "", data_fim: "", servico_id: "", limite_uso: "" });
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [pagination, setPagination] = useState({ page: 1, page_size: 20, total: 0, total_pages: 1, has_next: false, has_previous: false });
  const [diagnostic, setDiagnostic] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const feedbackRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedMessageRef = useRef("");

  const selected = useMemo(() => campaigns.find((campaign) => campaign.id === selectedId) || campaigns[0] || null, [campaigns, selectedId]);
  const selectedTemplate = useMemo(() => meta?.templates.find((template) => template.id === form.template_id), [form.template_id, meta?.templates]);
  const selectedService = useMemo(() => meta?.services.find((service) => service.id === form.servico_id) || null, [form.servico_id, meta?.services]);
  const canApproveSelected = Boolean(
    selected
    && (selected.metadata?.requires_tenant_approval === true || selected.metadata?.origin === "ai_suggestion")
    && !["approved", "prepared_for_manual_delivery", "rejected"].includes(String(selected.metadata?.lifecycle_stage || ""))
    && !["APROVADA", "PARAMETRIZADA", "AGENDADA", "EM_ANDAMENTO", "ENCERRADA", "REJEITADA"].includes(selected.status_campanha || "")
    && !["EM_PROCESSAMENTO", "CONCLUIDO"].includes(selected.status_processamento || "")
  );
  const filteredCoupons = useMemo(() => {
    const now = new Date();
    return (meta?.coupons || []).filter((coupon) => {
      if (!coupon.ativo || !hasCouponBenefit(coupon)) return false;
      if (coupon.data_fim && new Date(`${coupon.data_fim}T23:59:59`) < now) return false;
      if (coupon.limite_uso && Number(coupon.total_usos || 0) >= Number(coupon.limite_uso)) return false;
      const serviceLinks = coupon.servicos?.map((item) => item.servico_id).filter(Boolean) || [];
      if (form.servico_id && serviceLinks.length && !serviceLinks.includes(form.servico_id)) return false;
      return true;
    });
  }, [form.servico_id, meta?.coupons]);
  const showService = SERVICE_TYPES.has(form.tipo) || OPTIONAL_SERVICE_TYPES.has(form.tipo);
  const serviceRequired = SERVICE_TYPES.has(form.tipo);
  const showOffer = OFFER_TYPES.has(form.tipo);
  const promotionRequiresBenefit = form.tipo === "promocao_servico";
  const hasPromotionalValue = Number(String(form.valor_promocional || "").replace(",", ".")) > 0;
  const dateIsFuture = !form.agendada_para || new Date(form.agendada_para) > new Date();
  const formCanSubmit = Boolean(
    form.nome.trim()
    && form.tipo
    && form.publico
    && form.template_id
    && (!serviceRequired || form.servico_id)
    && (!promotionRequiresBenefit || form.data_inicio)
    && (!promotionRequiresBenefit || form.cupom_id || hasPromotionalValue)
    && (!promotionRequiresBenefit || form.cupom_id || form.validade_promocao)
    && dateIsFuture
  );

  useEffect(() => {
    const message = error || success;
    const tone = error ? "error" : success ? "success" : "";
    const signature = `${tone}:${message}`;
    if (!message || signature === lastFocusedMessageRef.current) return;

    lastFocusedMessageRef.current = signature;
    window.setTimeout(() => {
      feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      feedbackRef.current?.focus({ preventScroll: true });
    }, 50);
  }, [error, success]);

  function updateFilters(patch: Partial<typeof filters>) {
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  }

  async function load(nextFilters = filters) {
    if (!session) return;
    setIsLoading(true);
    setError("");
    try {
      const [campaignResult, metaResult] = await Promise.allSettled([
        campaignsService.list(session, nextFilters),
        campaignsService.meta(session)
      ]);
      const suggestionResult = await campaignsService.suggestions(session).catch(() => []);

      if (campaignResult.status === "fulfilled") {
        setCampaigns(campaignResult.value.items);
        setPagination(campaignResult.value.pagination);
        setDiagnostic(campaignResult.value.diagnostics?.limitation_reason || "");
        if (!campaignResult.value.items.some((campaign) => campaign.id === selectedId)) {
          setSelectedId(campaignResult.value.items[0]?.id || null);
        }
      } else {
        setCampaigns([]);
        setPagination({ page: nextFilters.page, page_size: nextFilters.page_size, total: 0, total_pages: 1, has_next: false, has_previous: false });
        setError(campaignResult.reason instanceof Error ? campaignResult.reason.message : "Nao foi possivel carregar campanhas.");
      }

      if (metaResult.status === "fulfilled") {
        setMeta(metaResult.value);
      } else {
        setMeta({ templates: [], coupons: [], services: [] });
        setError((current) => current || (metaResult.reason instanceof Error ? metaResult.reason.message : "Nao foi possivel carregar dados auxiliares de campanhas."));
      }
      setSuggestions(suggestionResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar campanhas.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [session, filters]);

  useEffect(() => {
    let isCurrentRequest = true;
    async function loadDetails() {
      if (!session || !selected?.id) return;
      setEstimate(null);
      setPreview(null);
      setMessages([]);
      try {
        const [estimateData, previewData, messageData] = await Promise.all([
          campaignsService.estimate(session, selected.id).catch(() => null),
          campaignsService.preview(session, selected.id, {
            parametros_template: paramsFromApprovalForm(approvalForm),
            data_inicio: approvalForm.data_inicial || undefined,
            data_fim: approvalForm.data_final || undefined,
            metadata: {
              strategy: {
                approval: {
                  desconto: approvalForm.desconto ? Number(approvalForm.desconto) : null,
                  valor_promocional: approvalForm.valor_promocional ? Number(approvalForm.valor_promocional) : null,
                  brinde: approvalForm.brinde || null,
                  data_inicial: approvalForm.data_inicial || null,
                  data_final: approvalForm.data_final || null
                }
              }
            }
          }).catch(() => null),
          campaignsService.messages(session, selected.id)
        ]);
        if (!isCurrentRequest) return;
        setEstimate(estimateData);
        setPreview(previewData);
        setMessages(messageData);
      } catch {
        if (!isCurrentRequest) return;
        setMessages([]);
      }
    }
    loadDetails();
    return () => {
      isCurrentRequest = false;
    };
  }, [
    selected?.id,
    selected?.updated_at,
    selected?.status_campanha,
    selected?.status_processamento,
    session,
    approvalForm.desconto,
    approvalForm.valor_promocional,
    approvalForm.brinde,
    approvalForm.oferta,
    approvalForm.texto_complementar,
    approvalForm.data_inicial,
    approvalForm.data_final
  ]);

  useEffect(() => {
    setApprovalForm({
      ...EMPTY_APPROVAL_FORM,
      agendada_para: selected?.agendada_para ? selected.agendada_para.slice(0, 16) : "",
      execution_mode: (selected?.metadata?.execution_mode as ApprovalForm["execution_mode"]) || EMPTY_APPROVAL_FORM.execution_mode,
      manual_distribution_preference: (selected?.metadata?.manual_distribution_preference as ApprovalForm["manual_distribution_preference"]) || EMPTY_APPROVAL_FORM.manual_distribution_preference
    });
  }, [selected?.id]);

  async function createCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !formCanSubmit) return;
    setIsSaving(true);
    setError("");
    setSuccess("");
    try {
      const campaign = await campaignsService.create(session, {
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || null,
        tipo: form.tipo,
        template_id: form.template_id,
        cupom_id: form.cupom_id || null,
        servico_id: form.servico_id || null,
        criterios_segmentacao: criteriaFromAudience(form.publico),
        parametros_template: paramsFromForm(form, selectedService?.nome || ""),
        data_inicio: form.data_inicio || null,
        data_fim: form.data_fim || null,
        agendada_para: form.agendada_para ? new Date(form.agendada_para).toISOString() : null
      });
      setCampaigns((current) => [campaign, ...current.filter((item) => item.id !== campaign.id)]);
      setSelectedId(campaign.id);
      setSuccess("Campanha criada. Confira a estimativa antes de iniciar.");
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel criar campanha.");
    } finally {
      setIsSaving(false);
    }
  }

  async function createSuggestion(key: string) {
    if (!session) return;
    setError("");
    setSuccess("");
    try {
      const campaign = await campaignsService.createFromSuggestion(session, key);
      setCampaigns((current) => [campaign, ...current.filter((item) => item.id !== campaign.id)]);
      setSelectedId(campaign.id);
      setSuccess("Sugestao criada. Aprove, rejeite ou ajuste os parametros antes da execucao.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel criar sugestao.");
    }
  }

  async function approveSelected() {
    if (!session || !selected || !canApproveSelected) return;
    setError("");
    setSuccess("");
    try {
      const updated = await campaignsService.approve(session, selected.id, {
        oferta: approvalForm.oferta || null,
        desconto: approvalForm.desconto ? Number(approvalForm.desconto) : null,
        valor_promocional: approvalForm.valor_promocional ? Number(approvalForm.valor_promocional) : null,
        brinde: approvalForm.brinde || null,
        texto_complementar: approvalForm.texto_complementar || null,
        data_inicial: approvalForm.data_inicial || null,
        data_final: approvalForm.data_final || null,
        natureza_campanha: "promocional",
        estrategia_envio: "UNICO",
        agendada_para: approvalForm.agendada_para ? new Date(approvalForm.agendada_para).toISOString() : null,
        salvar_como_padrao: approvalForm.salvar_como_padrao,
        execution_mode: approvalForm.execution_mode,
        manual_distribution_preference: approvalForm.manual_distribution_preference
      });
      setCampaigns((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSuccess("Campanha aprovada e parametrizada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel aprovar campanha.");
    }
  }

  async function rejectSelected() {
    if (!session || !selected) return;
    setError("");
    setSuccess("");
    try {
      const updated = await campaignsService.reject(session, selected.id, "Rejeitada pelo tenant.");
      setCampaigns((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSuccess("Campanha rejeitada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel rejeitar campanha.");
    }
  }

  async function runAction(action: "start" | "schedule" | "cancel") {
    if (!session || !selected) return;
    setError("");
    setSuccess("");
    try {
      const updated = action === "start"
        ? await campaignsService.start(session, selected.id)
        : action === "schedule"
          ? await campaignsService.schedule(session, selected.id, form.agendada_para ? new Date(form.agendada_para).toISOString() : selected.agendada_para || "")
          : await campaignsService.cancel(session, selected.id);
      setCampaigns((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSuccess(action === "start"
        ? updated.metadata?.lifecycle_stage === "prepared_for_manual_delivery"
          ? "Campanha preparada para envio manual pelo WhatsApp."
          : "Mensagens geradas e enviadas para a fila."
        : action === "schedule" ? "Campanha agendada." : "Campanha cancelada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel executar a acao.");
    }
  }

  async function createCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !couponForm.codigo.trim()) return;
    const benefit = couponForm.tipo_desconto === "percentual" ? Number(couponForm.percentual_desconto || 0) : Number(couponForm.valor_desconto || 0);
    if (benefit <= 0 || !couponForm.data_fim) {
      setError("Informe beneficio e validade para criar o cupom.");
      return;
    }
    setError("");
    try {
      const coupon = await campaignsService.createCoupon(session, {
        codigo: couponForm.codigo,
        tipo_desconto: couponForm.tipo_desconto,
        percentual_desconto: couponForm.tipo_desconto === "percentual" ? Number(couponForm.percentual_desconto || 0) : null,
        valor_desconto: couponForm.tipo_desconto !== "percentual" ? Number(couponForm.valor_desconto || 0) : null,
        data_fim: couponForm.data_fim || null,
        limite_uso: couponForm.limite_uso ? Number(couponForm.limite_uso) : null,
        servico_ids: couponForm.servico_id ? [couponForm.servico_id] : []
      });
      setMeta((current) => current ? { ...current, coupons: [coupon, ...current.coupons] } : current);
      setCouponForm({ codigo: "", tipo_desconto: "percentual", percentual_desconto: "10", valor_desconto: "", data_fim: "", servico_id: "", limite_uso: "" });
      setSuccess("Cupom criado para uso em campanhas.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel criar cupom.");
    }
  }

  return (
    <section className="space-y-5">
      <div className="rounded-[1.75rem] border border-white/80 bg-white/82 p-5 shadow-soft backdrop-blur-xl sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Crescimento</p>
            <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">Campanhas via WhatsApp</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              O Bellory sugere oportunidades, voce aprova e parametriza, e a execucao segue a capacidade de WhatsApp configurada.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => load()} disabled={isLoading}>
            <RefreshCcw className={cn("h-4 w-4", isLoading ? "animate-spin" : "")} />
            Atualizar
          </Button>
        </div>
      </div>

      {error || success ? (
        <FeedbackMessage
          ref={feedbackRef}
          tone={error ? "error" : "success"}
          title={error ? "Ajuste necessario" : "Tudo certo"}
          message={error || success}
        />
      ) : null}

      <div className="rounded-2xl border border-white/80 bg-white/88 p-5 shadow-soft">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Sugestoes do Bellory</p>
            <h2 className="mt-1 text-lg font-bold text-foreground">Oportunidades para aprovar</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Escolha uma sugestao, ajuste a oferta nos detalhes e aprove antes de executar.
            </p>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-4">
          {suggestions.length ? suggestions.map((suggestion) => (
            <div key={suggestion.key} className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="text-sm font-bold text-foreground">{suggestion.title}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{suggestion.description}</p>
              <p className="mt-2 text-xs font-semibold text-accent">{suggestion.reason}</p>
              <Button
                type="button"
                variant="outline"
                className="mt-4 w-full"
                onClick={() => createSuggestion(suggestion.key)}
                disabled={!suggestion.recommended_template_id}
              >
                Sugerir campanha
              </Button>
            </div>
          )) : (
            <EmptyState title="Sem sugestoes agora" description="As sugestoes aparecem quando houver templates de campanha disponiveis." />
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/80 bg-white/88 p-4 shadow-soft">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_0.9fr_0.9fr_0.8fr]">
          <Field label="Nome da campanha">
            <Input value={filters.search} onChange={(event) => updateFilters({ search: event.target.value })} placeholder="Buscar por nome" />
          </Field>
          <Field label="Status">
            <select className="h-11 w-full rounded-full border border-border bg-white px-4 text-sm" value={filters.status} onChange={(event) => updateFilters({ status: event.target.value })}>
              {CAMPAIGN_STATUS_FILTER_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="Tipo">
            <select className="h-11 w-full rounded-full border border-border bg-white px-4 text-sm" value={filters.tipo} onChange={(event) => updateFilters({ tipo: event.target.value })}>
              <option value="all">Todos</option>
              {CAMPAIGN_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
          <Field label="Ativo">
            <select className="h-11 w-full rounded-full border border-border bg-white px-4 text-sm" value={filters.ativo} onChange={(event) => updateFilters({ ativo: event.target.value as typeof filters.ativo })}>
              <option value="all">Todas</option>
              <option value="true">Ativas</option>
              <option value="false">Inativas</option>
            </select>
          </Field>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Field label="Criada de">
            <Input type="date" value={filters.created_from} onChange={(event) => updateFilters({ created_from: event.target.value })} />
          </Field>
          <Field label="Criada ate">
            <Input type="date" value={filters.created_to} onChange={(event) => updateFilters({ created_to: event.target.value })} />
          </Field>
          <Field label="Envio de">
            <Input type="date" value={filters.send_from} onChange={(event) => updateFilters({ send_from: event.target.value })} />
          </Field>
          <Field label="Envio ate">
            <Input type="date" value={filters.send_to} onChange={(event) => updateFilters({ send_to: event.target.value })} />
          </Field>
          <Field label="Por pagina">
            <select className="h-11 w-full rounded-full border border-border bg-white px-4 text-sm" value={filters.page_size} onChange={(event) => updateFilters({ page_size: Number(event.target.value) })}>
              {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </Field>
        </div>
        <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between">
          <p>{pagination.total} campanha{pagination.total === 1 ? "" : "s"} encontrada{pagination.total === 1 ? "" : "s"}. {diagnostic}</p>
          <Button type="button" variant="ghost" onClick={() => setFilters(EMPTY_FILTERS)}>
            Limpar filtros
          </Button>
        </div>
      </div>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(380px,0.78fr)]">
        <div className="min-w-0 space-y-5">
          <div className="rounded-2xl border border-white/80 bg-white/88 p-5 shadow-soft">
            <div className="mb-4 flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Campanha manual</h2>
            </div>
            <form onSubmit={createCampaign} className="grid gap-3">
              <Field label="Nome da campanha" required>
                <Input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} placeholder="Ex.: Promocao de manicure do mes" />
              </Field>
              <Field label="Descricao curta">
                <textarea className="min-h-20 rounded-2xl border border-border bg-white/85 p-3 text-sm outline-none focus:border-primary" value={form.descricao} onChange={(event) => setForm({ ...form, descricao: event.target.value })} placeholder="Resumo interno da campanha" />
              </Field>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Tipo" required>
                  <select className="h-11 w-full rounded-full border border-border bg-white px-4 text-sm" value={form.tipo} onChange={(event) => {
                    const tipo = event.target.value;
                    setForm({ ...form, tipo, publico: TYPE_DEFAULT_AUDIENCE[tipo] || "all", cupom_id: "", servico_id: SERVICE_TYPES.has(tipo) ? form.servico_id : "" });
                  }}>
                    {CAMPAIGN_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </Field>
                <Field label="Publico" help="Define quais clientes poderao receber a campanha. Clientes sem telefone valido, sem consentimento ou com bloqueio serao excluidos." required>
                  <select className="h-11 w-full rounded-full border border-border bg-white px-4 text-sm" value={form.publico} onChange={(event) => setForm({ ...form, publico: event.target.value as CampaignForm["publico"] })}>
                    <option value="all">Todos os clientes elegiveis</option>
                    <option value="inactive">Clientes inativos ha pelo menos 60 dias</option>
                    <option value="birthday">Aniversariantes do mes</option>
                    <option value="recurring">Clientes recorrentes</option>
                    <option value="no_future">Clientes sem agendamento futuro</option>
                  </select>
                </Field>
              </div>
              {form.tipo === "relacionamento" ? <HelpBox text={RELATIONSHIP_HELP} /> : null}
              {meta && meta.templates.length === 0 ? <HelpBox text="Nenhum template de marketing disponivel. Cadastre ou aprove um template WhatsApp Marketing antes de criar campanhas." /> : null}
              <Field label="Template WhatsApp Marketing" required>
                <select className="h-11 w-full rounded-full border border-border bg-white px-4 text-sm" value={form.template_id} onChange={(event) => setForm({ ...form, template_id: event.target.value })}>
                  <option value="">Selecione o template da mensagem</option>
                  {(meta?.templates || []).map((template) => (
                    <option key={template.id} value={template.id}>
                      {templateLabel(template)} {template.aprovado_provider ? "(aprovado Meta)" : "(dry-run/pendente Meta)"}
                    </option>
                  ))}
                </select>
              </Field>
              {showService ? (
                <Field label="Servico da campanha" help="Selecione o servico relacionado a promocao ou divulgacao." required={serviceRequired}>
                  <select className="h-11 w-full rounded-full border border-border bg-white px-4 text-sm" value={form.servico_id} onChange={(event) => setForm({ ...form, servico_id: event.target.value, cupom_id: "" })}>
                    <option value="">{serviceRequired ? "Selecione um servico" : "Sem servico especifico"}</option>
                    {(meta?.services || []).map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.nome}{service.categoria ? ` - ${service.categoria}` : ""}{service.preco ? ` - ${Number(service.preco).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : ""}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {showService && meta && meta.services.length === 0 ? <HelpBox text="Nenhum servico ativo encontrado para este tenant." /> : null}
              <Field label="Cupom da campanha - opcional">
                <select className="h-11 w-full rounded-full border border-border bg-white px-4 text-sm" value={form.cupom_id} onChange={(event) => setForm({ ...form, cupom_id: event.target.value })}>
                  <option value="">Selecione um cupom ou mantenha sem cupom</option>
                  {filteredCoupons.map((coupon) => <option key={coupon.id} value={coupon.id}>{coupon.codigo}</option>)}
                </select>
              </Field>
              {meta && meta.coupons.length === 0 ? <HelpBox text="Nenhum cupom disponivel. Voce pode criar um cupom rapido ou manter a campanha sem cupom." /> : null}
              {selectedTemplate?.variaveis?.length ? (
                <div className="rounded-2xl border border-border bg-background/70 p-3 text-sm text-muted-foreground">
                  <strong className="text-foreground">Variaveis:</strong> {selectedTemplate.variaveis.join(", ")}
                </div>
              ) : null}
              {showOffer ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Data de inicio" required={promotionRequiresBenefit}>
                    <Input type="date" value={form.data_inicio} onChange={(event) => setForm({ ...form, data_inicio: event.target.value })} />
                  </Field>
                  <Field label="Data fim">
                    <Input type="date" value={form.data_fim} onChange={(event) => setForm({ ...form, data_fim: event.target.value })} />
                  </Field>
                  <Field label="Valor promocional da oferta" help="Use apenas numeros. Ex.: 30,00. Pode ser usado sozinho ou junto com cupom quando nao houver conflito.">
                    <Input type="number" min="0" step="0.01" value={form.valor_promocional} onChange={(event) => setForm({ ...form, valor_promocional: event.target.value })} placeholder="Ex.: 30,00" />
                  </Field>
                  <Field label="Oferta valida ate">
                    <Input type="date" value={form.validade_promocao} onChange={(event) => setForm({ ...form, validade_promocao: event.target.value })} />
                  </Field>
                </div>
              ) : null}
              <Field label="Quando enviar" help="Deixe vazio para salvar como rascunho ou escolha uma data e horario futuros para agendar.">
                <Input type="datetime-local" value={form.agendada_para} onChange={(event) => setForm({ ...form, agendada_para: event.target.value })} />
              </Field>
              {!dateIsFuture ? <FeedbackMessage tone="error" message="Quando enviar deve ser uma data e horario futuros." /> : null}
              <div className="rounded-2xl border border-border bg-background/70 p-3 text-sm text-muted-foreground">
                <strong className="text-foreground">Resumo:</strong> {form.nome || "Campanha sem nome"} para {form.publico === "all" ? "todos os elegiveis" : form.publico === "inactive" ? "clientes inativos" : form.publico === "birthday" ? "aniversariantes" : form.publico === "recurring" ? "clientes recorrentes" : "clientes sem agendamento futuro"}{selectedService ? `, servico ${selectedService.nome}` : ""}.
              </div>
              <Button type="submit" disabled={isSaving || !formCanSubmit}>
                <Send className="h-4 w-4" />
                Criar campanha
              </Button>
            </form>
          </div>

          <div className="rounded-2xl border border-white/80 bg-white/88 p-5 shadow-soft">
            <div className="mb-4 flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Cupom rapido</h2>
            </div>
            <form onSubmit={createCoupon} className="grid gap-3 md:grid-cols-2 2xl:grid-cols-[1.15fr_1fr_0.9fr_1fr_1.2fr_0.8fr_auto]">
              <Field label="Codigo" required>
                <Input value={couponForm.codigo} onChange={(event) => setCouponForm({ ...couponForm, codigo: event.target.value })} placeholder="Ex.: MANI30" />
              </Field>
              <Field label="Tipo de beneficio" required>
                <select className="h-11 w-full rounded-full border border-border bg-white px-4 text-sm" value={couponForm.tipo_desconto} onChange={(event) => setCouponForm({ ...couponForm, tipo_desconto: event.target.value })}>
                  <option value="percentual">Percentual</option>
                  <option value="valor">Valor fixo</option>
                  <option value="preco_promocional">Preco promocional</option>
                </select>
              </Field>
              <Field label="Valor" required>
                <Input type="number" min="0" step="0.01" value={couponForm.tipo_desconto === "percentual" ? couponForm.percentual_desconto : couponForm.valor_desconto} onChange={(event) => couponForm.tipo_desconto === "percentual" ? setCouponForm({ ...couponForm, percentual_desconto: event.target.value }) : setCouponForm({ ...couponForm, valor_desconto: event.target.value })} placeholder={couponForm.tipo_desconto === "percentual" ? "Ex.: 10" : "Ex.: 20,00"} />
              </Field>
              <Field label="Valido ate" required>
                <Input type="date" value={couponForm.data_fim} onChange={(event) => setCouponForm({ ...couponForm, data_fim: event.target.value })} />
              </Field>
              <Field label="Servico">
                <select className="h-11 w-full rounded-full border border-border bg-white px-4 text-sm" value={couponForm.servico_id} onChange={(event) => setCouponForm({ ...couponForm, servico_id: event.target.value })}>
                  <option value="">Qualquer servico</option>
                  {(meta?.services || []).map((service) => <option key={service.id} value={service.id}>{service.nome}</option>)}
                </select>
              </Field>
              <Field label="Limite">
                <Input type="number" min="1" step="1" value={couponForm.limite_uso} onChange={(event) => setCouponForm({ ...couponForm, limite_uso: event.target.value })} placeholder="Ex.: 50" />
              </Field>
              <div className="flex items-end">
                <Button type="submit" variant="outline" className="w-full">Criar</Button>
              </div>
            </form>
          </div>

          <div className="grid gap-3">
            {campaigns.length ? campaigns.map((campaign) => (
              <button key={campaign.id} type="button" onClick={() => setSelectedId(campaign.id)} className={cn("rounded-2xl border bg-white/88 p-4 text-left shadow-soft transition hover:border-primary/50", selected?.id === campaign.id ? "border-primary/60" : "border-white/80")}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <p className="break-words text-base font-bold text-foreground">{campaign.nome}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{campaignTypeLabel(campaign.tipo)} - {campaign.template?.nome || "sem template"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{audienceLabel(campaign.criterios_segmentacao)}</p>
                  </div>
                  <span className={cn("rounded-full border px-3 py-1 text-xs font-bold", statusClass(campaign.status_campanha || campaign.status))}>{commercialStatusLabel(campaign.status_campanha || campaign.status)}</span>
                </div>
                <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
                  <Metric label="Dest." value={campaign.total_destinatarios} />
                  <Metric label="Geradas" value={campaign.total_geradas} />
                  <Metric label="Enviadas" value={campaign.total_enviadas} />
                  <Metric label="Falhas" value={campaign.total_falhas} />
                </div>
                <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                  <span>Criada: {formatDateTime(campaign.created_at)}</span>
                  <span>Envio: {formatDateTime(campaign.agendada_para)}</span>
                  <span>Processamento: {processingStatusLabel(campaign.status_processamento)}</span>
                </div>
              </button>
            )) : (
              <EmptyState title="Nenhuma campanha criada" description="Crie a primeira campanha usando um template WhatsApp de marketing." />
            )}
            {pagination.total_pages > 1 ? (
              <div className="flex items-center justify-between rounded-2xl border border-white/80 bg-white/88 p-3 text-sm text-muted-foreground shadow-soft">
                <Button type="button" variant="outline" disabled={!pagination.has_previous || isLoading} onClick={() => updateFilters({ page: Math.max(1, pagination.page - 1) })}>
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <span>Pagina {pagination.page} de {pagination.total_pages}</span>
                <Button type="button" variant="outline" disabled={!pagination.has_next || isLoading} onClick={() => updateFilters({ page: pagination.page + 1 })}>
                  Proxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        <aside className="min-w-0 space-y-5">
          <div className="rounded-2xl border border-white/80 bg-white/88 p-5 shadow-soft">
            <h2 className="text-lg font-bold text-foreground">Detalhes</h2>
            {selected ? (
              <div className="mt-4 space-y-4">
                {canApproveSelected ? (
                  <div className="rounded-2xl border border-primary/20 bg-secondary/50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Aprovacao</p>
                    <h3 className="mt-1 text-base font-bold text-foreground">Parametrize antes de executar</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <Field label="Oferta">
                        <Input value={approvalForm.oferta} onChange={(event) => setApprovalForm({ ...approvalForm, oferta: event.target.value })} placeholder="Ex.: 20% na manicure" />
                      </Field>
                      <Field label="Desconto (%)">
                        <Input type="number" min="0" max="100" value={approvalForm.desconto} onChange={(event) => setApprovalForm({ ...approvalForm, desconto: event.target.value })} placeholder="Ex.: 20" />
                      </Field>
                      <Field label="Valor promocional">
                        <Input type="number" min="0" step="0.01" value={approvalForm.valor_promocional} onChange={(event) => setApprovalForm({ ...approvalForm, valor_promocional: event.target.value })} placeholder="Ex.: 39.90" />
                      </Field>
                      <Field label="Brinde">
                        <Input value={approvalForm.brinde} onChange={(event) => setApprovalForm({ ...approvalForm, brinde: event.target.value })} placeholder="Ex.: hidratacao express" />
                      </Field>
                      <Field label="Inicio">
                        <Input type="date" value={approvalForm.data_inicial} onChange={(event) => setApprovalForm({ ...approvalForm, data_inicial: event.target.value })} />
                      </Field>
                      <Field label="Fim">
                        <Input type="date" value={approvalForm.data_final} onChange={(event) => setApprovalForm({ ...approvalForm, data_final: event.target.value })} />
                      </Field>
                      <Field label="Quando executar">
                        <Input type="datetime-local" value={approvalForm.agendada_para} onChange={(event) => setApprovalForm({ ...approvalForm, agendada_para: event.target.value })} />
                      </Field>
                      <Field label="Como enviar">
                        <select className="h-11 w-full rounded-full border border-border bg-white px-4 text-sm" value={approvalForm.execution_mode} onChange={(event) => setApprovalForm({ ...approvalForm, execution_mode: event.target.value as ApprovalForm["execution_mode"] })}>
                          <option value="tenant_assisted">Eu envio pelo meu WhatsApp</option>
                          <option value="saas_managed">Usar envio da plataforma</option>
                          <option value="choose_each_campaign">Decidir nesta campanha</option>
                        </select>
                      </Field>
                      {approvalForm.execution_mode !== "saas_managed" ? (
                        <Field label="Distribuicao manual">
                          <select className="h-11 w-full rounded-full border border-border bg-white px-4 text-sm" value={approvalForm.manual_distribution_preference} onChange={(event) => setApprovalForm({ ...approvalForm, manual_distribution_preference: event.target.value as ApprovalForm["manual_distribution_preference"] })}>
                            <option value="choose_each_campaign">Escolher a cada campanha</option>
                            <option value="broadcast_list">Lista de Transmissao</option>
                            <option value="manual_contacts">Envio manual para contatos</option>
                            <option value="other_whatsapp_method">Outro metodo do WhatsApp</option>
                          </select>
                        </Field>
                      ) : null}
                      <label className="flex items-center gap-2 rounded-2xl border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground">
                        <input type="checkbox" checked={approvalForm.salvar_como_padrao} onChange={(event) => setApprovalForm({ ...approvalForm, salvar_como_padrao: event.target.checked })} />
                        Salvar como padrao
                      </label>
                    </div>
                    <Field label="Texto complementar">
                      <Input value={approvalForm.texto_complementar} onChange={(event) => setApprovalForm({ ...approvalForm, texto_complementar: event.target.value })} placeholder="Mensagem curta opcional" />
                    </Field>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" onClick={approveSelected}>
                        Aprovar
                      </Button>
                      <Button type="button" variant="ghost" onClick={rejectSelected}>
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={() => runAction("start")} disabled={["EM_PROCESSAMENTO", "CONCLUIDO"].includes(selected.status_processamento || "") || ["ENCERRADA", "REJEITADA"].includes(selected.status_campanha || "") || (selected.metadata?.requires_tenant_approval === true && selected.metadata?.lifecycle_stage !== "approved")}>
                    <Play className="h-4 w-4" />
                    Iniciar
                  </Button>
                  <Button type="button" variant="outline" onClick={() => runAction("schedule")} disabled={!form.agendada_para && !selected.agendada_para}>
                    <CalendarClock className="h-4 w-4" />
                    Agendar
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => runAction("cancel")} disabled={selected.status === "cancelada" || selected.status_campanha === "ENCERRADA"}>
                    <XCircle className="h-4 w-4" />
                    Cancelar
                  </Button>
                </div>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <Metric label="Elegiveis" value={estimate?.eligible ?? selected.total_destinatarios} />
                  <Metric label="Excluidos" value={estimate?.excluded ?? 0} />
                  <Metric label="Entrega" value={`${selected.metrics?.taxa_entrega ?? 0}%`} />
                  <Metric label="Leitura" value={`${selected.metrics?.taxa_leitura ?? 0}%`} />
                </div>
                {estimate ? (
                  <div className="rounded-2xl border border-border bg-background/70 p-4">
                    <p className="font-bold text-foreground">Motivos de exclusao</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
                      {Object.entries(estimate.excluded_by_reason).length
                        ? Object.entries(estimate.excluded_by_reason).map(([reason, count]) => <span key={reason} className="rounded-full border border-border px-3 py-1">{reason}: {count}</span>)
                        : <span>Nenhuma exclusao detectada.</span>}
                    </div>
                  </div>
                ) : null}
                {preview ? (
                  <div className="rounded-2xl border border-border bg-background/70 p-4">
                    <p className="font-bold text-foreground">Previa</p>
                    <div className="mt-3 rounded-2xl border border-accent/30 bg-white/80 p-3 text-sm leading-6 text-muted-foreground">
                      <div className="flex gap-2">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        <div>
                          <p className="font-semibold text-foreground">
                            {preview.illustrative
                              ? "Previa ilustrativa. Nenhum cliente elegivel foi encontrado."
                              : preview.preview_source === "mensagens_whatsapp"
                                ? "Previa congelada a partir da mensagem ja gerada."
                                : "Previa gerada com um cliente elegivel de exemplo."}
                          </p>
                          <p>
                            Quando a campanha for iniciada, a mensagem podera ser enviada aos clientes elegiveis conforme os criterios de segmentacao definidos.
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 rounded-xl border border-border bg-background/70 p-3 text-xs sm:grid-cols-3">
                        <div>
                          <p className="font-bold uppercase tracking-[0.12em] text-muted-foreground">Tipo</p>
                          <p className="mt-1 font-semibold text-foreground">{campaignTypeLabel(selected.tipo)}</p>
                        </div>
                        <div>
                          <p className="font-bold uppercase tracking-[0.12em] text-muted-foreground">Publico</p>
                          <p className="mt-1 font-semibold text-foreground">{audienceLabel(selected.criterios_segmentacao)}</p>
                        </div>
                        <div>
                          <p className="font-bold uppercase tracking-[0.12em] text-muted-foreground">Elegiveis</p>
                          <p className="mt-1 font-semibold text-foreground">{estimate ? estimate.eligible : "Definidos pela segmentacao"}</p>
                        </div>
                      </div>
                    </div>
                    <pre className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">{preview.conteudo}</pre>
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyState title="Selecione uma campanha" description="Os detalhes e a previa aparecem aqui." />
            )}
          </div>

          <div className="rounded-2xl border border-white/80 bg-white/88 p-5 shadow-soft">
            <h2 className="text-lg font-bold text-foreground">Mensagens</h2>
            <div className="mt-4 grid gap-3">
              {messages.length ? messages.slice(0, 10).map((message) => (
                <div key={message.id} className="rounded-xl border border-border bg-background/70 p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-bold text-foreground">{message.cliente?.nome || "Cliente"}</p>
                      <p className="text-muted-foreground">{message.telefone_destino || "-"}</p>
                    </div>
                    <span className={cn("rounded-full border px-3 py-1 text-xs font-bold", statusClass(message.status_envio))}>{message.status_envio}</span>
                  </div>
                  {message.erro_envio ? <p className="mt-2 text-primary">{message.erro_envio}</p> : null}
                </div>
              )) : (
                <EmptyState title="Sem mensagens" description="As mensagens aparecem depois que a campanha for iniciada." />
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-background/70 px-3 py-2">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-white/70 p-5 text-sm text-muted-foreground">
      <p className="font-bold text-foreground">{title}</p>
      <p className="mt-1">{description}</p>
    </div>
  );
}

function Field({ label, help, required = false, children }: { label: string; help?: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-foreground">
      <span>{label}{required ? <span className="text-primary"> *</span> : <span className="text-muted-foreground"> (opcional)</span>}</span>
      {children}
      {help ? <span className="text-xs font-medium leading-5 text-muted-foreground">{help}</span> : null}
    </label>
  );
}

function HelpBox({ text }: { text: string }) {
  return (
    <div className="flex gap-2 rounded-2xl border border-border bg-background/70 p-3 text-sm leading-6 text-muted-foreground">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span>{text}</span>
    </div>
  );
}
