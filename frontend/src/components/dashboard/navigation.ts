import {
  BarChart3,
  CalendarDays,
  Megaphone,
  Scissors,
  Settings,
  Sparkles,
  UsersRound,
  WalletCards,
  UserRoundCog
} from "lucide-react";

export const dashboardNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { label: "Agenda", href: "/agenda", icon: CalendarDays },
  { label: "Clientes", href: "/clientes", icon: UsersRound },
  { label: "Servicos", href: "/servicos", icon: Scissors },
  { label: "Equipe", href: "/equipe", icon: UserRoundCog },
  { label: "Campanhas", href: "/campanhas", icon: Megaphone },
  { label: "Financeiro", href: "/financeiro", icon: WalletCards },
  { label: "Configuracoes", href: "/configuracoes", icon: Settings }
];

export const quickActions = [
  { label: "Novo agendamento", href: "/agenda", icon: CalendarDays },
  { label: "Novo cliente", href: "/clientes", icon: UsersRound },
  { label: "Novo servico", href: "/servicos", icon: Scissors },
  { label: "Nova campanha", href: "/campanhas", icon: Sparkles }
];
