import { Bot, CalendarDays, ChartNoAxesCombined, MessageCircle, Repeat, Sparkles, UsersRound, Wand2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const benefits = [
  { title: "Agenda inteligente", copy: "Organize horários, serviços e profissionais em poucos cliques.", icon: CalendarDays },
  { title: "Confirmação automática", copy: "Reduza faltas com lembretes e confirmações no momento certo.", icon: MessageCircle },
  { title: "CRM de clientes", copy: "Acompanhe histórico, frequência, preferências e oportunidades.", icon: UsersRound },
  { title: "Campanhas", copy: "Crie ações para retorno, datas especiais e clientes inativos.", icon: Sparkles },
  { title: "WhatsApp operacional", copy: "Transforme conversas em relacionamento e recorrência.", icon: Repeat },
  { title: "IA futura", copy: "Prepare mensagens, sugestões e insights com inteligência aplicada.", icon: Bot },
  { title: "Painéis", copy: "Veja ocupação, faturamento e evolução com clareza.", icon: ChartNoAxesCombined },
  { title: "Automação", copy: "Menos tarefas repetitivas, mais tempo para atender bem.", icon: Wand2 }
];

export function BenefitsSection() {
  return (
    <section id="beneficios" className="section-shell">
      <div className="max-w-3xl">
        <span className="eyebrow">Benefícios</span>
        <h2 className="section-title mt-5">Tudo que uma rotina de beleza precisa para crescer com leveza.</h2>
        <p className="section-copy">
          Uma base simples para profissionalizar atendimento, relacionamento e gestão sem virar um sistema pesado.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map((benefit) => {
          const Icon = benefit.icon;
          return (
            <Card key={benefit.title} className="transition duration-200 hover:-translate-y-1 hover:shadow-blush">
              <CardHeader>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <CardTitle>{benefit.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">{benefit.copy}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
