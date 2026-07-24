import type { Metadata } from "next";
import { OnboardingProvider } from "@/context/OnboardingProvider";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

export const metadata: Metadata = {
  title: "Onboarding",
  description: "Configure seu salao em poucos minutos."
};

export default function OnboardingPage() {
  return (
    <OnboardingProvider>
      <OnboardingFlow />
    </OnboardingProvider>
  );
}
