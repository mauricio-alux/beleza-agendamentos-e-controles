"use client";

import { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  onboardingService,
  type OnboardingStatus,
  type OnboardingStepName,
  type TenantSettings
} from "@/services/onboarding.service";
import { BELLORY_OFFICIAL_SERVICES } from "@/constants/bellory-taxonomy";
import { normalizeServiceCategory, type ServiceCategory } from "@/constants/service-categories";
import { validateServiceTaxonomyName } from "@/utils/taxonomy-validator";
import { getErrorMessage } from "@/lib/messages";
import { getNationalPhone, normalizePhoneToE164 } from "@/utils/phone";
import { APP_BRAND } from "@/config/app-brand";

export type OnboardingStepId =
  | "welcome"
  | "salon"
  | "operation"
  | "services"
  | "professional"
  | "completion";

export type OnboardingStepDefinition = {
  id: OnboardingStepId;
  title: string;
  description: string;
  backendStep: OnboardingStepName;
};

export type OnboardingServiceItem = {
  nome: string;
  duracao_minutos: number;
  preco: number;
  categoria?: ServiceCategory | "";
  selected: boolean;
  custom?: boolean;
  metadata?: Record<string, unknown>;
};

export type OnboardingFormData = {
  nome_fantasia: string;
  telefone: string;
  whatsapp: string;
  cidade: string;
  estado: string;
  horario_inicio_padrao: string;
  horario_fim_padrao: string;
  intervalo_agendamento: number;
  duracao_padrao_servico: number;
  moeda: string;
  timezone: string;
  whatsapp_usage_type: "cloud_api" | "business_app" | "messenger" | "not_used";
  campaign_execution_mode: "tenant_assisted" | "saas_managed" | "choose_each_campaign";
  manual_distribution_preference: "broadcast_list" | "manual_contacts" | "other_whatsapp_method" | "choose_each_campaign";
  services: OnboardingServiceItem[];
};

type OnboardingContextValue = {
  steps: OnboardingStepDefinition[];
  currentStepIndex: number;
  currentStep: OnboardingStepDefinition;
  data: OnboardingFormData;
  status: OnboardingStatus | null;
  settings: TenantSettings | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string;
  progress: number;
  updateData: (patch: Partial<OnboardingFormData>) => void;
  updateService: (serviceName: string, selected: boolean) => void;
  upsertService: (service: Omit<OnboardingServiceItem, "selected"> & { selected?: boolean }) => void;
  removeService: (serviceName: string) => void;
  goToStep: (index: number) => void;
  goNext: () => Promise<void>;
  goBack: () => void;
  completeOnboarding: () => Promise<void>;
  refresh: () => Promise<void>;
};

const TAXONOMY_VERSION = "bellory_taxonomy_v1";

const defaultServiceDurationByName: Record<string, number> = {
  "Corte de Cabelo": 45,
  Escova: 45,
  Coloracao: 90,
  Hidratacao: 60,
  Barba: 45,
  Manicure: 60,
  Pedicure: 60,
  Maquiagem: 90,
  "Limpeza de Pele": 60,
  Massagem: 60,
  "Design de Sobrancelhas": 30,
  "Extensao de Cilios": 120
};

const defaultServices: OnboardingServiceItem[] = BELLORY_OFFICIAL_SERVICES.map((service) => ({
  nome: service.name,
  duracao_minutos: defaultServiceDurationByName[service.name] || 60,
  preco: 0,
  categoria: normalizeServiceCategory(service.categoryKey),
  selected: true,
  metadata: {
    taxonomy_version: TAXONOMY_VERSION,
    taxonomy_category_key: service.categoryKey,
    acao_servico: service.action,
    especialidades_oficiais: service.specialties
  }
}));

