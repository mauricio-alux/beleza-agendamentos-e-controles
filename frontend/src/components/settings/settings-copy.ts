import {
  BellRing,
  BriefcaseBusiness,
  Building2,
  CreditCard,
  LockKeyhole,
  Scissors,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  UsersRound
} from "lucide-react";
import type { SettingsSectionId } from "@/services/settings.service";

export const settingsIconBySection = {
  profile: UserRound,
  tenant: Building2,
  operation: Settings2,
  services: Scissors,
  specialties: SlidersHorizontal,
  role_specialties: UsersRound,
  service_specialties: Scissors,
  team: UsersRound,
  subscription: CreditCard,
  security: LockKeyhole,
  platform: ShieldCheck
} satisfies Record<SettingsSectionId, typeof UserRound>;

export const settingsSectionHints = {
  profile: "Mantenha seus dados de acesso e contato sempre simples de revisar.",
  tenant: "Ajuste identidade, contato e dados publicos do negocio sem sair do fluxo operacional.",
  operation: "Defina parametros que ajudam a agenda a trabalhar melhor no dia a dia.",
  services: "A manutencao completa do catalogo continua no modulo de servicos.",
  specialties: "Ative ou pause o uso operacional das especialidades no salao.",
  role_specialties: "Revise quais especialidades pertencem a cada cargo.",
  service_specialties: "Controle quais especialidades podem executar cada servico.",
  team: "Usuarios e profissionais ficam centralizados, sem sobrecarregar a home do dashboard.",
  subscription: "Plano, limites e cobranca ficam agrupados em uma area discreta.",
  security: "Preferencias de acesso e protecao da conta.",
  platform: "Visao operacional da plataforma para MasterAdmin."
} satisfies Record<SettingsSectionId, string>;

export const settingsStatusItems = [
  {
    title: "Acesso limpo",
    description: "Entradas por header, sidebar e mobile nav.",
    icon: BriefcaseBusiness
  },
  {
    title: "Role-based",
    description: "Cada perfil ve apenas o que pode manter.",
    icon: ShieldCheck
  },
  {
    title: "Operacao preparada",
    description: "Parametros prontos para agenda, IA e WhatsApp.",
    icon: BellRing
  }
];
