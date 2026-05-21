"use client";

import { Check } from "lucide-react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { cn } from "@/lib/utils";

export function OnboardingStepper() {
  const { steps, currentStepIndex, goToStep } = useOnboarding();

  return (
    <nav className="space-y-2">
      {steps.map((step, index) => {
        const isActive = index === currentStepIndex;
        const isDone = index < currentStepIndex;

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => goToStep(index)}
            className={cn(
              "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition duration-200",
              isActive
                ? "border-primary/35 bg-secondary shadow-sm"
                : "border-transparent bg-white/55 hover:border-border hover:bg-white"
            )}
          >
            <span
              className={cn(
                "grid h-9 w-9 flex-none place-items-center rounded-full text-sm font-bold",
                isDone
                  ? "bg-accent text-accent-foreground"
                  : isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              )}
            >
              {isDone ? <Check className="h-4 w-4" /> : index + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-foreground">{step.title}</span>
              <span className="block truncate text-xs text-muted-foreground">{step.description}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
