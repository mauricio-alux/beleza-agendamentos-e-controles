O dashboard.md pode ser tratado como um dos principais documentos estruturais do Bellory, porque ele representa:
•	HUB operacional central
•	camada de inteligência operacional
•	ponto principal de navegação
•	gateway de expansão analítica futura
•	núcleo visual da experiência SaaS
Abaixo está a especificação profissional consolidada do módulo.
________________________________________
docs/modules/dashboard.md
# Dashboard Module — Bellory

## 1. Objetivo do Módulo

O módulo Dashboard é o HUB operacional central do Bellory.

Seu objetivo é consolidar:
- operação diária
- visão executiva
- navegação principal
- indicadores operacionais
- ações rápidas
- visão resumida dos módulos

O Dashboard NÃO deve funcionar como:
- ERP complexo
- painel burocrático
- sistema técnico pesado

O Dashboard deve transmitir:
- simplicidade
- modernidade
- profissionalismo
- organização
- automação
- crescimento operacional

# 2. Papel Estratégico

O Dashboard é:
- principal ponto de entrada operacional
- centro de navegação do sistema
- painel executivo simplificado
- camada visual do negócio
- interface principal do usuário

O Dashboard centraliza:
- agenda
- clientes
- serviços
- campanhas
- financeiro
- indicadores
- notificações
- atividades recentes

# 3. Objetivos de UX

O Dashboard deve fazer o usuário sentir:

"Meu negócio agora é profissional."

A experiência deve transmitir:
- facilidade operacional
- clareza
- controle
- velocidade
- organização automática

# 4. Público-Alvo

O módulo foi projetado para:

- profissionais autônomos
- pequenos salões
- profissionais com baixa maturidade tecnológica
- usuários mobile-first

---

# 5. Conceito Arquitetural

O Dashboard deve funcionar como:

- camada agregadora de dados
- consumidor resumido dos módulos
- interface desacoplada
- estrutura preparada para analytics futuro

O Dashboard NÃO deve:
- conter regras pesadas de negócio
- centralizar lógica operacional
- executar cálculos complexos diretamente

As regras devem permanecer:
- nos módulos específicos
- nos serviços backend
- nas engines operacionais

---

# 6. Estrutura Geral

## Frontend

