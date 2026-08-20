"use client";

import { useCallback, useEffect, useState } from "react";
import { RegisterError, registerService, type PublicPlan, type RegisterPayload } from "@/services/register.service";
import { useAuth } from "@/hooks/useAuth";

export function useRegister() {
  const { setAuthenticatedSession } = useAuth();
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    registerService
      .listPlans()
      .then((nextPlans) => {
        if (!mounted) {
          return;
        }

        setPlans(nextPlans);
        setSelectedPlanId(process.env.NEXT_PUBLIC_DEFAULT_PLAN_ID || nextPlans[0]?.id || "");
      })
      .catch((err) => {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Não foi possível carregar o plano inicial.");
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingPlans(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const register = useCallback(
    async (payload: Omit<RegisterPayload, "plano_id">) => {
      setIsRegistering(true);
      setError("");

      try {
        const planoId = selectedPlanId || (await registerService.getInitialPlanId());
        const result = await registerService.register({ ...payload, plano_id: planoId });
        setAuthenticatedSession(result.session, true);
        return result;
      } catch (err) {
        if (err instanceof RegisterError) {
          setError(err.message);
          throw err;
        }

        const message = err instanceof Error ? err.message : "Não foi possível criar sua conta. Tente novamente.";
        setError(message);
        throw new Error(message);
      } finally {
        setIsRegistering(false);
      }
    },
    [selectedPlanId, setAuthenticatedSession]
  );

  return {
    plans,
    selectedPlanId,
    setSelectedPlanId,
    isLoadingPlans,
    isRegistering,
    error,
    setError,
    register
  };
}
