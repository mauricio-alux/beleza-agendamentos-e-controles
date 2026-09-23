"use client";

import type { Ref } from "react";
import { PhoneCountry, PHONE_COUNTRIES, formatPhone, getPhoneCountry } from "@/utils/phone";

type PhoneInputProps = {
  value: string;
  onChange: (value: string) => void;
  country?: PhoneCountry;
  onCountryChange?: (country: PhoneCountry) => void;
  invalid?: boolean;
  ariaDescribedBy?: string;
  inputRef?: Ref<HTMLInputElement>;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
};

export function PhoneInput({
  value,
  onChange,
  country = "BR",
  onCountryChange,
  invalid = false,
  ariaDescribedBy,
  inputRef,
  disabled = false,
  required = false,
  id,
  name
}: PhoneInputProps) {
  const config = getPhoneCountry(country);

  return (
    <div className={`grid gap-2 rounded-2xl border bg-white/90 p-2 shadow-sm sm:grid-cols-[190px_1fr] ${
      invalid ? "border-primary" : "border-border"
    }`}>
      <select
        value={country}
        onChange={(event) => onCountryChange?.(event.target.value as PhoneCountry)}
        disabled={disabled}
        className="h-11 rounded-xl border border-border bg-white px-3 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        aria-label="Pais do telefone"
      >
        {PHONE_COUNTRIES.map((item) => (
          <option key={item.code} value={item.code}>
            {item.label} (+{item.dialCode})
          </option>
        ))}
      </select>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        disabled={disabled}
        required={required}
        aria-invalid={invalid || undefined}
        aria-describedby={ariaDescribedBy}
        value={value}
        onChange={(event) => onChange(formatPhone(event.target.value, country))}
        placeholder={config.placeholder}
        className="h-11 rounded-xl border border-border bg-white px-3 text-sm font-semibold text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}
