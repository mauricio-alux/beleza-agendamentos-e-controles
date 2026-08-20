"use client";

import { forwardRef, useEffect, useRef, useState, type ForwardedRef, type MutableRefObject, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeedbackTone } from "@/lib/messages";

type FeedbackMessageProps = {
  tone?: FeedbackTone;
  title?: string;
  message?: ReactNode;
  className?: string;
  autoFocus?: boolean;
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

function isFullyVisible(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  return rect.top >= 0
    && rect.left >= 0
    && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
    && rect.right <= (window.innerWidth || document.documentElement.clientWidth);
}

function isEditingText() {
  const activeElement = document.activeElement;
  if (!activeElement) return false;

  const tagName = activeElement.tagName.toLowerCase();
  return tagName === "input"
    || tagName === "textarea"
    || activeElement.getAttribute("contenteditable") === "true";
}

function assignRefs<T>(value: T | null, refs: Array<ForwardedRef<T> | MutableRefObject<T | null>>) {
  refs.forEach((item) => {
    if (!item) return;
    if (typeof item === "function") {
      item(value);
      return;
    }
    item.current = value;
  });
}

export const FeedbackMessage = forwardRef<HTMLDivElement, FeedbackMessageProps>(function FeedbackMessage({
  tone = "info",
  title,
  message,
  className,
  autoFocus = true
}, ref) {
  const localRef = useRef<HTMLDivElement | null>(null);
  const previousMessageKeyRef = useRef("");
  const [isHighlighted, setIsHighlighted] = useState(false);

  useEffect(() => {
    const element = localRef.current;
    const messageKey = `${tone}|${title || ""}|${typeof message === "string" ? message : Boolean(message)}`;

    if (!autoFocus || !element || !messageKey.trim() || previousMessageKeyRef.current === messageKey) return;
    previousMessageKeyRef.current = messageKey;

    if (isEditingText()) return;

    if (!isFullyVisible(element)) {
      element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }

    window.setTimeout(() => {
      element.focus({ preventScroll: true });
    }, 180);

    setIsHighlighted(true);
    const timer = window.setTimeout(() => setIsHighlighted(false), 2600);
    return () => window.clearTimeout(timer);
  }, [autoFocus, message, title, tone]);

  if (!title && !message) return null;

  const Icon = icons[tone];

  return (
    <div
      ref={(node) => {
        localRef.current = node;
        assignRefs(node, [ref]);
      }}
      className={cn(
        "relative flex scroll-mt-28 gap-3 overflow-hidden rounded-2xl border px-4 py-3 pl-5 text-sm font-semibold leading-6 outline-none transition-shadow duration-500 focus-visible:ring-2 focus-visible:ring-primary/45",
        toneStyles[tone],
        isHighlighted && "ring-4 ring-primary/25",
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
