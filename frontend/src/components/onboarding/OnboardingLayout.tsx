"use client";

import { ReactNode, useEffect } from "react";
import { writeLastContext } from "@/lib/last-context";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader";
import { OnboardingSidebar } from "@/components/onboarding/OnboardingSidebar";
import { StepNavigation } from "@/components/onboarding/StepNavigation";
import { useOnboarding } from "@/hooks/useOnboarding";

type OnboardingLayoutProps = {
  children: ReactNode;
};

export function OnboardingLayout({ children }: OnboardingLayoutProps) {
  const { isLoading, error, progress } = useOnboarding();
  const { session, isLoading: isAuthLoading } = useAuth();
  useEffect(() => {
    if (!isLoading && !error && !isAuthLoading && session) writeLastContext("professional");
  }, [isLoading, error, isAuthLoading, session]);

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-background p-6">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-white px-5 py-4 text-sm font-semibold text-muted-foreground shadow-soft">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Preparando seu onboarding...
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,179,193,0.38),transparent_28%),radial-gradient(circle_at_86%_18%,rgba(123,75,255,0.14),transparent_30%),linear-gradient(145deg,#FFFDFC_0%,#FFE8E2_48%,#FFFDFC_100%)]" />
      <div className="relative mx-auto grid max-w-7xl gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[360px_1fr] lg:px-8">
        <OnboardingSidebar progress={progress} />
        <section className="mx-auto flex w-full max-w-3xl flex-col gap-5 py-2 lg:py-4">
          <OnboardingHeader />
          {error ? (
            <FeedbackMessage tone="error" message={error} />
          ) : null}
          <div className="animate-fade-up">{children}</div>
          <StepNavigation />
        </section>
      </div>
    </main>
  );
}
