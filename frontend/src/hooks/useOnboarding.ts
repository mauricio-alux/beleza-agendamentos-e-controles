"use client";

import { useContext } from "react";
import { OnboardingContext } from "@/context/OnboardingProvider";

export function useOnboarding() {
  const context = useContext(OnboardingContext);

  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }

  return context;
}
