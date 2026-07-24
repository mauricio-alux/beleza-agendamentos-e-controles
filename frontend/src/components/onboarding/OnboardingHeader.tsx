"use client";

import { Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { MobileStepIndicator } from "@/components/onboarding/MobileStepIndicator";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { APP_BRAND } from "@/config/app-brand";

export function OnboardingHeader() {
  const { session } = useAuth();
  const { currentStep, currentStepIndex, steps, progress } = useOnboarding();

  return (
    <header className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-accent shadow-sm">
          <Sparkles className="h-4 w-4" />
          Onboarding {APP_BRAND.appName}
        </span>
        <span className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-muted-foreground">
          Etapa {currentStepIndex + 1} de {steps.length}
        </span>
      </div>
      <div className="space-y-2">
        <h2 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">{currentStep.title}</h2>
        <p className="text-sm leading-6 text-muted-foreground sm:text-base">
          {session?.usuario.nome ? `${session.usuario.nome}, ` : ""}
          {currentStep.description}
        </p>
      </div>
      <MobileStepIndicator />
      <OnboardingProgress progress={progress} className="lg:hidden" />
    </header>
  );
}