export const onboardingSteps: OnboardingStepDefinition[] = [
  {
    id: "welcome",
    title: "Boas-vindas",
    description: "Seu salao ja ganhou uma base inicial.",
    backendStep: "tenant_created"
  },
  {
    id: "salon",
    title: "Informações do salão",
    description: "Dados essenciais para o atendimento.",
    backendStep: "tenant_created"
  },
  {
    id: "operation",
    title: "Operação",
    description: "Agenda, horarios e preferencias.",
    backendStep: "scale_created"
  },
  {
    id: "services",
    title: "Serviços",
    description: "Comece com os servicos mais usados.",
    backendStep: "services_created"
  },
  {
    id: "professional",
    title: "Administrador",
    description: "Seu perfil principal no salao.",
    backendStep: "professional_created"
  },
  {
    id: "completion",
    title: "Finalizacao",
    description: `Tudo pronto para entrar no ${APP_BRAND.appName}.`,
    backendStep: "onboarding_completed"
  }
];

const initialData: OnboardingFormData = {
  nome_fantasia: "",
  telefone: "",
  whatsapp: "",
  cidade: "",
  estado: "",
  horario_inicio_padrao: "09:00",
  horario_fim_padrao: "18:00",
  intervalo_agendamento: 30,
  duracao_padrao_servico: 45,
  moeda: "BRL",
  timezone: "America/Sao_Paulo",
  whatsapp_usage_type: "business_app",
  campaign_execution_mode: "tenant_assisted",
  manual_distribution_preference: "choose_each_campaign",
  services: defaultServices
};

export const OnboardingContext = createContext<OnboardingContextValue | null>(null);

