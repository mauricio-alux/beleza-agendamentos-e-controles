"use client";

import { CalendarCheck, Link2, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { SetupCard } from "@/components/onboarding/SetupCard";

export function WelcomeCard() {
  const { session } = useAuth();
  const { settings } = useOnboarding();

  const items = [
    { icon: CalendarCheck, label: "Agenda inicial preparada" },
    { icon: Link2, label: `Link publico /agendar/${settings?.slug || session?.tenant.slug || "seu-salao"}` },
    { icon: MessageCircle, label: "WhatsApp pronto para ativacao futura" }
  ];

  return (
    <SetupCard
      title={`Bem-vindo ao Bellory${session?.usuario.nome ? `, ${session.usuario.nome}` : ""}`}
      description="Vamos configurar seu salao em poucos minutos."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {items.map(({ icon: Icon, label }) => (
          <div key={label} className="rounded-2xl border border-border bg-background p-4">
            <span className="mb-4 grid h-10 w-10 place-items-center rounded-full bg-secondary text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <p className="text-sm font-semibold leading-6 text-foreground">{label}</p>
          </div>
        ))}
      </div>
    </SetupCard>
  );
}
