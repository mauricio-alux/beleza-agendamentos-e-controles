import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export const metadata: Metadata = {
  title: "Permissões do Profissional"
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TeamMaintenancePermissionsRoute({ params }: PageProps) {
  const { id } = await params;

  return (
    <DashboardLayout>
      <section className="space-y-5">
        <div className="rounded-[1.75rem] border border-white/80 bg-white/82 p-5 shadow-soft backdrop-blur-xl sm:p-6">
          <Button asChild variant="ghost">
            <Link href={`/equipe/manutencao/${id}`}>
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-accent">Permissões</p>
          <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">Permissões do profissional</h1>
        </div>
        <DashboardCard title="RBAC em preparacao" description="As permissoes sugeridas por cargo ja estao centralizadas na manutencao do profissional.">
          <p className="text-sm leading-6 text-muted-foreground">
            A edicao granular sera conectada aos overrides de permissao por usuario na proxima iteracao.
          </p>
        </DashboardCard>
      </section>
    </DashboardLayout>
  );
}
