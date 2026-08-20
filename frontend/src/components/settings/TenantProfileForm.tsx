"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { useAuth } from "@/hooks/useAuth";
import { getErrorMessage } from "@/lib/messages";
import {
  BusinessTypesApiError,
  businessTypesService,
  type BusinessType,
  type TenantBusinessType
} from "@/services/business-types.service";
import type { SettingsTenant } from "@/services/settings.service";
import { formatStoredPhone, normalizePhoneToE164, type PhoneCountry } from "@/utils/phone";

type TenantProfileFormProps = {
  tenant: SettingsTenant;
  isSaving: boolean;
  onSave: (payload: Partial<SettingsTenant>) => Promise<SettingsTenant | null>;
};

export function TenantProfileForm({ tenant, isSaving, onSave }: TenantProfileFormProps) {
  const { session } = useAuth();
  const [nomeFantasia, setNomeFantasia] = useState(tenant.nome_fantasia || "");
  const [activeTypes, setActiveTypes] = useState<BusinessType[]>([]);
  const [tenantTypes, setTenantTypes] = useState<TenantBusinessType[]>([]);
  const [principalTypeId, setPrincipalTypeId] = useState("");
  const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);
  const [descricaoTipoNegocio, setDescricaoTipoNegocio] = useState("");
  const [typesError, setTypesError] = useState("");
  const [email, setEmail] = useState(tenant.email || "");
  const [telefone, setTelefone] = useState(formatStoredPhone(tenant.telefone));
  const [phoneCountry, setPhoneCountry] = useState<PhoneCountry>("BR");
  const [timezone, setTimezone] = useState(tenant.timezone || "America/Sao_Paulo");
  const selectedPrincipal = activeTypes.find((item) => item.id === principalTypeId) || null;

  function extractBusinessTypeError(error: unknown) {
    if (error instanceof BusinessTypesApiError && error.code === "TENANT_BUSINESS_TYPE_REMOVAL_IMPACT") {
      const details = error.details as { servicos_afetados?: Array<{ nome?: string | null }> } | null;
      const services = (details?.servicos_afetados || []).map((item) => item.nome).filter(Boolean);
      return services.length
        ? `Não foi possível remover alguns tipos de negócio porque existem serviços vinculados exclusivamente a eles: ${services.join(", ")}.`
        : error.message;
    }

    return getErrorMessage(error, "Não foi possível salvar os tipos de negócio.");
  }

  useEffect(() => {
    setNomeFantasia(tenant.nome_fantasia || "");
    setEmail(tenant.email || "");
    setTelefone(formatStoredPhone(tenant.telefone));
    setTimezone(tenant.timezone || "America/Sao_Paulo");
  }, [tenant]);

  useEffect(() => {
    if (!session) return;
    let active = true;
    setTypesError("");
    Promise.all([businessTypesService.listActive(), businessTypesService.listTenantTypes(session)])
      .then(([types, current]) => {
        if (!active) return;
        const rows = current || [];
        const principal = rows.find((item) => item.ativo !== false && item.principal) || rows.find((item) => item.ativo !== false);
        setActiveTypes(types || []);
        setTenantTypes(rows);
        setPrincipalTypeId(principal?.tipo_negocio_id || "");
        setSelectedTypeIds(rows.filter((item) => item.ativo !== false && item.tipo_negocio_id !== principal?.tipo_negocio_id).map((item) => item.tipo_negocio_id));
        setDescricaoTipoNegocio(principal?.descricao_tipo_negocio || "");
      })
      .catch((err) => {
        if (active) setTypesError(getErrorMessage(err, "Não foi possível carregar tipos de negócio."));
      });

    return () => {
      active = false;
    };
  }, [session?.access_token]);

  function toggleComplementary(id: string) {
    setSelectedTypeIds((current) => {
      if (id === principalTypeId) return current;
      return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !principalTypeId) {
      setTypesError("Escolha um tipo principal de negocio.");
      return;
    }

    try {
      await businessTypesService.updateTenantTypes(session, {
        principal_tipo_negocio_id: principalTypeId,
        tipo_negocio_ids: [...new Set(selectedTypeIds.filter((id) => id && id !== principalTypeId))],
        descricao_tipo_negocio: selectedPrincipal?.slug === "outro" ? descricaoTipoNegocio.trim() || null : null
      });

      const updatedTenantTypes = await businessTypesService.listTenantTypes(session);
      const rows = updatedTenantTypes || [];
      const principal = rows.find((item) => item.ativo !== false && item.principal) || rows.find((item) => item.ativo !== false);
      setTenantTypes(rows);
      setPrincipalTypeId(principal?.tipo_negocio_id || principalTypeId);
      setSelectedTypeIds(rows.filter((item) => item.ativo !== false && item.tipo_negocio_id !== principal?.tipo_negocio_id).map((item) => item.tipo_negocio_id));
      setTypesError("");
    } catch (error) {
      setTypesError(extractBusinessTypeError(error));
      return;
    }

    await onSave({
      nome_fantasia: nomeFantasia,
      email: email || null,
      telefone: telefone ? normalizePhoneToE164(telefone, phoneCountry) : null,
      timezone
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tenant-name">Nome do negócio</Label>
          <Input id="tenant-name" value={nomeFantasia} onChange={(event) => setNomeFantasia(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tenant-kind">Tipo principal de negócio</Label>
          <select
            id="tenant-kind"
            value={principalTypeId}
            onChange={(event) => {
              const id = event.target.value;
              setPrincipalTypeId(id);
              setSelectedTypeIds((current) => current.filter((item) => item && item !== id));
            }}
            disabled={isSaving}
            className="h-12 w-full rounded-2xl border border-input bg-white/90 px-4 text-sm font-semibold text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:bg-muted/60"
          >
            <option value="">Selecione o tipo principal</option>
            {activeTypes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedPrincipal?.slug === "outro" ? (
        <div className="space-y-2">
          <Label htmlFor="tenant-kind-description">Descrição do tipo de negócio</Label>
          <Input id="tenant-kind-description" value={descricaoTipoNegocio} onChange={(event) => setDescricaoTipoNegocio(event.target.value)} />
        </div>
      ) : null}

      <div className="space-y-2">
        <Label>Tipos complementares</Label>
        <div className="flex flex-wrap gap-2">
          {activeTypes.filter((item) => item.id !== principalTypeId).map((item) => {
            const checked = selectedTypeIds.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                disabled={isSaving}
                onClick={() => toggleComplementary(item.id)}
                className={`rounded-full border px-3 py-2 text-xs font-bold transition ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white text-muted-foreground hover:border-primary/40 hover:text-primary"} disabled:opacity-80`}
              >
                {checked ? <Check className="mr-1 inline h-3 w-3" /> : null}
                {item.nome}
              </button>
            );
          })}
        </div>
        {typesError ? <p className="text-sm font-semibold text-primary">{typesError}</p> : null}
        {tenantTypes.length ? <p className="text-xs text-muted-foreground">{tenantTypes.filter((item) => item.ativo !== false).length} tipo(s) vinculados ao estabelecimento.</p> : null}
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
          <Label htmlFor="tenant-timezone">Fuso horário</Label>
          <Input id="tenant-timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tenant-slug">Link público</Label>
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
