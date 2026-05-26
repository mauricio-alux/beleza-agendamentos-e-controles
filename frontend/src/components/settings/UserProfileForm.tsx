"use client";

import { FormEvent, useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SettingsProfile } from "@/services/settings.service";

type UserProfileFormProps = {
  profile: SettingsProfile;
  isSaving: boolean;
  onSave: (payload: Partial<SettingsProfile>) => Promise<SettingsProfile | null>;
};

export function UserProfileForm({ profile, isSaving, onSave }: UserProfileFormProps) {
  const [nome, setNome] = useState(profile.nome || "");
  const [telefone, setTelefone] = useState(profile.telefone || "");

  useEffect(() => {
    setNome(profile.nome || "");
    setTelefone(profile.telefone || "");
  }, [profile]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSave({ nome, telefone });
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
          <Input id="profile-phone" value={telefone} onChange={(event) => setTelefone(event.target.value)} />
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
