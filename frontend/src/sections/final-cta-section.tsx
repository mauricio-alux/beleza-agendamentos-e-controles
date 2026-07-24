import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_BRAND } from "@/config/app-brand";

export function FinalCtaSection() {
  return (
    <section className="section-shell">
      <div className="rounded-[2rem] bg-[#2C2C2C] px-6 py-12 text-center text-white shadow-soft sm:px-10 lg:px-16 lg:py-16">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-secondary">Comece com elegância</p>
        <h2 className="mx-auto mt-5 max-w-3xl font-display text-4xl leading-tight sm:text-5xl">
          Transforme sua agenda em relacionamento, recorrência e crescimento.
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/72">
          {APP_BRAND.appName} prepara a base para seu salão operar com mais organização desde o primeiro cadastro.
        </p>
        <Button className="mt-8" size="lg" asChild>
          <Link href="/cadastro">
            Começar agora
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
