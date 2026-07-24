import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DashboardCardProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
};

export function DashboardCard({ title, description, children, className, action }: DashboardCardProps) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-[1.35rem] border border-white/80 bg-white/95 p-4 shadow-soft backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:shadow-glow sm:rounded-[1.5rem] sm:p-6",
        className
      )}
    >
      {title ? (
        <div className="mb-5 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 space-y-1">
            <h2 className="text-base font-bold text-foreground sm:text-lg">{title}</h2>
            {description ? <p className="text-sm leading-6 text-muted-foreground">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}
