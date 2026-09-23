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
dashboard operacional, WhatsApp operacional, campanhas e novo MER de Servicos
estao especificadas nos modulos e ADRs. A conexao remota com Supabase esta
vinculada ao projeto `Bellory` (`djbuzarzbpcpixudpnmg`).

Em 2026-07-29, a Fase 8 do ajuste do MER de Servicos foi concluida com backup
remoto validado em `backup_phase8_3_20260729_pre_drop`, migration
`20260729190000_remove_legacy_service_mer_phase8_3.sql` aplicada e remocao
fisica de `servicos`, `servico_especialidades` e `profissional_servicos` do
schema `public`. O novo MER de Servicos e a unica arquitetura operacional ativa.

Em 2026-07-30, a evolucao `3.1.3` adicionou tipos de negocio globais,
associacao N:N com `servicos_catalogo` e vinculo N:N com tenants por
`tenant_tipos_negocio`, mantendo um unico tipo principal ativo por tenant. A
segmentacao orienta recomendacoes de catalogo, mas nao cria ofertas
automaticamente nem altera agenda, profissionais ou historico.

Em 2026-08-02, a governanca `3.1.3.1` restringiu tenant a ativar somente
servicos permitidos pelos tipos ativos e consolidou MasterAdmin como unico
mantenedor de `tipos_negocio`, `servicos_catalogo`,
`tipo_negocio_servicos_catalogo` e `servico_catalogo_especialidades`.

Em 2026-08-05, a evolucao `3.1.3.1.4` oficializou que
`servico_tenants` representa todos os servicos disponibilizados ao tenant pelos
seus tipos ativos. O campo `ativo` passa a significar oferta efetiva do tenant,
nao disponibilidade. A sincronizacao `tenant_tipos_negocio ->
servico_tenants` fica centralizada em
`backend/src/modules/services/tenant-service-catalog-sync.service.js`.

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
  oculta, timeline diaria tenant-aware, identidade publica (agora telefone + DOB),
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
- Fase 8 do MER de Servicos: transicao concluida, legado fisico removido,
  validacao integrada aprovada e novo MER oficializado como arquitetura unica
- ADR-018: Tipos de negocio globais orientam recomendacoes do catalogo oficial
  por segmento, sem duplicar servicos canonicos nem criar catalogo por tenant

## Proxima etapa recomendada

Executar estabilizacao pre-producao sobre os fluxos ja migrados, priorizando:
cadastro, login, onboarding, configuracoes de servicos/especialidades, equipe,
agenda publica, dashboard operacional, RBAC, tenant isolation, WhatsApp
operacional, campanhas MVP e manutencao MasterAdmin.

## Acesso público, recorrente e PWA — estado em 22/09/2026

R1.6-B concluída funcionalmente; migrations e staging aprovados.
O checkpoint operacional está em [current-state.md](current-state.md).

- TENANT-FIRST: `/agendar/[slug]` inicia relação com estabelecimento;
  `/acesso` é a entrada recorrente com referências locais de tenants.
- Não existe identidade global do cliente. TC é tenant-scoped; cadastro
  compartilhado não implica autorização entre estabelecimentos.
- Telefone + DOB identificam/recuperam acesso. Telefone sozinho não concede TC.
- Upcoming usa cliente_id autorizado, sem expansão de autorização por telefone.
- Tokens são aditivos no fluxo aprovado; TC válido dispensa nova identificação.
- A PWA é única para o SaaS, não por tenant. Bootstrap/pairing/OTP avançado
  não é requisito do fluxo atual.
- Railway: projeto `pwa-dev-staging`, serviço `pwa-staging`, environment interno
  `production` exclusivo de DEV/STAGING, não produção comercial. Gateway integra
  frontend/backend com Supabase DEV existente.
- Android: fluxo recorrente fisicamente aprovado no dispositivo moderno testado.
- iOS: recuperação/identificação aprovada no PWA standalone testado, incluindo
  edição nativa de DOB, reenvio e limpeza do alerta. Scroll horizontal eliminado.
  Não generalizar para todas as versões/dispositivos.
- Variação visual residual no iOS é cosmética e não bloqueante. Hipótese de
  escala/auto-zoom ligada à tipografia ainda não confirmada; sem CSS especulativo.
- Próximos passos: estabilização e backlog específico do roadmap, incluindo
  hardening das policies de tokens_cliente; não reabrir gates sem mudança afetada.

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
- O novo MER de Servicos e fonte unica operacional; nao recriar dependencia nas
  tabelas legadas removidas.
- Tipos de negocio sao segmentacao/recomendacao global; nao sao categoria de
  servico, cargo, profissao, especialidade ou oferta comercial.
- Tenant nao cria nem altera catalogo canonico global; ofertas e configuracoes
  operacionais devem respeitar tipos ativos e compatibilidades globais.
- Nao usar ausencia de `servico_tenants` para indicar servico indisponivel:
  servicos permitidos pelos tipos ativos devem ser materializados como
  `ativo = false` quando ainda nao forem oferecidos.
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
