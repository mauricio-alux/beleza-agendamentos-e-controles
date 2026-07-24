"use client";

import { useId } from "react";
import { Info } from "lucide-react";
import { Label } from "@/components/ui/label";

type FieldLabelProps = {
  htmlFor?: string;
  label: string;
  help: string;
};

export function FieldLabel({ htmlFor, label, help }: FieldLabelProps) {
  const tooltipId = useId();

  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      <span className="group relative inline-flex">
        <button
          type="button"
          aria-label={`Ajuda sobre ${label}`}
          aria-describedby={tooltipId}
          className="grid h-5 w-5 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-primary focus-visible:bg-secondary focus-visible:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
        <span
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-72 max-w-[calc(100vw-3rem)] -translate-x-1/2 rounded-xl border border-border bg-white px-3 py-2 text-xs font-medium leading-5 text-foreground shadow-xl group-hover:block group-focus-within:block"
        >
          {help}
        </span>
      </span>
    </div>
  );
}
