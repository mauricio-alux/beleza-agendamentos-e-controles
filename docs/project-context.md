# Bellory - Contexto Mestre do Projeto

Bellory e um SaaS multi-tenant para profissionais da beleza, saloes, studios e
autonomos. O foco do produto e reduzir friccao operacional: agenda organizada,
clientes identificados, comunicacao via WhatsApp e uma base consistente para
CRM, campanhas, dashboard e IA.

## Stack

- Frontend: Next.js, React, Tailwind e shadcn/ui
- Backend: Node.js
- Banco: Supabase/PostgreSQL
- Autenticacao: Supabase Auth + JWT
- Comunicacao: WhatsApp Business API centralizada no SaaS, com fallback
  operacional por mensagens registradas

## Fluxo principal

Landing Page -> Cadastro -> Login -> Onboarding -> Dashboard -> Agenda

## Status atual

O projeto esta na fase de consolidacao e testes das entregas ja documentadas.
As bases de produto, multi-tenancy, RBAC, taxonomia, onboarding, agenda,
dashboard operacional e WhatsApp operacional estao especificadas nos modulos e
ADRs. A conexao remota com Supabase esta vinculada ao projeto `Bellory`
(`djbuzarzbpcpixudpnmg`) e as migrations locais/remotas foram conferidas como
alinhadas ate `20260714100000`.

## Etapas concluidas

- ETAPA-6A: Landing Page
- ETAPA-6B: Login
- ETAPA-6C: Onboarding interno
- ETAPA-6D: Cadastro SaaS
- ETAPA-6E: Dashboard estrutural
- ETAPA-6F: Dashboard operacional MVP com `/dashboard/summary`, cache curto e
  indicadores essenciais do ciclo operacional
- ETAPA-7: Motor Inteligente de Agendamento
- ETAPA-7H: Hardening operacional da Agenda, incluindo filtros sem selecao
  oculta, timeline diaria tenant-aware, identidade publica por telefone,
  recuperacao de agendamentos futuros e confirmacao extra para conclusao manual
- ETAPA-8.1.4.1: Comunicacao SaaS MasterAdmin para manutencao de
  `templates_mensagem` globais ou por tenant

## Proxima etapa recomendada

Executar testes das etapas ja concluidas, priorizando fluxos integrados:
cadastro, login, onboarding, agenda publica, dashboard operacional, RBAC,
tenant isolation, WhatsApp operacional, campanhas MVP e manutencao MasterAdmin.

## Direcao visual

Premium Vibrante Controlado:

- Primaria: #E26D7C
- Hover: #D85C6C
- Secundaria: #FFE8E2
- Destaque: #7B4BFF
- Fundo: #FFFDFC
- Texto: #2B2B2B

## Regras importantes

- Mobile-first como diretriz de produto e interface.
- Backend-first para regras de negocio, permissao, tenant isolation e calculos.
- Multi-tenant por padrao; toda entidade operacional deve respeitar
  `tenant_id`.
- RLS reforca isolamento no Supabase, mas repositories e services tambem devem
  ser tenant-aware.
- MasterAdmin e contexto de plataforma, nao administrador comum de salao.
- Manutencoes globais da plataforma ficam no Admin SaaS e exigem MasterAdmin.
- Taxonomia oficial Bellory e fonte principal para categorias, servicos,
  cargos e especialidades.
- WhatsApp e canal operacional, nao funil principal neste momento.
- Nao criar frontend pesado estilo ERP; priorizar simplicidade para publico com
  baixa maturidade digital.
