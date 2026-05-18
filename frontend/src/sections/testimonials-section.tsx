const testimonials = [
  {
    quote: "A agenda ficou mais organizada e os lembretes deixam o atendimento mais profissional.",
    name: "Mariana Alves",
    role: "Cabeleireira"
  },
  {
    quote: "O link de agendamento facilitou muito para minhas clientes, principalmente pelo celular.",
    name: "Bianca Torres",
    role: "Manicure"
  },
  {
    quote: "Finalmente consigo olhar clientes, horários e campanhas sem depender de planilhas.",
    name: "Rafaela Lima",
    role: "Esteticista"
  }
];

export function TestimonialsSection() {
  return (
    <section className="bg-secondary/70">
      <div className="section-shell">
        <div className="max-w-3xl">
          <span className="eyebrow">Depoimentos</span>
          <h2 className="section-title mt-5">Uma experiência pensada para quem vive de cuidado e relacionamento.</h2>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {testimonials.map((item) => (
            <figure key={item.name} className="rounded-2xl border border-border bg-white p-6 shadow-soft">
              <blockquote className="text-base leading-7 text-foreground">“{item.quote}”</blockquote>
              <figcaption className="mt-6">
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-muted-foreground">{item.role}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