function validateStep(step: OnboardingStepDefinition, data: OnboardingFormData) {
  if (step.id === "salon") {
    if (!data.nome_fantasia.trim()) {
      return "Informe o nome fantasia do salao.";
    }

    if (data.whatsapp && getNationalPhone(data.whatsapp).length < 10) {
      return "Informe um WhatsApp valido.";
    }

    if (data.horario_inicio_padrao >= data.horario_fim_padrao) {
      return "O horario inicial deve ser menor que o horario final.";
    }
  }

  if (step.id === "services" && !data.services.some((service) => service.selected)) {
    return "Selecione pelo menos um servico inicial.";
  }

  if (step.id === "services") {
    const invalidService = data.services.find((service) =>
      service.selected && (!service.nome.trim() || service.duracao_minutos <= 0 || service.preco < 0)
    );

    if (invalidService) {
      return "Revise nome, duracao e preco dos servicos selecionados.";
    }

    const invalidTaxonomyService = data.services
      .filter((service) => service.selected)
      .map((service) => ({
        service,
        validation: validateServiceTaxonomyName(service.nome)
      }))
      .find((item) => !item.validation.valid);

    if (invalidTaxonomyService) {
      const suggestions = invalidTaxonomyService.validation.suggestions?.length
        ? ` Sugestao: ${invalidTaxonomyService.validation.suggestions.join(", ")}.`
        : "";
      return `${invalidTaxonomyService.validation.message}${suggestions}`;
    }
  }

  return "";
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { session, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [data, setData] = useState<OnboardingFormData>(initialData);
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const currentStep = onboardingSteps[currentStepIndex];
  const progress = Math.round(((currentStepIndex + 1) / onboardingSteps.length) * 100);

  const hydrate = useCallback(async () => {
    if (!session) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const [nextStatus, nextSettings] = await Promise.all([
        onboardingService.getStatus(session),
        onboardingService.getTenantSettings(session)
      ]);
      const tenantServices = await onboardingService.listServices(session).catch(() => []);

      setStatus(nextStatus);
      setSettings(nextSettings);

      if (nextStatus.progress >= 100) {
        router.replace(process.env.NEXT_PUBLIC_DASHBOARD_PATH || "/dashboard");
        return;
      }

      setData((current) => ({
        ...current,
        nome_fantasia: nextSettings.nome_fantasia || session.tenant?.nome_fantasia || current.nome_fantasia,
        telefone: nextSettings.raw?.tenant?.telefone || session.usuario.telefone || current.telefone,
        whatsapp: nextSettings.raw?.tenant?.telefone || session.usuario.telefone || current.whatsapp,
        cidade: String(nextSettings.raw?.tenant?.endereco?.cidade || current.cidade),
        estado: String(nextSettings.raw?.tenant?.endereco?.estado || current.estado),
        horario_inicio_padrao: nextSettings.horario_inicio_padrao || current.horario_inicio_padrao,
        horario_fim_padrao: nextSettings.horario_fim_padrao || current.horario_fim_padrao,
        intervalo_agendamento: nextSettings.intervalo_agendamento || current.intervalo_agendamento,
        duracao_padrao_servico: nextSettings.duracao_padrao_servico || current.duracao_padrao_servico,
        moeda: nextSettings.moeda || current.moeda,
        timezone: nextSettings.timezone || current.timezone,
        whatsapp_usage_type: (nextSettings.raw?.tenant?.configuracoes?.campaign_whatsapp as Record<string, string> | undefined)?.usage_type as OnboardingFormData["whatsapp_usage_type"] || current.whatsapp_usage_type,
        campaign_execution_mode: (nextSettings.raw?.tenant?.configuracoes?.campaign_whatsapp as Record<string, string> | undefined)?.execution_mode as OnboardingFormData["campaign_execution_mode"] || current.campaign_execution_mode,
        manual_distribution_preference: (nextSettings.raw?.tenant?.configuracoes?.campaign_whatsapp as Record<string, string> | undefined)?.manual_distribution_preference as OnboardingFormData["manual_distribution_preference"] || current.manual_distribution_preference,
        services: tenantServices.length
          ? tenantServices.map((service) => ({
              nome: service.nome,
              duracao_minutos: service.duracao_minutos || current.duracao_padrao_servico,
              preco: Number(service.preco || 0),
              categoria: normalizeServiceCategory(service.categoria),
              selected: service.ativo !== false,
              custom: Boolean(service.categoria && !defaultServices.some((item) => item.nome === service.nome)),
              metadata: service.metadata
            }))
          : current.services
      }));

      const firstPendingIndex = onboardingSteps.findIndex((step) => {
        const backendStep = nextStatus.steps.find((item) => item.step === step.backendStep);
        return backendStep?.status !== "concluido";
      });
      setCurrentStepIndex(firstPendingIndex >= 0 ? firstPendingIndex : 0);
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível carregar o onboarding."));
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    hydrate();
  }, [hydrate, isAuthLoading, isAuthenticated, router]);

  const updateData = useCallback((patch: Partial<OnboardingFormData>) => {
    setData((current) => ({ ...current, ...patch }));
  }, []);

  const updateService = useCallback((serviceName: string, selected: boolean) => {
    setData((current) => ({
      ...current,
      services: current.services.map((service) =>
        service.nome === serviceName ? { ...service, selected } : service
      )
    }));
  }, []);

  const upsertService = useCallback((service: Omit<OnboardingServiceItem, "selected"> & { selected?: boolean }) => {
    const normalized = service.nome.trim();
    if (!normalized) {
      return;
    }

    setData((current) => {
      const exists = current.services.some((item) => item.nome.toLowerCase() === normalized.toLowerCase());

      return {
        ...current,
        services: exists
          ? current.services.map((item) =>
              item.nome.toLowerCase() === normalized.toLowerCase()
                ? { ...item, ...service, nome: normalized, selected: service.selected ?? item.selected }
                : item
            )
          : [
              ...current.services,
              {
                nome: normalized,
                duracao_minutos: service.duracao_minutos || current.duracao_padrao_servico,
                preco: service.preco || 0,
                categoria: normalizeServiceCategory(service.categoria),
                selected: service.selected ?? true,
                custom: true
              }
            ]
      };
    });
  }, []);

  const removeService = useCallback((serviceName: string) => {
    setData((current) => ({
      ...current,
      services: current.services.filter((service) => service.nome !== serviceName)
    }));
  }, []);

  const saveStep = useCallback(
    async (step: OnboardingStepDefinition) => {
      const validationError = validateStep(step, data);
      if (validationError) {
        setError(validationError);
        return false;
      }

      if (!session) {
        setError("Sessao expirada. Entre novamente.");
        return false;
      }

      setIsSaving(true);
      setError("");

      try {
        if (step.id === "salon") {
          await onboardingService.updateTenant(session, {
            nome_fantasia: data.nome_fantasia,
            telefone: data.telefone || data.whatsapp ? normalizePhoneToE164(data.telefone || data.whatsapp) : "",
            endereco: {
              ...(settings?.raw?.tenant?.endereco || {}),
              cidade: data.cidade,
              estado: data.estado
            },
            configuracoes: {
              ...(settings?.raw?.tenant?.configuracoes || {}),
              nome_fantasia: data.nome_fantasia,
              horario_inicio_padrao: data.horario_inicio_padrao,
              horario_fim_padrao: data.horario_fim_padrao
            }
          });
        }

        if (step.id === "operation") {
          await Promise.all([
            onboardingService.updateTenant(session, {
              timezone: data.timezone,
              configuracoes: {
                ...(settings?.raw?.tenant?.configuracoes || {}),
                moeda: data.moeda,
                timezone: data.timezone,
                horario_inicio_padrao: data.horario_inicio_padrao,
                horario_fim_padrao: data.horario_fim_padrao,
                intervalo_agendamento: data.intervalo_agendamento,
                duracao_padrao_servico: data.duracao_padrao_servico,
                campaign_whatsapp: {
                  usage_type: data.whatsapp_usage_type,
                  has_own_cloud_api: data.whatsapp_usage_type === "cloud_api",
                  execution_mode: data.campaign_execution_mode,
                  manual_distribution_preference: data.manual_distribution_preference,
                  configured_during: "onboarding"
                }
              }
            }),
            onboardingService.updateTenantSettings(session, {
              intervalo_padrao_minutos: data.intervalo_agendamento
            })
          ]);
        }

        const updated = await onboardingService.updateStep(session, step.backendStep, {
          status: "concluido",
          metadata: {
            frontend_step_id: step.id,
            ui_completed: true,
            saved_at: new Date().toISOString(),
            payload:
              step.id === "services"
                ? {
                    services: data.services
                      .filter((service) => service.selected)
                      .map(({ nome, duracao_minutos, preco, categoria, custom, metadata }) => ({
                        nome,
                        duracao_minutos,
                        preco,
                        categoria: categoria || null,
                        custom: Boolean(custom),
                        metadata
                      }))
                  }
                : undefined
          }
        });

        setStatus((current) =>
          current
            ? {
                ...current,
                steps: current.steps.map((item) => (item.step === updated.step ? updated : item))
              }
            : current
        );

        return true;
      } catch (err) {
        setError(getErrorMessage(err, "Não foi possível salvar. Tente novamente."));
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [data, session, settings]
  );

  const goNext = useCallback(async () => {
    const saved = await saveStep(currentStep);
    if (!saved) {
      return;
    }

    setCurrentStepIndex((current) => Math.min(current + 1, onboardingSteps.length - 1));
  }, [currentStep, saveStep]);

  const goBack = useCallback(() => {
    setError("");
    setCurrentStepIndex((current) => Math.max(current - 1, 0));
  }, []);

  const goToStep = useCallback((index: number) => {
    setError("");
    setCurrentStepIndex(Math.min(Math.max(index, 0), onboardingSteps.length - 1));
  }, []);

  const completeOnboarding = useCallback(async () => {
    if (!session) {
      setError("Sessao expirada. Entre novamente.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await onboardingService.complete(session);
      router.replace(process.env.NEXT_PUBLIC_DASHBOARD_PATH || "/dashboard");
    } catch (err) {
      setError(getErrorMessage(err, "Não foi possível concluir. Tente novamente."));
    } finally {
      setIsSaving(false);
    }
  }, [router, session]);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      steps: onboardingSteps,
      currentStepIndex,
      currentStep,
      data,
      status,
      settings,
      isLoading: isLoading || isAuthLoading,
      isSaving,
      error,
      progress,
      updateData,
      updateService,
      upsertService,
      removeService,
      goToStep,
      goNext,
      goBack,
      completeOnboarding,
      refresh: hydrate
    }),
    [
      currentStepIndex,
      currentStep,
      data,
      status,
      settings,
      isLoading,
      isAuthLoading,
      isSaving,
      error,
      progress,
      updateData,
      updateService,
      upsertService,
      removeService,
      goToStep,
      goNext,
      goBack,
      completeOnboarding,
      hydrate
    ]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}
