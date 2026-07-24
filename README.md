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
- Campanhas sugeridas por IA:
  `docs/decisions/015-campanhas-sugeridas-por-ia.md`

## Status atual

As etapas 6A a 7 estao documentadas como concluidas, incluindo landing page,
login, cadastro, onboarding, dashboard estrutural, dashboard operacional MVP e
motor inteligente de agendamento. A proxima frente recomendada e executar os
testes das etapas ja concluidas antes de ampliar CRM, WhatsApp operacional,
campanhas, IA e financeiro.

## Branding por ambiente

Nome, dominio e URLs publicas sao configurados por variaveis de ambiente.
Consulte `backend/.env.example`, `frontend/.env.example` e
`docs/modules/branding-configuravel.md`.
