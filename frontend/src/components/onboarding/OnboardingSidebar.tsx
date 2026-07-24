import { BrandLogo } from "@/components/brand-logo";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { OnboardingStepper } from "@/components/onboarding/OnboardingStepper";
import { APP_BRAND } from "@/config/app-brand";

type OnboardingSidebarProps = {
  progress: number;
};

export function OnboardingSidebar({ progress }: OnboardingSidebarProps) {
  return (
    <aside className="hidden min-h-[calc(100vh-3rem)] rounded-[2rem] border border-white/70 bg-white/65 p-6 shadow-glow backdrop-blur-xl lg:block">
      <div className="sticky top-6 space-y-8">
        <BrandLogo />
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-accent">Ativacao guiada</p>
          <h1 className="font-display text-4xl leading-tight text-foreground">
            Vamos montar seu salao em poucos minutos.
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            O {APP_BRAND.appName} ja criou a base operacional. Agora vamos deixar tudo com a cara do seu atendimento.
          </p>
        </div>
        <OnboardingProgress progress={progress} />
        <OnboardingStepper />
      </div>
    </aside>
  );
}
