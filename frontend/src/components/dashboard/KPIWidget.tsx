import { Info, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type KPIWidgetProps = {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone?: "primary" | "accent" | "neutral";
  help?: string;
};

export function KPIWidget({ label, value, hint, icon: Icon, tone = "primary", help }: KPIWidgetProps) {
  const toneClass = {
    primary: "bg-secondary text-primary",
    accent: "bg-accent/10 text-accent",
    neutral: "bg-muted text-muted-foreground"
  }[tone];

  return (
    <div className="min-w-0 rounded-[1.25rem] border border-white/80 bg-white/90 p-4 shadow-sm sm:rounded-[1.35rem]">
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 break-words text-sm font-semibold text-muted-foreground">{label}</span>
        <div className="flex flex-none items-center gap-2">
          {help ? (
            <span
              className="grid h-7 w-7 place-items-center rounded-full border border-border bg-white text-muted-foreground"
              title={help}
              aria-label={help}
            >
              <Info className="h-3.5 w-3.5" />
            </span>
          ) : null}
          <span className={cn("grid h-10 w-10 place-items-center rounded-full", toneClass)}>
            <Icon className="h-5 w-5" />
          </span>
        </div>
      </div>
      <p className="mt-4 break-words text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p>
    </div>
  );
}
