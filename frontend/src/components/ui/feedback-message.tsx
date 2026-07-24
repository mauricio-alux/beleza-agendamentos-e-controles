import { forwardRef } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeedbackTone } from "@/lib/messages";

type FeedbackMessageProps = {
  tone?: FeedbackTone;
  title?: string;
  message?: string;
  className?: string;
};

const toneStyles: Record<FeedbackTone, string> = {
  error: "border-destructive/35 bg-gradient-to-r from-red-50 via-white to-white text-foreground shadow-[0_14px_34px_rgba(220,38,38,0.16)] ring-1 ring-destructive/15",
  warning: "border-amber-400 bg-gradient-to-r from-amber-100 via-yellow-50 to-white text-amber-950 shadow-[0_14px_34px_rgba(245,158,11,0.24)] ring-1 ring-amber-300/60",
  success: "border-emerald-400/70 bg-gradient-to-r from-emerald-50 via-white to-white text-emerald-950 shadow-[0_14px_34px_rgba(16,185,129,0.16)] ring-1 ring-emerald-300/40",
  info: "border-primary/25 bg-gradient-to-r from-secondary/80 via-white to-white text-foreground shadow-[0_12px_28px_rgba(226,109,124,0.12)] ring-1 ring-primary/10"
};

const iconStyles: Record<FeedbackTone, string> = {
  error: "bg-destructive text-white",
  warning: "bg-amber-500 text-white",
  success: "bg-emerald-500 text-white",
  info: "bg-primary text-white"
};

const accentStyles: Record<FeedbackTone, string> = {
  error: "bg-destructive",
  warning: "bg-amber-500",
  success: "bg-emerald-500",
  info: "bg-primary"
};

const icons = {
  error: AlertCircle,
  warning: TriangleAlert,
  success: CheckCircle2,
  info: Info
};

export const FeedbackMessage = forwardRef<HTMLDivElement, FeedbackMessageProps>(function FeedbackMessage({ tone = "info", title, message, className }, ref) {
  if (!title && !message) return null;

  const Icon = icons[tone];

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex scroll-mt-28 gap-3 overflow-hidden rounded-2xl border px-4 py-3 pl-5 text-sm font-semibold leading-6 outline-none focus-visible:ring-2 focus-visible:ring-primary/45",
        toneStyles[tone],
        className
      )}
      tabIndex={-1}
      role={tone === "error" || tone === "warning" ? "alert" : "status"}
      aria-live={tone === "error" || tone === "warning" ? "assertive" : "polite"}
    >
      <span className={cn("absolute inset-y-3 left-0 w-1 rounded-r-full", accentStyles[tone])} aria-hidden="true" />
      <span className={cn("mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-full shadow-sm", iconStyles[tone])}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        {title ? <p className="font-bold">{title}</p> : null}
        {message ? <p className={cn(title && "mt-0.5")}>{message}</p> : null}
      </div>
    </div>
  );
});
