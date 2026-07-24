"use client";

import { FormEvent, useEffect, useState } from "react";
import { Save } from "lucide-react";
import { BusinessTypeSelect } from "@/components/settings/BusinessTypeSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import type { BusinessType } from "@/constants/business-types";
import type { SettingsTenant } from "@/services/settings.service";
import { formatStoredPhone, normalizePhoneToE164, type PhoneCountry } from "@/utils/phone";

type TenantProfileFormProps = {
  tenant: SettingsTenant;
  isSaving: boolean;
  onSave: (payload: Partial<SettingsTenant>) => Promise<SettingsTenant | null>;
};

export function TenantProfileForm({ tenant, isSaving, onSave }: TenantProfileFormProps) {
  const [nomeFantasia, setNomeFantasia] = useState(tenant.nome_fantasia || "");
  const [businessType, setBusinessType] = useState<BusinessType | "">(tenant.business_type || "");
  const [email, setEmail] = useState(tenant.email || "");
  const [telefone, setTelefone] = useState(formatStoredPhone(tenant.telefone));
  const [phoneCountry, setPhoneCountry] = useState<PhoneCountry>("BR");
  const [timezone, setTimezone] = useState(tenant.timezone || "America/Sao_Paulo");

  useEffect(() => {
    setNomeFantasia(tenant.nome_fantasia || "");
    setBusinessType(tenant.business_type || "");
    setEmail(tenant.email || "");
    setTelefone(formatStoredPhone(tenant.telefone));
    setTimezone(tenant.timezone || "America/Sao_Paulo");
  }, [tenant]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave({
      nome_fantasia: nomeFantasia,
      business_type: businessType || null,
      email: email || null,
      telefone: telefone ? normalizePhoneToE164(telefone, phoneCountry) : null,
      timezone
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tenant-name">Nome do negocio</Label>
          <Input id="tenant-name" value={nomeFantasia} onChange={(event) => setNomeFantasia(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tenant-kind">Tipo de negocio</Label>
          <BusinessTypeSelect id="tenant-kind" value={businessType} onChange={setBusinessType} disabled={isSaving} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tenant-email">Email comercial</Label>
          <Input id="tenant-email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tenant-phone">Telefone comercial</Label>
          <PhoneInput id="tenant-phone" value={telefone} onChange={setTelefone} country={phoneCountry} onCountryChange={(country) => {
            setPhoneCountry(country);
            setTelefone("");
          }} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tenant-timezone">Fuso horario</Label>
          <Input id="tenant-timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tenant-slug">Link publico</Label>
          <Input id="tenant-slug" value={tenant.slug} disabled />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>
          <Save className="h-4 w-4" />
          {isSaving ? "Salvando..." : "Salvar salao"}
        </Button>
      </div>
    </form>
  );
}
