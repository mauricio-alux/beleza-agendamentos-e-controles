import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import { APP_BRAND, buildAppUrl, withBrand } from "@/config/app-brand";

export const metadata: Metadata = {
  title: withBrand("Sem conexao"),
  description: `Conecte-se para acessar seus horarios e agendamentos no ${APP_BRAND.appName}.`,
  alternates: {
    canonical: buildAppUrl("/offline")
  }
};

export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#fff8f8] px-5 text-foreground">
      <section className="w-full max-w-md rounded-lg border border-primary/20 bg-white p-6 text-center shadow-sm">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
          <WifiOff className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="mt-4 text-xs font-bold uppercase text-accent">{APP_BRAND.appName}</p>
        <h1 className="mt-2 font-display text-3xl leading-tight">Voce esta sem conexao com a internet.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Conecte-se para acessar seus horarios e realizar agendamentos.
        </p>
      </section>
    </main>
  );
}
