# Roadmap Bellory

## Concluido

- R1.6-B — CONCLUÍDA funcionalmente: migrations, gateway/staging, recuperação
  telefone + DOB, TC tenant-scoped aditivo, C0/C1/CN, cliente existente/novo,
  repetição sem duplicidade e upcoming por cliente_id, sem autorização por telefone.
  Android recorrente aprovado no dispositivo moderno testado; iOS recuperação
  aprovada no PWA standalone testado. Edição/reenvio e limpeza do alerta aprovados;
  scroll horizontal eliminado. PWA única tenant-first do SaaS.

- 6A - Landing Page
- 6B - Login
- 6C - Onboarding interno
- 6D - Cadastro SaaS
- 6E - Dashboard estrutural
- 6F - Dashboard operacional MVP com `/dashboard/summary`, cache curto e
  indicadores essenciais do ciclo operacional
- 7 - Motor Inteligente de Agendamento
- 7H - Hardening operacional da Agenda: filtros sem selecao oculta, timeline
  diaria tenant-aware, identidade publica (agora telefone + DOB), recuperacao imediata
  de agendamentos futuros e confirmacao extra para conclusao manual antecipada
- 8.1.4.1 - Tela MasterAdmin de Comunicacao para manter
  `templates_mensagem` globais ou por tenant
- ADR-014 - Diretriz de campanhas WhatsApp por modo de entrega do tenant:
  automatico via Business API ou assistido via WhatsApp comum/Business App
- Fluxo de primeiro convite via WhatsApp assistido documentado e refletido no
  onboarding inicial
- ADR-015 - Campanhas sugeridas por IA/regras, aprovadas e parametrizadas pelo
  tenant antes da execucao
- Fase 8 - Novo MER de Servicos concluido: backup pre-DROP validado, legado
  fisico removido e validacao integrada aprovada
- 3.1.3.1.4 - Regra geral de disponibilizacao de servicos aos tenants:
  `servico_tenants` materializa catalogo permitido por tipos ativos, com
  sincronizacao centralizada, auditoria e reconciliacao

## Proximo

- Resolver gate de checkpoint Git se houver origem incerta nas alterações
  acumuladas; ver [current-state.md](current-state.md).
- Hardening específico das policies RLS de `tokens_cliente`, em tarefa própria.
- Coordenação de rate limit para múltiplas instâncias e governança do perfil
  compartilhado, conforme backlog da implementação R1.6-B.
- Investigar/padronizar futuramente tipografia e escala de inputs mobile.
  Variação residual iOS cosmética, não bloqueante e sem causa comprovada.
- Usar gates R1.6-B como baseline; repetir somente validações afetadas por mudanças.

- Estabilizacao pre-producao das etapas ja concluidas
- Validacao recorrente com Supabase remoto, RBAC, tenant isolation e fluxos
  publicos de agendamento sobre o novo MER
- Revisao dos cenarios criticos de WhatsApp operacional, campanhas MVP e
  dashboard operacional antes de novas frentes funcionais
- Validar em navegadores/dispositivos reais a experiencia do primeiro convite:
  copiar mensagem, copiar link, compartilhar e abrir WhatsApp.
- Evoluir padroes reutilizaveis de parametrizacao de campanhas e indicadores
  de desempenho para alimentar novas sugestoes da IA.

## Depois

- Bootstrap/pairing/OTP avançado: evolução opcional, não requisito da PWA atual.

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
- Tratar modo de entrega WhatsApp como capacidade do tenant, mantendo campanha
  como entidade unica.
- No modo assistido por WhatsApp comum/Business App, registrar no maximo
  preparacao/confirmacao manual, nunca entrega/leitura/falha tecnica.
- Separar ativacao inicial de relacionamento continuo: primeiro convite pode
  usar WhatsApp App/Business App manual; campanhas recorrentes usam a base ja
  conhecida pelo Bellory.
- Nao acoplar regra de campanha ao canal de entrega; Cloud API, WhatsApp App,
  infraestrutura do SaaS e canais futuros devem ser capacidades de execucao.
- Tratar MasterAdmin como contexto de plataforma, com suporte/auditoria quando
  acessar dados de tenant.
- Evoluir taxonomia por fluxo controlado, sem misturar dados globais com dados
  operacionais de tenant.
- Nao depender apenas de RLS quando o backend usa service role; o codigo tambem
  precisa filtrar por tenant.
- Centralizar a regra `tenant_tipos_negocio -> servico_tenants` no
  sincronizador oficial; Agenda, Booking, Campanhas, CRM e Cupons devem usar
  somente servicos ativos, nao apenas disponibilizados.
