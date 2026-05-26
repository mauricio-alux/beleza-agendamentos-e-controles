"use client";

import { BUSINESS_TYPE_LABELS, BUSINESS_TYPES, type BusinessType } from "@/constants/business-types";
import { cn } from "@/lib/utils";

type BusinessTypeSelectProps = {
  id?: string;
  value: BusinessType | "";
  onChange: (value: BusinessType | "") => void;
  disabled?: boolean;
};

export function BusinessTypeSelect({ id = "business-type", value, onChange, disabled }: BusinessTypeSelectProps) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as BusinessType | "")}
      className={cn(
        "flex h-12 w-full rounded-2xl border border-input bg-white/90 px-4 py-3 text-sm text-foreground shadow-sm transition duration-200 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50"
      )}
    >
      <option value="">Selecione o tipo principal do seu negocio</option>
      {BUSINESS_TYPES.map((businessType) => (
        <option key={businessType} value={businessType}>
          {BUSINESS_TYPE_LABELS[businessType]}
        </option>
      ))}
    </select>
  );
}
