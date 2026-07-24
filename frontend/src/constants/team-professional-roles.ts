import type { TeamUserRole } from "@/services/team.service";

export const TEAM_CARGO_CATEGORIES = {
  OPERATIONAL: "operacional",
  ADMINISTRATIVE: "administrativo"
} as const;
type TeamCargoCategory = (typeof TEAM_CARGO_CATEGORIES)[keyof typeof TEAM_CARGO_CATEGORIES];

export const TEAM_OPERATIONAL_ROLES: Array<{ value: TeamUserRole; label: string; description: string }> = [
  {
    value: "Funcionario",
    label: "Funcionario",
    description: "Profissional do nicho com vinculo direto, agenda, servicos, escala e comissao."
  },
  {
    value: "Terceiro",
    label: "Terceiro",
    description: "Profissional parceiro ou freelancer que atende clientes sob demanda."
  },
  {
    value: "Profissional Adm",
    label: "Profissional Adm",
    description: "Apoio administrativo ou operacional sem execucao de servicos de beleza."
  }
];

export const TEAM_OWNER_ROLES: Array<{ value: TeamUserRole; label: string; description: string }> = [
  {
    value: "Administrador",
    label: "Administrador",
    description: "Usuario principal do salao que tambem pode atuar no atendimento."
  },
  {
    value: "Autonomo",
    label: "Autonomo",
    description: "Usuario principal que obrigatoriamente executa servicos na propria agenda."
  }
];

export const TEAM_SERVICE_PROVIDER_ROLES: TeamUserRole[] = ["Administrador", "Autonomo", "Funcionario", "Terceiro"];

export const TEAM_ROLE_CARGO_CATEGORIES: Record<TeamUserRole, TeamCargoCategory[]> = {
  Administrador: [TEAM_CARGO_CATEGORIES.OPERATIONAL],
  Autonomo: [TEAM_CARGO_CATEGORIES.OPERATIONAL],
  Funcionario: [TEAM_CARGO_CATEGORIES.OPERATIONAL],
  Terceiro: [TEAM_CARGO_CATEGORIES.OPERATIONAL],
  "Profissional Adm": [TEAM_CARGO_CATEGORIES.ADMINISTRATIVE]
};

export function canTeamRoleExecuteServices(role: TeamUserRole) {
  return TEAM_SERVICE_PROVIDER_ROLES.includes(role);
}

export function canTeamRoleUseCargoCategory(role: TeamUserRole, category?: string | null) {
  return TEAM_ROLE_CARGO_CATEGORIES[role].includes((category || TEAM_CARGO_CATEGORIES.OPERATIONAL) as TeamCargoCategory);
}
