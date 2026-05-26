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
import type { ServiceCategory } from "@/constants/service-categories";

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

const defaultServices: OnboardingServiceItem[] = [
  { nome: "Corte", duracao_minutos: 45, preco: 0, categoria: "cabelo", selected: true },
  { nome: "Escova", duracao_minutos: 45, preco: 0, categoria: "cabelo", selected: true },
  { nome: "Manicure", duracao_minutos: 60, preco: 0, categoria: "manicure", selected: true },
  { nome: "Hidratacao", duracao_minutos: 60, preco: 0, categoria: "tratamento", selected: true }
];

export const onboardingSteps: OnboardingStepDefinition[] = [
  {
    id: "welcome",
    title: "Boas-vindas",
    description: "Seu salao ja ganhou uma base inicial.",
    backendStep: "tenant_created"
  },
  {
    id: "salon",
    title: "Informacoes do salao",
    description: "Dados essenciais para o atendimento.",
    backendStep: "tenant_created"
  },
  {
    id: "operation",
    title: "Operacao",
    description: "Agenda, horarios e preferencias.",
    backendStep: "scale_created"
  },
  {
    id: "services",
    title: "Servicos",
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
    description: "Tudo pronto para entrar no Bellory.",
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
  services: defaultServices
};

export const OnboardingContext = createContext<OnboardingContextValue | null>(null);

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function validateStep(step: OnboardingStepDefinition, data: OnboardingFormData) {
  if (step.id === "salon") {
    if (!data.nome_fantasia.trim()) {
      return "Informe o nome fantasia do salao.";
    }

    if (data.whatsapp && onlyDigits(data.whatsapp).length < 10) {
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

      setStatus(nextStatus);
      setSettings(nextSettings);

      if (nextStatus.progress >= 100) {
        router.replace(process.env.NEXT_PUBLIC_DASHBOARD_PATH || "/dashboard");
        return;
      }

      setData((current) => ({
        ...current,
        nome_fantasia: nextSettings.nome_fantasia || session.tenant.nome_fantasia || current.nome_fantasia,
        telefone: nextSettings.raw?.tenant?.telefone || session.usuario.telefone || current.telefone,
        whatsapp: nextSettings.raw?.tenant?.telefone || session.usuario.telefone || current.whatsapp,
        cidade: String(nextSettings.raw?.tenant?.endereco?.cidade || current.cidade),
        estado: String(nextSettings.raw?.tenant?.endereco?.estado || current.estado),
        horario_inicio_padrao: nextSettings.horario_inicio_padrao || current.horario_inicio_padrao,
        horario_fim_padrao: nextSettings.horario_fim_padrao || current.horario_fim_padrao,
        intervalo_agendamento: nextSettings.intervalo_agendamento || current.intervalo_agendamento,
        moeda: nextSettings.moeda || current.moeda,
        timezone: nextSettings.timezone || current.timezone
      }));

      const firstPendingIndex = onboardingSteps.findIndex((step) => {
        const backendStep = nextStatus.steps.find((item) => item.step === step.backendStep);
        return backendStep?.status !== "concluido";
      });
      setCurrentStepIndex(firstPendingIndex >= 0 ? firstPendingIndex : 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar o onboarding.");
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
                categoria: service.categoria || "",
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
            telefone: onlyDigits(data.telefone || data.whatsapp),
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
                duracao_padrao_servico: data.duracao_padrao_servico
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
                      .map(({ nome, duracao_minutos, preco, categoria, custom }) => ({
                        nome,
                        duracao_minutos,
                        preco,
                        categoria: categoria || null,
                        custom: Boolean(custom)
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
        setError(err instanceof Error ? err.message : "Nao foi possivel salvar. Tente novamente.");
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
      setError(err instanceof Error ? err.message : "Nao foi possivel concluir. Tente novamente.");
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
