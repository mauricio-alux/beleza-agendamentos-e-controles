import { APP_BRAND } from "@/config/app-brand";

const steps = [
  "Cadastro",
  "Criação do salão",
  "Configuração inicial",
  "Compartilhe seu link",
  "Clientes agendam",
  `${APP_BRAND.appName} automatiza`
];

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="bg-secondary/70">
      <div className="section-shell">
        <div className="mx-auto max-w-3xl text-center">
          <span className="eyebrow">Como funciona</span>
          <h2 className="section-title mt-5">Do cadastro ao primeiro agendamento em uma jornada natural.</h2>
          <p className="section-copy">
            A plataforma cria a estrutura mínima do seu salão e deixa o link pronto para divulgação.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step} className="rounded-2xl border border-border bg-white p-5 shadow-soft">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                {index + 1}
              </div>
              <p className="mt-5 text-lg font-semibold text-foreground">{step}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {index === 0 && "Você informa dados essenciais e escolhe o plano inicial."}
                {index === 1 && `${APP_BRAND.appName} cria o estabelecimento, usuário administrador e trial automaticamente.`}
                {index === 2 && "Serviços, profissional, escala e link são preparados para começar."}
                {index === 3 && "Use WhatsApp, Instagram, QR Code ou bio para divulgar."}
                {index === 4 && "O cliente acessa, informa telefone e agenda sem fricção."}
                {index === 5 && "Confirmações, retornos e campanhas ganham inteligência."}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
