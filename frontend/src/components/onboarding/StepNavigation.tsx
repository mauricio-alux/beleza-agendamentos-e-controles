"use client";

import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/hooks/useOnboarding";
import { APP_BRAND } from "@/config/app-brand";

export function StepNavigation() {
  const { currentStepIndex, steps, isSaving, goBack, goNext, completeOnboarding } = useOnboarding();
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === steps.length - 1;

  return (
    <footer className="flex flex-col-reverse gap-3 rounded-[1.75rem] border border-white/80 bg-white/85 p-3 shadow-soft backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <Button type="button" variant="outline" onClick={goBack} disabled={isFirst || isSaving}>
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Button>

      {isLast ? (
        <LoadingButton type="button" size="lg" isLoading={isSaving} onClick={completeOnboarding}>
          <CheckCircle2 className="h-4 w-4" />
          Entrar no {APP_BRAND.appName}
        </LoadingButton>
      ) : (
        <LoadingButton type="button" size="lg" isLoading={isSaving} onClick={goNext}>
          Continuar
          <ArrowRight className="h-4 w-4" />
        </LoadingButton>
      )}
    </footer>
  );
}
