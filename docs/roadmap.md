# Roadmap Bellory

## Concluido

- 6A - Landing Page
- 6B - Login
- 6C - Onboarding interno
- 6D - Cadastro SaaS
- 6E - Dashboard estrutural
- 6F - Dashboard operacional MVP com `/dashboard/summary`, cache curto e
  indicadores essenciais do ciclo operacional
- 7 - Motor Inteligente de Agendamento
- 7H - Hardening operacional da Agenda: filtros sem selecao oculta, timeline
  diaria tenant-aware, identidade publica por telefone, recuperacao imediata
  de agendamentos futuros e confirmacao extra para conclusao manual antecipada
- 8.1.4.1 - Tela MasterAdmin de Comunicacao para manter
  `templates_mensagem` globais ou por tenant

## Proximo

- Testes das etapas ja concluidas
- Validacao integrada com Supabase remoto, RBAC, tenant isolation e fluxos
  publicos de agendamento
- Revisao dos cenarios criticos de WhatsApp operacional, campanhas MVP e
  dashboard operacional antes de novas frentes funcionais

## Depois

- 8 - CRM Base
- 9 - Gestao operacional do salao
- 10 - WhatsApp operacional
- 11 - Dashboard real com KPIs
- 12 - Campanhas
- 13 - IA
- 14 - Financeiro
- 15 - Dashboard cliente
- 16 - Escalabilidade SaaS

## Cuidados permanentes

- Manter arquitetura backend-first para regras, permissoes e calculos.
- Manter mobile-first como padrao de UX.
- Preservar isolamento multi-tenant em services, repositories, cache, filas,
  realtime, storage e dashboards.
- Tratar MasterAdmin como contexto de plataforma, com suporte/auditoria quando
  acessar dados de tenant.
- Evoluir taxonomia por fluxo controlado, sem misturar dados globais com dados
  operacionais de tenant.
- Nao depender apenas de RLS quando o backend usa service role; o codigo tambem
  precisa filtrar por tenant.
