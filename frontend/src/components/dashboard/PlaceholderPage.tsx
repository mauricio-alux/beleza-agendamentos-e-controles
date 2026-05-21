import { LucideIcon } from "lucide-react";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { QuickActions } from "@/components/dashboard/QuickActions";

type PlaceholderPageProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  actionLabel: string;
};

export function PlaceholderPage({ title, description, icon, actionLabel }: PlaceholderPageProps) {
  const Icon = icon;

  return (
    <div className="grid gap-5">
      <section className="rounded-[1.75rem] border border-white/80 bg-white/86 p-5 shadow-soft backdrop-blur sm:p-6">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-secondary text-primary">
          <Icon className="h-6 w-6" />
        </span>
        <h1 className="mt-4 font-display text-3xl leading-tight text-foreground sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>
      </section>

      <DashboardCard title="Acoes rapidas" description="Atalhos preparados para os proximos fluxos operacionais.">
        <QuickActions />
      </DashboardCard>

      <DashboardCard title="Area em preparacao">
        <EmptyState icon={icon} title={`${title} em breve`} description={description} actionLabel={actionLabel} />
      </DashboardCard>
    </div>
  );
}
