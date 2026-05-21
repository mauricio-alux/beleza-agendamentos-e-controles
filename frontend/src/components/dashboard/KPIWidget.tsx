import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type KPIWidgetProps = {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone?: "primary" | "accent" | "neutral";
};

export function KPIWidget({ label, value, hint, icon: Icon, tone = "primary" }: KPIWidgetProps) {
  const toneClass = {
    primary: "bg-secondary text-primary",
    accent: "bg-accent/10 text-accent",
    neutral: "bg-muted text-muted-foreground"
  }[tone];

  return (
    <div className="rounded-[1.35rem] border border-white/80 bg-white/90 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-muted-foreground">{label}</span>
        <span className={cn("grid h-10 w-10 place-items-center rounded-full", toneClass)}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p>
    </div>
  );
}