```text
frontend/src/
  app/
    dashboard/
  components/
    dashboard/
  layouts/
  hooks/
  services/
Backend
backend/src/modules/dashboard/
________________________________________
7. Rotas Frontend
Principal
/dashboard
Rotas futuras integradas
/agenda
/clientes
/servicos
/equipe
/campanhas
/financeiro
/configuracoes
________________________________________
8. Estrutura Visual
8.1 Header Superior
Exibir:
•	nome do salão
•	avatar usuário
•	notificações
•	acesso perfil
•	logout
________________________________________
8.2 Sidebar Desktop
Itens:
•	Dashboard
•	Agenda
•	Clientes
•	Serviços
•	Equipe
•	Campanhas
•	Financeiro
•	Configurações
________________________________________
8.3 Bottom Navigation Mobile
Objetivo:
•	navegação rápida touch
•	experiência mobile-first
________________________________________
9. Componentes Principais
Estruturais
•	DashboardLayout
•	TopHeader
•	Sidebar
•	MobileBottomNav
Widgets
•	KPIWidget
•	DashboardCard
•	ActivityFeed
•	WelcomeBanner
•	QuickActions
•	EmptyState
Operacionais
•	AgendaPreview
•	NextAppointments
•	NotificationsCenter
•	CampaignPreview
________________________________________
10. KPIs Operacionais
KPIs iniciais
•	faturamento hoje
•	clientes ativos
•	ocupação
•	atendimentos do dia
•	próximos atendimentos
Características
Os KPIs devem:
•	ser resumidos
•	rápidos
•	visuais
•	fáceis de entender
Evitar:
•	excesso numérico
•	excesso gráfico
•	aparência analítica pesada
________________________________________
11. Atualização de Dados
MVP Inicial
Atualização via:
•	polling periódico
Estratégia:
•	refresh automático leve
•	intervalos controlados
•	baixo consumo
________________________________________
Preparação futura
Arquitetura preparada para:
•	websocket
•	realtime
•	event-driven updates
•	filas
•	pub/sub
•	streaming operacional
________________________________________
12. Dashboard Adaptativo por Role
O Dashboard deve adaptar:
•	widgets
•	navegação
•	permissões
•	indicadores
conforme o tipo de usuário.
________________________________________
13. Roles
Administrador
Visualiza:
•	operação do salão
•	equipe
•	campanhas
•	financeiro
•	KPIs completos
________________________________________
Autônomo
Visualiza:
•	agenda pessoal
•	clientes próprios
•	ganhos próprios
•	campanhas pessoais
________________________________________
Cliente
Visualiza:
•	próximos agendamentos
•	histórico
•	promoções
•	notificações
•	reagendamentos
________________________________________
MasterAdmin
Visualiza:
•	tenants
•	métricas globais
•	faturamento SaaS
•	usuários ativos
•	métricas plataforma
•	saúde operacional
________________________________________
14. Integrações
O Dashboard consome dados resumidos dos módulos:
•	Agenda
•	CRM
•	WhatsApp
•	Campaigns
•	Financeiro
•	AI Engine
________________________________________
15. Integração Agenda
Consumir:
•	agenda do dia
•	próximos atendimentos
•	status operacional
•	ocupação
________________________________________
16. Integração CRM
Consumir:
•	clientes ativos
•	retenção
•	frequência
•	aniversariantes
•	retorno previsto
________________________________________
17. Integração WhatsApp
Consumir:
•	mensagens enviadas
•	confirmações
•	lembretes
•	status operacional
________________________________________
18. Integração Campaigns
Consumir:
•	campanhas ativas
•	campanhas futuras
•	engajamento
•	promoções
________________________________________
19. Integração AI Engine
Futuro:
•	insights automáticos
•	recomendações
•	previsão de cancelamentos
•	previsão de retorno
•	sugestões operacionais
________________________________________
20. Layout Mobile-First
O Dashboard deve priorizar:
•	uso vertical
•	navegação touch
•	leitura rápida
•	cards empilhados
•	baixa fricção
________________________________________
21. Layout Desktop
Desktop deve:
•	utilizar sidebar elegante
•	grids modernos
•	widgets organizados
•	visual premium clean
________________________________________
22. Estilo Visual
Inspirado em:
•	Linear
•	Stripe
•	Notion
•	Calendly
•	Hubspot
________________________________________
23. Paleta Visual
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
24. Diretrizes Visuais
Utilizar:
•	glassmorphism leve
•	glow discreto
•	gradientes suaves
•	sombras premium
•	micro animações
•	transições suaves
Evitar:
•	excesso visual
•	tabelas pesadas
•	aparência ERP
•	poluição visual
________________________________________
25. Segurança
O Dashboard deve:
•	exigir autenticação JWT
•	validar tenant
•	validar ownership
•	proteger rotas
•	impedir acesso cross-tenant
________________________________________
26. Multi-Tenant
Todo dado exibido deve respeitar:
•	tenant_id
•	permissões
•	escopo do usuário
Nunca permitir:
•	vazamento cross-tenant
•	consultas globais indevidas
________________________________________
27. Performance
Priorizar:
•	queries resumidas
•	lazy loading
•	cache futuro
•	paginação futura
•	carregamento progressivo
________________________________________
28. APIs Backend
MVP Inicial
GET /dashboard/summary
GET /dashboard/kpis
GET /dashboard/activity
GET /dashboard/agenda-preview
________________________________________
29. Hook Frontend
useDashboard()
Responsável por:
•	carregar KPIs
•	atualizar widgets
•	controlar loading
•	tratar erros
•	polling inicial
________________________________________
30. Service Frontend
dashboard.service.ts
Responsável por:
•	chamadas API
•	transformação de payload
•	normalização de dados
________________________________________
31. Estados Operacionais
Loading
Exibir:
•	skeletons
•	shimmer
•	placeholders elegantes
________________________________________
Empty State
Exibir:
•	mensagens amigáveis
•	incentivo operacional
•	onboarding contextual
________________________________________
Error State
Nunca exibir:
•	stack traces
•	SQL errors
•	mensagens técnicas
Exibir:
•	"Não foi possível carregar"
•	"Tente novamente"
________________________________________
32. Quick Actions
Botões rápidos:
•	Novo agendamento
•	Novo cliente
•	Novo serviço
•	Nova campanha
Objetivo:
•	reduzir cliques
•	aumentar velocidade operacional
________________________________________
33. Escalabilidade Futura
Arquitetura preparada para:
•	BI
•	Analytics
•	IA preditiva
•	realtime
•	dashboards avançados
•	múltiplas unidades
•	franquias
•	marketplace
•	gamificação operacional
________________________________________
34. Objetivo Final
O Dashboard deve representar:
•	profissionalização do salão
•	central operacional inteligente
•	experiência SaaS premium
•	crescimento operacional assistido
O usuário deve sentir:
"O Bellory organiza meu negócio para mim."