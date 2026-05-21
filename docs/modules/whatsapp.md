
O whatsapp.md é um dos módulos mais críticos e diferenciadores do Bellory, porque o WhatsApp NÃO é apenas um canal de comunicação no projeto.
Ele é:
•	canal operacional
•	canal de relacionamento
•	motor de retenção
•	canal de automação
•	ponte entre o salão e o cliente
Esse é um ponto estratégico extremamente forte do Bellory.
A maioria dos concorrentes:
•	usa WhatsApp apenas como envio manual
•	ou depende totalmente da plataforma própria
O Bellory faz diferente:
ele transforma o WhatsApp em:
•	extensão operacional do salão
•	motor de relacionamento inteligente
•	canal invisível de automação
O módulo WhatsApp NÃO deve parecer:
•	central complexa de atendimento
•	plataforma corporativa omnichannel
•	sistema técnico pesado
Ele deve parecer:
•	comunicação automática simples
•	assistente operacional
•	relacionamento inteligente invisível
O usuário deve sentir:
“O Bellory conversa com minhas clientes por mim.”
Abaixo está a especificação consolidada profissional do módulo.
________________________________________
docs/modules/whatsapp.md
# WhatsApp Module — Bellory

# 1. Objetivo do Módulo

O módulo WhatsApp é responsável por:

- comunicação operacional
- relacionamento automático
- confirmações
- lembretes
- campanhas
- notificações
- recuperação clientes

O objetivo principal é:
transformar o WhatsApp em canal inteligente de operação e relacionamento.

# 2. Papel Estratégico

O módulo WhatsApp representa:
- principal canal operacional externo
- principal canal relacionamento
- motor retenção operacional
- camada comunicação automática

O WhatsApp NÃO é:
- plataforma principal Bellory
- CRM principal
- dashboard principal

O WhatsApp É:
- canal execução
- canal comunicação
- canal relacionamento
- extensão operacional do sistema

# 3. Objetivo UX

O usuário deve sentir:

"O Bellory conversa com minhas clientes automaticamente."

A experiência deve transmitir:
- simplicidade
- automação
- proximidade
- rapidez
- inteligência operacional

# 4. Público-Alvo

O módulo foi projetado para:
- profissionais autônomos
- pequenos salões
- usuários mobile-first
- baixa maturidade tecnológica

# 5. Conceito Arquitetural

O módulo WhatsApp deve funcionar como:

- camada comunicação operacional
- motor notificações
- gateway relacionamento
- estrutura desacoplada

O módulo deve integrar:
- Agenda
- CRM
- Campanhas
- AI Engine

# 6. Estratégia Operacional

O Bellory deve utilizar:

- WhatsApp Business/ WhatsApp Cloud API  - Aplicado a: “dono do App”,  e opcionalmente aos “donos de salão/administradores”, haja vista, que nem todos os “donos de salão/administradores” o possuem.
- WhatsApp comum - Aplicado a: “donos de salão/administradores”, “funcionários”, ”terceiros”
- WhatsApp links
- templates 
- automações
- webhooks
- mensagens bidirecionais
- fila mensagens
- IA conversacional

# 7. Estrutura Backend

