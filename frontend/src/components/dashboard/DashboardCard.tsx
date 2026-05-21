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
        "rounded-[1.5rem] border border-white/80 bg-white/95 p-5 shadow-soft backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:shadow-glow sm:p-6",
        className
      )}
    >
      {title ? (
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="space-y-1">
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
