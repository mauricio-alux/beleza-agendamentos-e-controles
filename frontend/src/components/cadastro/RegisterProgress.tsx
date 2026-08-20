import { CheckCircle2, CircleDotDashed, Sparkles } from "lucide-react";

type RegisterProgressProps = {
  isLoadingPlans?: boolean;
  isRegistering?: boolean;
};

export function RegisterProgress({ isLoadingPlans = false, isRegistering = false }: RegisterProgressProps) {
  const steps = [
    {
      label: "Conta",
      active: !isRegistering,
      done: false
    },
    {
      label: "Salão",
      active: isRegistering,
      done: false
    },
    {
      label: "Trial",
      active: false,
      done: false
    }
  ];

  return (
    <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Sparkles className="h-4 w-4 text-accent" />
        {isRegistering ? "Criando seu salao..." : isLoadingPlans ? "Preparando seu plano..." : "Comece em poucos minutos"}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {steps.map((step, index) => (
          <div key={step.label} className="flex items-center gap-2 rounded-full bg-background px-3 py-2 text-xs font-semibold text-muted-foreground">
            {index === 0 && !isRegistering ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : (
              <CircleDotDashed className={step.active ? "h-4 w-4 animate-spin text-accent" : "h-4 w-4 text-muted-foreground"} />
            )}
            {step.label}
          </div>
        ))}
      </div>
    </div>
  );
}
