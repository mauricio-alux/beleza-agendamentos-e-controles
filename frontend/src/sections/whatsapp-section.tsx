import { BellRing, HeartHandshake, MessageSquareText, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const items = [
  { label: "Confirmações automáticas", icon: BellRing },
  { label: "Campanhas segmentadas", icon: MessageSquareText },
  { label: "Recuperação de clientes", icon: RefreshCcw },
  { label: "Relacionamento contínuo", icon: HeartHandshake }
];

export function WhatsAppSection() {
  return (
    <section id="whatsapp" className="section-shell">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <span className="eyebrow">WhatsApp</span>
          <h2 className="section-title mt-5">Seu canal de relacionamento trabalhando junto com a agenda.</h2>
          <p className="section-copy">
            O WhatsApp entra como canal operacional para confirmar horários, lembrar clientes,
            ativar campanhas e fortalecer a recorrência.
          </p>
          <Button className="mt-7" variant="accent">
            Preparar automações
          </Button>
        </div>

        <div className="rounded-[2rem] border border-border bg-[#2C2C2C] p-5 text-white shadow-soft sm:p-7">
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-2xl bg-white/10 p-4">
                  <Icon className="h-5 w-5 text-secondary" aria-hidden="true" />
                  <p className="mt-4 font-semibold">{item.label}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-5 rounded-2xl bg-white p-4 text-foreground">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Mensagem sugerida</p>
            <p className="mt-3 text-sm leading-6">
              Oi, Julia! Ja faz 45 dias desde sua ultima hidratação. Tenho horarios essa semana se quiser renovar o cuidado.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
