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
  tenant: "Ajuste identidade, contato e dados públicos do negócio sem sair do fluxo operacional.",
  operation: "Defina parametros que ajudam a agenda a trabalhar melhor no dia a dia.",
  services: "A manutencao completa do catalogo continua no modulo de servicos.",
  specialties: "Consulte status, origem e vinculos das especialidades do salao.",
  role_specialties: "Mantenha cargos e competencias profissionais por cargo.",
  service_specialties: "Ajustes de serviço e especialidade ficam centralizados em Serviços.",
  team: "Usuários e profissionais ficam centralizados, sem sobrecarregar a home do dashboard.",
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
    title: "Operação preparada",
    description: "Parametros prontos para agenda, IA e WhatsApp.",
    icon: BellRing
  }
];
