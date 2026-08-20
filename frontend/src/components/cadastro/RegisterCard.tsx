import { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { APP_BRAND } from "@/config/app-brand";

type RegisterCardProps = {
  children: ReactNode;
};

export function RegisterCard({ children }: RegisterCardProps) {
  return (
    <section className="w-full overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/95 shadow-[0_28px_90px_rgba(43,43,43,0.13)] backdrop-blur">
      <div className="space-y-5 p-6 pb-4 sm:p-8 sm:pb-5">
        <BrandLogo />
        <div className="space-y-2">
          <h1 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
            Crie sua conta {APP_BRAND.appName}
          </h1>
          <p className="text-sm leading-6 text-muted-foreground sm:text-base">
            Seu salao comeca com estabelecimento, admin, trial e onboarding criados automaticamente.
          </p>
        </div>
      </div>
      <div className="p-6 pt-0 sm:p-8 sm:pt-0">{children}</div>
    </section>
  );
}
