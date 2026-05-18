import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const plans = [
  {
    name: "Trial grátis",
    price: "14 dias",
    copy: "Para experimentar a estrutura inicial do Bellory.",
    features: ["Agenda online", "Serviços iniciais", "Link de agendamento", "Configuração guiada"],
    highlighted: false
  },
  {
    name: "Profissional",
    price: "R$ 59",
    copy: "Para autônomas e pequenos estúdios que querem recorrência.",
    features: ["CRM de clientes", "WhatsApp operacional", "Painel essencial", "Campanhas básicas"],
    highlighted: true
  },
  {
    name: "Premium",
    price: "R$ 119",
    copy: "Para salões em crescimento com automação e inteligência.",
    features: ["Múltiplos profissionais", "Campanhas avançadas", "IA e insights", "Métricas de performance"],
    highlighted: false
  }
];

export function PlansSection() {
  return (
    <section id="planos" className="section-shell">
      <div className="mx-auto max-w-3xl text-center">
        <span className="eyebrow">Planos</span>
        <h2 className="section-title mt-5">Comece simples e evolua conforme seu salão cresce.</h2>
        <p className="section-copy">
          Estrutura preparada para trial, upgrade, downgrade e cobrança futura.
        </p>
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={plan.highlighted ? "border-primary bg-[#FFF8F6] shadow-blush" : ""}
          >
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">{plan.copy}</p>
              <p className="pt-3 font-display text-4xl text-foreground">
                {plan.price}
                {plan.price.startsWith("R$") && <span className="font-sans text-sm text-muted-foreground">/mês</span>}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary" aria-hidden="true" />
                    {feature}
                  </div>
                ))}
              </div>
              <Button className="mt-6 w-full" variant={plan.highlighted ? "default" : "outline"} asChild>
                <Link href="/cadastro">Escolher plano</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
