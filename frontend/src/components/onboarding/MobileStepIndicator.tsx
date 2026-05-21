"use client";

import { useOnboarding } from "@/hooks/useOnboarding";
import { cn } from "@/lib/utils";

export function MobileStepIndicator() {
  const { steps, currentStepIndex } = useOnboarding();

  return (
    <div className="flex gap-2 lg:hidden" aria-label="Etapas do onboarding">
      {steps.map((step, index) => (
        <span
          key={step.id}
          className={cn(
            "h-2 flex-1 rounded-full transition-all duration-300",
            index <= currentStepIndex ? "bg-primary" : "bg-secondary"
          )}
        />
      ))}
    </div>
  );
}
