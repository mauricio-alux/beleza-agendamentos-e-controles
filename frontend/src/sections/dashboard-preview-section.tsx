import { DashboardMockup } from "@/components/dashboard-mockup";

export function DashboardPreviewSection() {
  return (
    <section id="dashboard" className="bg-muted">
      <div className="section-shell">
        <div className="mx-auto max-w-3xl text-center">
          <span className="eyebrow">Painel</span>
          <h2 className="section-title mt-5">Agenda, métricas e clientes em uma visão que dá vontade de usar.</h2>
          <p className="section-copy">
            Acompanhe atendimentos, faturamento, ocupação e relacionamento sem perder a delicadeza da experiência.
          </p>
        </div>
        <div className="mt-10">
          <DashboardMockup />
        </div>
      </div>
    </section>
  );
}
