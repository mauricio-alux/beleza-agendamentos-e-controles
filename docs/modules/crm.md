# Identificacao Progressiva em Links Publicos

O CRM recebe clientes por links genericos de campanha e links individuais com
token. O WhatsApp normalizado identifica o cliente dentro do tenant, evitando
duplicacao no mesmo salao.

O vinculo `cliente_tenants` registra primeiro e ultimo acesso. Tokens publicos
sao aleatorios, expiram, permanecem associados ao tenant e sao armazenados
somente como hash. Nome, telefone e email nunca devem compor a URL.

Os eventos `acesso`, `identificacao`, `retorno` e `agendamento` alimentam a
atribuicao de campanha e a futura analise de conversao.

## Atualizacao por conclusao de atendimento

Quando um agendamento confirmado e concluido, manualmente ou pela rotina de
conclusao automatica da Agenda, o CRM passa a receber efeitos operacionais
diretos:

- `cliente_tenants.ultimo_atendimento` recebe a data/hora do atendimento.
- `cliente_tenants.qtd_atendimentos` e incrementado.
- `cliente_tenants.total_gasto` soma o valor do atendimento quando disponivel.
- `cliente_tenants.metadata.last_completed_appointment` guarda o resumo do
  ultimo atendimento concluido.
- `cliente_historico_atendimentos` recebe ou atualiza um registro operacional
  com chave unica por `tenant_id` e `agendamento_id`, contendo cliente,
  profissional, servico, data, status, valor quando aplicavel e origem
  `agenda`.
- `crm_interacoes` recebe uma interacao `atendimento_concluido`.
- `crm_scores` e atualizado para refletir compra/visita recente.

Quando o atendimento confirmado e marcado como `no_show`, a Agenda cria o
registro em `no_show_registros`, sincroniza
`cliente_historico_atendimentos.status = no_show`, atualiza
`cliente_tenants.data_ultimo_no_show` e `cliente_tenants.total_no_show`, grava
interacao `no_show` no CRM e reduz o score operacional do cliente. No-show nao
incrementa atendimento concluido nem valor gasto. O objetivo e preservar
historico e permitir futuras regras de risco, lembrete, recuperacao e
reputacao do cliente.

Para bases que ja tinham agendamentos antes da criacao dessa tabela, a
migration `20260702130000_backfill_client_operational_history.sql` preenche o
historico legado de forma idempotente. Ela considera apenas agendamentos
`concluido` e `no_show`, preserva `tenant_id`, usa o primeiro servico vinculado
ao agendamento quando disponivel e ignora registros ja existentes pela chave
`tenant_id + agendamento_id`.

---

O crm.md é um dos módulos mais estratégicos do Bellory porque ele representa a transformação da agenda em relacionamento contínuo.
Esse é um ponto extremamente importante:
A maioria dos pequenos salões usa:
•	agenda
•	WhatsApp
•	Instagram
Mas NÃO possui:
•	relacionamento estruturado
•	retenção
•	recorrência
•	inteligência comercial
O CRM do Bellory NÃO deve parecer:
•	CRM corporativo pesado
•	pipeline comercial complexo
•	ferramenta empresarial burocrática
Ele deve funcionar como:
•	CRM invisível
•	relacionamento automatizado
•	retenção inteligente
•	motor de recorrência
•	inteligência operacional simples
O usuário deve sentir:
“O Bellory me ajuda a trazer minhas clientes de volta automaticamente.”
Abaixo está a especificação consolidada profissional do módulo.
________________________________________
docs/modules/crm.md
# CRM Module — Bellory

# 1. Objetivo do Módulo

O módulo CRM é responsável por:

- gerenciar relacionamento com clientes
- aumentar retenção
- aumentar recorrência
- melhorar fidelização
- organizar histórico operacional
- alimentar campanhas
- gerar inteligência comercial

O objetivo principal é:
transformar clientes ocasionais em clientes recorrentes.

---

# 2. Papel Estratégico

O CRM é responsável por:

- relacionamento contínuo
- retenção automática
- inteligência operacional
- histórico cliente
- frequência operacional
- recuperação clientes

O CRM NÃO deve parecer:
- sistema corporativo complexo
- pipeline vendas tradicional
- CRM empresarial pesado

