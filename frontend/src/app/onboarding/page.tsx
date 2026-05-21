import type { Metadata } from "next";
import { OnboardingProvider } from "@/context/OnboardingProvider";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export const metadata: Metadata = {
  title: "Onboarding | Bellory",
  description: "Configure seu salao no Bellory em poucos minutos."
};

export default function OnboardingPage() {
  return (
    <OnboardingProvider>
      <OnboardingFlow />
    </OnboardingProvider>
  );
}
