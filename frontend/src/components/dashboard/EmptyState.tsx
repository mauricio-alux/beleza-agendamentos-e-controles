import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

export function EmptyState({ icon: Icon, title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="grid place-items-center rounded-[1.35rem] border border-dashed border-border bg-background/80 p-6 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-secondary text-primary">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-base font-bold text-foreground">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
      {actionLabel && actionHref ? (
        <Button className="mt-5" variant="outline" asChild>
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : actionLabel ? (
        <Button className="mt-5" variant="outline" type="button" disabled title="Ação ainda não disponível neste contexto.">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