Deve parecer:
- assistente inteligente relacionamento
- automação invisível
- gestão simples clientes

---

# 3. Objetivo UX

O usuário deve sentir:

"O Bellory me ajuda a manter minhas clientes."

A experiência deve transmitir:
- simplicidade
- inteligência
- proximidade
- organização
- automação

---

# 4. Público-Alvo

O módulo foi projetado para:
- profissionais autônomos
- pequenos salões
- baixa maturidade tecnológica
- operação mobile-first

---

# 5. Conceito Arquitetural

O CRM deve funcionar como:

- camada relacionamento operacional
- central cliente
- núcleo retenção
- estrutura histórica inteligente

O CRM deve ser:
- automatizado
- invisível ao usuário
- integrado à agenda
- integrado WhatsApp
- orientado recorrência

---

# 6. Estrutura Backend

```text
backend/src/modules/crm/
  controllers/
  services/
  repositories/
  validators/
  routes/
  dto/
________________________________________
7. Estrutura Frontend
frontend/src/
  app/
    clientes/
  components/
    crm/
  hooks/
  services/
________________________________________
8. Rotas Frontend
Clientes
/clientes
________________________________________
Detalhes cliente
/clientes/[id]
________________________________________
9. Objetivos Operacionais
O CRM deve permitir:
•	visualizar clientes
•	acompanhar frequência
•	visualizar histórico
•	acompanhar retorno
•	identificar inatividade
•	alimentar campanhas
•	acompanhar relacionamento
________________________________________
10. Entidades Principais
Cliente
Representa:
•	cliente final
________________________________________
ClienteSalao
Representa:
•	relacionamento cliente/tenant
________________________________________
ClienteSalaoServico
Representa:
•	histórico operacional serviços
________________________________________
Agenda
Representa:
•	origem operacional relacionamento
________________________________________
Campanha
Representa:
•	ações relacionamento
________________________________________
11. Estrutura Cliente
Cada cliente deve possuir:
•	nome
•	WhatsApp
•	email futuro
•	histórico
•	frequência
•	última visita
•	serviços realizados
•	observações futuras
________________________________________
12. Histórico Operacional
O CRM deve registrar:
•	atendimentos
•	serviços realizados
•	profissional responsável
•	frequência
•	cancelamentos
•	no_show
•	reagendamentos
________________________________________
13. Frequência Cliente
O sistema deve calcular:
•	frequência média
•	tempo sem retorno
•	recorrência operacional
•	probabilidade retorno futura
________________________________________
14. Classificação Clientes
Futuro suporte para:
•	VIP
•	recorrente
•	inativo
•	risco abandono
•	novo cliente
•	alto valor
________________________________________
15. Timeline Cliente
Cada cliente deve possuir:
•	histórico cronológico
•	atendimentos
•	campanhas recebidas
•	interações futuras
•	observações futuras
________________________________________
16. Perfil Cliente
Tela cliente deve exibir:
•	informações básicas
•	histórico
•	próximos agendamentos
•	frequência
•	serviços favoritos
•	campanhas
•	observações futuras
________________________________________
17. KPIs CRM
Exibir:
•	clientes ativos
•	clientes recorrentes
•	clientes inativos
•	taxa retorno
•	frequência média
•	retenção
________________________________________
18. Integração Agenda
A Agenda alimenta automaticamente:
•	histórico cliente
•	frequência
•	recorrência
•	relacionamento
________________________________________
19. Integração WhatsApp
Preparar:
•	mensagens automáticas
•	recuperação clientes
•	campanhas
•	lembretes
•	follow-up
________________________________________
20. Integração Campaigns
O CRM deve:
•	segmentar clientes
•	alimentar campanhas
•	criar públicos
•	gerar listas inteligentes
________________________________________
21. Integração AI Engine
Futuro suporte para:
•	previsão retorno
•	previsão abandono
•	recomendações campanhas
•	clientes em risco
•	sugestões automáticas
________________________________________
22. APIs Backend
Listar clientes
GET /crm/clientes
________________________________________
Cliente detalhes
GET /crm/clientes/:id
________________________________________
Histórico cliente
GET /crm/clientes/:id/historico
________________________________________
KPIs CRM
GET /crm/kpis
________________________________________
Segmentações
GET /crm/segmentacoes
________________________________________
23. Hook Frontend
useCRM()
Responsável por:
•	carregar clientes
•	KPIs
•	filtros
•	timeline
•	segmentações
________________________________________
24. Service Frontend
crm.service.ts
Responsável por:
•	APIs
•	payloads
•	normalização
•	tratamento erros
________________________________________
25. Componentes Frontend
Estruturais
•	CRMLayout
•	CustomerProfile
•	CustomerTimeline
Operacionais
•	CustomerCard
•	CustomerHistory
•	CRMKPIs
•	CustomerTags
•	CustomerInsights
Estados
•	EmptyCRMState
________________________________________
26. Funcionalidades Frontend
Permitir:
•	visualizar clientes
•	pesquisar clientes
•	visualizar histórico
•	acompanhar frequência
•	visualizar retenção
•	filtrar clientes
•	segmentar clientes
________________________________________
27. Pesquisa Inteligente
Permitir pesquisa por:
•	nome
•	WhatsApp
•	frequência
•	última visita
•	profissional
•	serviço realizado
________________________________________
28. Segmentações
Preparar:
•	clientes ativos
•	clientes inativos
•	clientes VIP
•	aniversariantes
•	recorrentes
•	risco abandono
________________________________________
29. UX/UI
A experiência deve ser:
•	leve
•	amigável
•	intuitiva
•	organizada
•	acolhedora
Inspirado em:
•	Hubspot simplificado
•	Fresha
•	Notion
•	Linear
________________________________________
30. Mobile-First
Priorizar:
•	visual vertical
•	cards clientes
•	pesquisa rápida
•	navegação touch
•	baixa fricção
________________________________________
31. Desktop
Desktop deve:
•	utilizar grids modernos
•	timeline elegante
•	KPIs organizados
•	filtros simples
________________________________________
32. Estilo Visual
Utilizar:
•	cards modernos
•	glow discreto
•	micro animações
•	gradientes suaves
•	glassmorphism leve
Evitar:
•	tabelas pesadas
•	excesso corporativo
•	aparência ERP
________________________________________
33. Paleta Visual
Primária
#E26D7C
Hover
#D85C6C
Secundária
#FFE8E2
Destaque
#7B4BFF
Accent
#FFB3C1
Fundo
#FFFDFC
Texto
#2B2B2B
________________________________________
34. Segurança
Garantir:
•	autenticação JWT
•	proteção rotas
•	ownership validation
•	isolamento tenant
Nunca permitir:
•	acesso cross-tenant
•	vazamento dados clientes
________________________________________
35. Multi-Tenant
Toda operação deve respeitar:
•	tenant_id
•	ownership
•	permissões usuário
________________________________________
36. Privacidade
Preparar:
•	LGPD
•	anonimização futura
•	consentimento campanhas
•	opt-out WhatsApp
________________________________________
37. Tratamento de Erros
Nunca exibir:
•	SQL errors
•	stack traces
•	erros internos
Exibir:
•	"Não foi possível carregar clientes"
•	"Tente novamente"
________________________________________
38. Estados Operacionais
Loading
Exibir:
•	skeletons
•	shimmer
•	loading elegante
________________________________________
Empty State
Exibir:
•	incentivo operacional
•	mensagens amigáveis
Exemplo:
"Seus clientes aparecerão aqui."
________________________________________
Error State
Exibir:
•	retry simples
•	mensagens amigáveis
________________________________________
39. Polling e Realtime
MVP Inicial
Atualização:
•	polling leve
________________________________________
Futuro
Preparar:
•	realtime
•	atualizações instantâneas
•	notificações operacionais
________________________________________
40. Performance
Priorizar:
•	queries resumidas
•	paginação futura
•	lazy loading
•	filtros eficientes
•	cache futuro
________________________________________
41. Escalabilidade Futura
Arquitetura preparada para:
•	CRM avançado
•	funis relacionamento
•	gamificação clientes
•	marketplace
•	reputação clientes
•	loyalty system
•	IA preditiva
________________________________________
42. Objetivo Final
O módulo CRM deve representar:
•	retenção inteligente
•	relacionamento contínuo
•	fidelização automática
•	crescimento recorrente
O usuário deve sentir:
"O Bellory me ajuda a manter minhas clientes voltando."