```text
backend/src/modules/whatsapp/
  controllers/
  services/
  providers/
  queues/
  webhooks/
  validators/
  routes/
  dto/
________________________________________
8. Estrutura Frontend
frontend/src/
  app/
    whatsapp/
  components/
    whatsapp/
  hooks/
  services/
________________________________________
9. Objetivos Operacionais
O módulo deve permitir:
•	enviar confirmações
•	enviar lembretes
•	enviar campanhas
•	enviar notificações
•	recuperar clientes
•	automatizar relacionamento
________________________________________
10. Tipos de Mensagens
Confirmação Agendamento
Exemplo:
•	confirmação horário
•	confirmação profissional
•	confirmação serviço
________________________________________
Lembretes
Exemplo:
•	lembrete atendimento
•	lembrete retorno
•	lembrete campanha
________________________________________
Campanhas
Exemplo:
•	promoções
•	descontos
•	datas comemorativas
________________________________________
Recuperação Clientes
Exemplo:
•	clientes inativos
•	retorno sugerido
•	campanhas recorrência
________________________________________
Relacionamento
Exemplo:
•	aniversário
•	agradecimento
•	pós-atendimento
________________________________________
11. Integração Agenda
O módulo deve consumir:
•	novos agendamentos
•	cancelamentos
•	reagendamentos
•	confirmações
•	horários
________________________________________
12. Integração CRM
Consumir:
•	segmentações
•	frequência clientes
•	retenção
•	comportamento operacional
________________________________________
13. Integração Campaigns
Consumir:
•	campanhas ativas
•	promoções
•	públicos segmentados
•	cupons
________________________________________
14. Integração AI Engine
Futuro suporte para:
•	mensagens inteligentes
•	respostas IA
•	automações contextuais
•	sugestões automáticas
•	comunicação personalizada
________________________________________
15. Fluxo Operacional Inicial
Fluxo principal
1.	evento operacional ocorre
2.	sistema gera payload
3.	módulo WhatsApp processa
4.	mensagem é enviada
5.	status é registrado
________________________________________
16. Fluxos Principais
Agendamento
Enviar:
•	confirmação
•	lembrete
•	reagendamento
•	cancelamento
________________________________________
Campanhas
Enviar:
•	promoções
•	cupons
•	chamadas retorno
________________________________________
CRM
Enviar:
•	recuperação clientes
•	relacionamento
•	fidelização
________________________________________
17. Templates Mensagens
O sistema deve possuir:
•	templates prontos
•	templates operacionais
•	templates campanhas
•	templates relacionamento
________________________________________
18. Estrutura Mensagem
Cada mensagem deve possuir:
•	título
•	conteúdo
•	CTA
•	link operacional
•	identificação tenant
________________________________________
19. Links Operacionais
Permitir:
•	confirmação agendamento
•	cancelamento
•	reagendamento
•	abertura dashboard cliente
________________________________________
20. Tokens Operacionais
Links devem utilizar:
•	tokens seguros
•	expiração futura
•	validação ownership
•	proteção operacional
________________________________________
21. APIs Backend
Enviar mensagem
POST /whatsapp/send
________________________________________
Status mensagens
GET /whatsapp/status
________________________________________
Webhook futuro
POST /whatsapp/webhook
________________________________________
Templates
GET /whatsapp/templates
________________________________________
22. Hook Frontend
useWhatsApp()
Responsável por:
•	status mensagens
•	templates
•	integrações operacionais
•	métricas futuras
________________________________________
23. Service Frontend
whatsapp.service.ts
Responsável por:
•	APIs
•	payloads
•	status mensagens
•	tratamento erros
________________________________________
24. Componentes Frontend
Estruturais
•	WhatsAppLayout
•	WhatsAppStatus
Operacionais
•	MessagePreview
•	TemplateSelector
•	CampaignSender
•	MessageTimeline
Estados
•	EmptyWhatsAppState
________________________________________
25. Funcionalidades Frontend
Permitir:
•	visualizar status
•	visualizar templates
•	acompanhar envios
•	acompanhar campanhas
•	configurar mensagens
________________________________________
26. UX/UI
A experiência deve ser:
•	extremamente simples
•	intuitiva
•	visual
•	operacional
•	amigável
Inspirado em:
•	WhatsApp Business
•	Fresha
•	Calendly
•	Notion
________________________________________
27. Mobile-First
Priorizar:
•	visual vertical
•	ações rápidas
•	poucos cliques
•	experiência touch
•	baixa fricção
________________________________________
28. Desktop
Desktop deve:
•	utilizar visual clean
•	timeline organizada
•	métricas simples
•	gestão confortável
________________________________________
29. Estilo Visual
Utilizar:
•	cards modernos
•	glow discreto
•	gradientes suaves
•	micro animações
•	glassmorphism leve
Evitar:
•	aparência call center
•	excesso corporativo
•	excesso técnico
________________________________________
30. Paleta Visual
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
31. Status de Mensagens
Status possíveis
pendente
enviada
entregue
lida
falhou
cancelada
________________________________________
32. Filas de Mensagens
Futuro suporte:
•	queue system
•	retry automático
•	envio assíncrono
•	throttling
•	controle limites API
________________________________________
33. Webhooks
Preparar:
•	recebimento mensagens
•	confirmação entrega
•	leitura mensagens
•	eventos WhatsApp API
________________________________________
34. Métricas Operacionais
Exibir:
•	mensagens enviadas
•	entregas
•	leituras
•	falhas
•	campanhas enviadas
•	confirmações realizadas
________________________________________
35. Segurança
Garantir:
•	autenticação JWT
•	validação tenant
•	ownership validation
•	proteção tokens
Nunca permitir:
•	envio cross-tenant
•	vazamento contatos
•	acesso indevido
________________________________________
36. Multi-Tenant
Toda operação deve respeitar:
•	tenant_id
•	permissões
•	ownership
________________________________________
37. Privacidade
Preparar:
•	LGPD
•	consentimento mensagens
•	opt-out
•	anonimização futura
________________________________________
38. Tratamento de Erros
Nunca exibir:
•	stack traces
•	SQL errors
•	erros internos
Exibir:
•	"Não foi possível enviar mensagem"
•	"Tente novamente"
________________________________________
39. Estados Operacionais
Loading
Exibir:
•	skeletons
•	shimmer
•	loading elegante
________________________________________
Empty State
Exibir:
•	incentivo operacional
•	onboarding comunicação
Exemplo:
"Automatize a comunicação com suas clientes."
________________________________________
Error State
Exibir:
•	retry simples
•	mensagens amigáveis
________________________________________
40. Polling e Realtime
MVP Inicial
Atualização:
•	polling leve
________________________________________
Futuro
Preparar:
•	websocket
•	realtime
•	status live
•	sincronização instantânea
________________________________________
41. Performance
Priorizar:
•	filas futuras
•	envio assíncrono
•	paginação
•	lazy loading
•	cache futuro
________________________________________
42. Escalabilidade Futura
Arquitetura preparada para:
•	WhatsApp Cloud API
•	chatbot IA
•	atendimento automático
•	voice AI
•	omnichannel
•	múltiplos números
•	central atendimento
________________________________________
43. Objetivo Final
O módulo WhatsApp deve representar:
•	comunicação inteligente
•	relacionamento automático
•	retenção operacional
•	automação invisível
O usuário deve sentir:
"O Bellory conversa automaticamente com minhas clientes."