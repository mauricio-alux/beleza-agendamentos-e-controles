"use client";

import { FormEvent, useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import type { SettingsProfile } from "@/services/settings.service";
import { formatStoredPhone, normalizePhoneToE164, type PhoneCountry } from "@/utils/phone";

type UserProfileFormProps = {
  profile: SettingsProfile;
  isSaving: boolean;
  onSave: (payload: Partial<SettingsProfile>) => Promise<SettingsProfile | null>;
};

export function UserProfileForm({ profile, isSaving, onSave }: UserProfileFormProps) {
  const [nome, setNome] = useState(profile.nome || "");
  const [telefone, setTelefone] = useState(formatStoredPhone(profile.telefone));
  const [phoneCountry, setPhoneCountry] = useState<PhoneCountry>("BR");

  useEffect(() => {
    setNome(profile.nome || "");
    setTelefone(formatStoredPhone(profile.telefone));
  }, [profile]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave({ nome, telefone: telefone ? normalizePhoneToE164(telefone, phoneCountry) : null });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="profile-name">Nome</Label>
          <Input id="profile-name" value={nome} onChange={(event) => setNome(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-phone">Telefone</Label>
          <PhoneInput id="profile-phone" value={telefone} onChange={setTelefone} country={phoneCountry} onCountryChange={(country) => {
            setPhoneCountry(country);
            setTelefone("");
          }} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="profile-email">Email</Label>
          <Input id="profile-email" value={profile.email} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-role">Perfil de acesso</Label>
          <Input id="profile-role" value={profile.tipo_usuario} disabled />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>
          <Save className="h-4 w-4" />
          {isSaving ? "Salvando..." : "Salvar perfil"}
        </Button>
      </div>
    </form>
  );
}
