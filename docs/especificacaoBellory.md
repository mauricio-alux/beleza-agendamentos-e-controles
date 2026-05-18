Plataforma SaaS Beleza com IA + WhatsApp
1. Visão Geral do Projeto
O projeto consiste no desenvolvimento de uma plataforma SaaS voltada para profissionais autônomos e pequenos empresários do setor da beleza, estética, bem-estar e serviços correlatos.
O sistema foi concebido para resolver os principais problemas enfrentados por profissionais do segmento:
•	Falta de organização da agenda
•	Dependência excessiva do WhatsApp manual
•	Baixa fidelização de clientes
•	Ausência de automação
•	Dificuldade em captar novos clientes
•	Controle financeiro limitado
•	Falta de profissionalização digital
A solução utiliza:
•	Aplicação Web/PWA (O uso será majoritariamente via mobile)
•	Inteligência Artificial
•	WhatsApp como canal operacional
•	CRM integrado
•	Agendamento inteligente
•	Campanhas automatizadas
•	Dashboard analítico
________________________________________
2. Objetivo Estratégico
O principal objetivo do projeto é:
Transformar profissionais da beleza em microempresas digitalmente organizadas e automatizadas.
A plataforma busca:
•	Automatizar comunicação
•	Organizar atendimentos
•	Melhorar retenção de clientes
•	Facilitar agendamentos
•	Aumentar faturamento
•	Profissionalizar pequenos negócios
________________________________________
3. Público-Alvo
Empresários e Profissionais
•	Cabeleireiras
•	Manicures
•	Maquiadoras
•	Esteticistas
•	Podólogos
•	Massoterapeutas
•	Fisioterapeutas
•	Tatuadores
•	Personal trainers
•	Psicólogos clínicos
•	Nutricionistas
•	Veterinários
•	Estética animal
•	Outros prestadores de serviços com o mesmo viés ou perfis semelhantes
Clientes finais são
Clientes dos profissionais e de salões que:
•	fazem agendamentos
•	recebem campanhas
•	acompanham histórico
•	interagem via WhatsApp
________________________________________
4. Conceito Central da Plataforma
A plataforma foi projetada em três camadas:
Camada	Função
Plataforma SaaS	Gestão operacional
WhatsApp	Canal de comunicação
IA	Inteligência e automação
________________________________________
5. Modelo Operacional
Fluxo principal
1. Aquisição do empresário
O profissional:
•	vê anúncio
•	acessa página de apresentação
•	realiza cadastro
•	efetua login
•	acessa dashboard
________________________________________
2. Configuração inicial
O sistema cria automaticamente: 
*Conforme dados cadastrais obtidos na operação anterior (1. Aquisição do empresário) 
•	Usuário*
•	Salão*
•	Serviços*
•	Link de agendamento
•	Estrutura mínima operacional
________________________________________
3. Divulgação do link
O empresário envia:
•	WhatsApp
•	QR Code
•	Instagram
•	Redes sociais
________________________________________
4. Entrada do cliente final
O cliente:
•	recebe link
•	ao clicar no link, acessa agenda
•	informa telefone/nome (Pré cadastro do cliente ocorre nessa ocasião)
o	Se o cliente já esta cadastrado, então esses dados serão automaticamente exibidos.
•	realiza agendamento (Quando o cliente já está cadastrado e possui algum agendamento, então é direcionado para seu dashboard, onde poderá ver seus históricos, atualizar seu cadastro, fazer um novo agendamento e/ou cancelar agendamento que esteja “em-aberto”, isto é, “pendente” ou “confirmado”)
________________________________________
5. Operação automatizada
O sistema passa a:
•	enviar confirmações
•	enviar lembretes
•	sugerir retornos
•	criar campanhas
•	alimentar CRM
________________________________________
6. Estrutura de Usuários
Tipos de usuários
Tipo	Função
MasterAdmin	Dono da plataforma
Administrador	Dono de salão
Autônomo	Profissional independente
Funcionário	Colaborador
Terceiro	Prestador
Cliente	Cliente final
________________________________________
7. Principais Módulos
7.1 Módulo de Agendamento
Responsável por:
•	geração de horários
•	controle de disponibilidade
•	confirmação
•	cancelamento
•	reagendamento
________________________________________
7.2 CRM
Gerencia:
•	clientes
•	histórico
•	relacionamento
•	frequência
•	campanhas
•	pontuação
________________________________________
7.3 WhatsApp
Utilizado para:
•	confirmações
•	lembretes
•	campanhas
•	notificações
•	recuperação de clientes
No MVP:
•	O perfil MasterAdmin, referente ao dono da plataforma, utilizará WhatsApp Cloud API.
•	Os perfis Administrador, Autônomo, Funcionário e Terceiro poderão utilizar WhatsApp Cloud API, mas não obrigatoriamente, considerando que na maioria dos casos esses usuários utilizam WhatsApp comum ou WhatsApp Business.
•	O perfil Cliente utilizará WhatsApp comum.
________________________________________
7.4 IA
A IA atua em:
•	campanhas automáticas
•	sugestões de retorno
•	recomendações
•	mensagens personalizadas
•	insights operacionais
________________________________________
7.5 Dashboard Empresarial
Exibe:
•	agenda do dia
•	faturamento
•	ocupação
•	clientes ativos
•	métricas
•	campanhas
________________________________________
7.6 Dashboard Cliente
Permite:
•	acompanhar agendamentos
•	visualizar histórico
•	receber promoções
•	reagendar
•	cancelar horários
________________________________________
7.7 Financeiro
Responsável por:
•	controle financeiro operacional
•	acompanhamento de faturamento
•	indicadores de receita
•	análises de performance
•	gráficos financeiros
•	métricas de crescimento
________________________________________
8. Arquitetura Técnica
MVP Inicial
•	Node.js
•	React/PWA
•	Supabase/PostgreSQL
•	WhatsApp Cloud API, obrigatória para o MasterAdmin e opcional para Administrador, Autônomo, Funcionário e Terceiro
•	WhatsApp comum para Cliente
•	OpenAI API
•	Jobs assíncronos para lembretes, campanhas e retorno de clientes
________________________________________
Evolução futura
•	IA avançada
•	WhatsApp Cloud API com automações ampliadas
•	Marketplace
•	Integrações externas
•	Escalabilidade multi-nicho
________________________________________
9. Papel do WhatsApp
O WhatsApp NÃO é:
•	plataforma principal
•	funil principal
•	sistema principal
O WhatsApp É:
•	canal operacional
•	motor de relacionamento
•	canal de execução
________________________________________
10. Lógica do Cliente Final
Sem login obrigatório inicialmente
O cliente:
•	recebe link
•	informa telefone/nome
•	faz seu agendamento
•	sistema cria identificação automática
________________________________________
Evolução futura
Login via:
•	token
•	WhatsApp
•	link mágico
________________________________________
11. Motor Inteligente de Agendamento
O motor calcula automaticamente:
•	horários disponíveis
o	Deve oferecer os horários de tal modo que evite criar “buracos” entre os atendimentos.
•	conflitos
•	intervalos
•	horários passados
•	duração dos serviços
________________________________________
O motor considera
•	horário do salão
•	escala do profissional
•	feriados
•	agendamentos existentes
•	tolerância de horário
•	duração do serviço
________________________________________
12. Banco de Dados
Principais entidades
Tabela	Função
User	Usuários
Salão	Estabelecimentos
Cliente	Clientes
Agenda	Agendamentos
ServiçoSalão	Serviços
Campanha	Marketing
ContaCorrente	Financeiro
EscalaSemanal	Disponibilidade
ClienteSalão	Relacionamento
ClienteSalãoServiço	Histórico
________________________________________
13. Estratégia de Crescimento
Entrada simples
A proposta do sistema é:
eliminar atrito.
Por isso:
•	cliente não baixa app
•	não cria senha
•	apenas acessa link
________________________________________
Efeito viral
Cada salão:
•	divulga o próprio link
•	traz novos clientes
•	alimenta a base
•	aumenta a rede
________________________________________
14. Diferenciais Competitivos
14.1 Simplicidade
Sistema pensado para:
•	usuários com baixa familiaridade tecnológica
•	uso direto no celular
•	poucos cliques
________________________________________
14.2 Uso forte do WhatsApp
Compatível com:
•	WhatsApp comum
•	WhatsApp Business
•	WhatsApp Cloud API
________________________________________
14.3 IA aplicada ao negócio
A IA não é decorativa.
Ela atua em:
•	retenção
•	campanhas
•	vendas
•	comunicação
•	previsões
________________________________________
15. Estratégia Comercial
Proposta de valor
O sistema vende:
•	profissionalismo
•	organização
•	aumento de renda
•	automação
•	fidelização
________________________________________
Público ideal inicial
•	profissionais autônomos
•	pequenos salões
•	periferias urbanas
•	baixa maturidade digital
________________________________________
16. Estratégia Técnica do MVP
Fase 1
•	Agendamento
•	CRM
•	Dashboard
•	WhatsApp básico
________________________________________
Fase 2
•	IA
•	campanhas
•	automações
•	métricas
________________________________________
Fase 3
•	expansão multi-nicho
•	IA avançada
•	automações inteligentes
•	marketplace
________________________________________
17. Conceito de Escalabilidade
O projeto foi desenhado para:
•	múltiplos salões
•	múltiplos profissionais
•	múltiplos nichos
•	múltiplas regiões
________________________________________
18. Visão Estratégica Final
O sistema não é apenas um aplicativo de agenda.
Ele foi concebido como:
uma plataforma de crescimento para pequenos profissionais da beleza.
A proposta central é:
•	transformar WhatsApp em canal inteligente
•	transformar agenda em CRM
•	transformar clientes em recorrência
•	transformar pequenos profissionais em negócios organizados
________________________________________
19. Assuntos complementares que irão elevar a maturidade do projeto
•	Estratégia de monetização SaaS
•	Multi-tenant architecture
•	Segurança e tokenização
•	Estruturação de métricas de retenção
•	Engine de campanhas automatizadas
•	Sistema de reputação/pontuação
•	IA preditiva de retorno de clientes
•	Funil comercial automatizado
•	Estrutura de escalabilidade NodeJS + Supabase + WhatsApp Cloud API
