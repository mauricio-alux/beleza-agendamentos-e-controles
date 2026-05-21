import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SetupCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function SetupCard({ title, description, children, className }: SetupCardProps) {
  return (
    <section className={cn("rounded-[1.75rem] border border-white/80 bg-white/95 p-5 shadow-soft sm:p-6", className)}>
      <div className="mb-5 space-y-1">
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
        {description ? <p className="text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
