# Bellory

SaaS multi-tenant para profissionais da beleza, saloes, studios e autonomos.
O produto combina agenda inteligente, CRM operacional, WhatsApp como canal de
relacionamento e uma base futura para IA aplicada a operacao.

## Stack

- Frontend: Next.js, React, Tailwind e shadcn/ui
- Backend: Node.js
- Banco: Supabase/PostgreSQL
- Autenticacao: Supabase Auth + JWT
- Comunicacao: WhatsApp com modo automatico via Business API centralizada no
  SaaS e modo assistido para WhatsApp comum/Business App

## Documentacao mestre

- Contexto e diretrizes: `docs/project-context.md`
- Roadmap: `docs/roadmap.md`
- Regras de negocio: `docs/business/`
- Fluxos funcionais: `docs/flows/`
- Modulos: `docs/modules/`
- Decisoes arquiteturais: `docs/decisions/`
- Modos de entrega de campanhas WhatsApp:
  `docs/decisions/014-campanhas-whatsapp-modos-de-entrega.md`
- Primeiro convite via WhatsApp assistido:
  `docs/flows/primeiro-convite-whatsapp.md`
- Campanhas sugeridas por IA:
  `docs/decisions/015-campanhas-sugeridas-por-ia.md`

## Status atual

Fase 0.6C / RD-H10 consolidada em 30/09/2026: cenários somente cliente e somente
profissional com PASS físico; correção RD-H9.1 com PASS técnico e físico em
DEV/STAGING. Cenário de ambos os contextos da mesma pessoa ainda pendente.
Arquitetura, instalação e evidências: [Current State](docs/current-state.md).
Uma única PWA: `/app` é a entrada neutra/dispatcher; `/acesso`, o fluxo recorrente
cliente. O dispatcher não concede autorização.

### Histórico R1.6-B

R1.6-B concluída no escopo funcional em 22/09/2026. O acesso público parte de
`/agendar/[slug]`; `/acesso` é a entrada recorrente da PWA única do SaaS.
A arquitetura é tenant-first, sem identidade global do cliente: recuperação
por telefone + data de nascimento (DOB), TC restrito ao tenant e horários futuros
autorizados por cliente_id. Telefone sozinho não concede TC.

Android teve o fluxo recorrente aprovado no dispositivo moderno testado; iOS
teve recuperação/identificação aprovada no PWA standalone do dispositivo testado.
A variação visual residual no iOS é cosmética, não bloqueante e sem causa confirmada.

Staging: [pwa-staging](https://pwa-staging-production.up.railway.app), no projeto
Railway `pwa-dev-staging`, com gateway, frontend Next.js e backend Node.js.
O environment interno `production` desse projeto é DEV/STAGING, não produção comercial.
Checkpoint operacional e pendências: [Current State](docs/current-state.md).
Evidências: [relatório R1.6-B](docs/audits/20260918-r1-6-b-deploy-staging.md).

As etapas 6A a 7 estao documentadas como concluidas, incluindo landing page,
login, cadastro, onboarding, dashboard estrutural, dashboard operacional MVP e
motor inteligente de agendamento.

Em 2026-07-29, a Fase 8 do ajuste do MER de Servicos foi concluida. O MER
legado fisico (`servicos`, `servico_especialidades` e
`profissional_servicos`) foi removido do schema `public` apos backup remoto
validado. O novo MER de Servicos e agora a unica arquitetura operacional ativa,
baseada em `servicos_catalogo`, `servico_tenants`,
`servico_catalogo_especialidades`, `servico_tenant_especialidades` e
`profissional_servico_especialidades`.

Em 2026-08-05, a regra geral de disponibilizacao foi oficializada:
`servico_tenants` materializa todos os servicos permitidos pelos tipos ativos
do tenant, e `ativo` indica apenas se o tenant oferece o servico. A
sincronizacao oficial fica centralizada em
`tenant-service-catalog-sync.service.js`.

## Branding por ambiente

Nome, dominio e URLs publicas sao configurados por variaveis de ambiente.
Consulte `backend/.env.example`, `frontend/.env.example` e
`docs/modules/branding-configuravel.md`.
