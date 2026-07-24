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
- Comunicacao: WhatsApp Business API centralizada no SaaS para modo automatico,
  com modo assistido para tenants que usam WhatsApp comum ou WhatsApp Business
  App sem Cloud API

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
- ADR-014: Campanhas WhatsApp devem variar por modo de entrega do tenant:
  automatico via Business API ou assistido via WhatsApp comum/Business App com
  suporte operacional a Lista de Transmissao
- Fluxo de primeiro convite via WhatsApp assistido documentado em
  `docs/flows/primeiro-convite-whatsapp.md`
- ADR-015: Campanhas deixam de depender apenas da criacao manual e passam a
  seguir ciclo de sugestao por IA/regras, aprovacao do tenant,
  parametrizacao, execucao e analise de resultados

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
- Campanha e entidade unica; o modo de entrega muda conforme a capacidade
  WhatsApp do tenant.
- WhatsApp comum/Business App pode ser atendido por modo assistido, mas sem
  prometer envio automatico, entrega, leitura ou webhook.
- Primeiro convite e ativacao inicial: nao exigir importacao de contatos nem
  cadastro previo; criar/vincular cliente apenas no primeiro acesso identificado
  ou agendamento publico.
- Tenants com WhatsApp Business App + Cloud API em coexistencia tambem podem
  usar o modo assistido para o primeiro convite.
- Campanhas sugeridas por IA ou MasterAdmin exigem aprovacao e parametrizacao
  do tenant antes de oferta comercial ou execucao.
- Separar campanha de canal: campanha define estrategia/publico/mensagem; canal
  define forma de entrega e rastreabilidade.
- Nao criar frontend pesado estilo ERP; priorizar simplicidade para publico com
  baixa maturidade digital.
