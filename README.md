# Bellory

SaaS multi-tenant para profissionais da beleza, saloes, studios e autonomos.
O produto combina agenda inteligente, CRM operacional, WhatsApp como canal de
relacionamento e uma base futura para IA aplicada a operacao.

## Stack

- Frontend: Next.js, React, Tailwind e shadcn/ui
- Backend: Node.js
- Banco: Supabase/PostgreSQL
- Autenticacao: Supabase Auth + JWT
- Comunicacao: WhatsApp Business API centralizada no SaaS

## Documentacao mestre

- Contexto e diretrizes: `docs/project-context.md`
- Roadmap: `docs/roadmap.md`
- Regras de negocio: `docs/business/`
- Fluxos funcionais: `docs/flows/`
- Modulos: `docs/modules/`
- Decisoes arquiteturais: `docs/decisions/`

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
