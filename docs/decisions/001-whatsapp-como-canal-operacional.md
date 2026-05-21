Essa decisão arquitetural é extremamente importante porque ela define um dos pilares conceituais do Bellory:
“O WhatsApp não é a plataforma principal.
Ele é o canal operacional inteligente.”
Esse documento em docs/decisions/001-whatsapp-como-canal-operacional.md deve funcionar como um ADR (Architecture Decision Record), isto é:
•	registrar uma decisão estratégica
•	explicar o motivo da decisão
•	documentar impactos arquiteturais
•	orientar futuras implementações
Essa decisão influencia:
•	UX
•	arquitetura
•	escalabilidade
•	automações
•	CRM
•	IA
•	onboarding
•	experiência cliente
Abaixo está a especificação consolidada profissional do documento.
________________________________________
docs/decisions/001-whatsapp-como-canal-operacional.md
# ADR-001 — WhatsApp como Canal Operacional

# Status

ACEITO

---

# Contexto

O Bellory foi concebido como uma plataforma SaaS para:
- profissionais autônomos
- pequenos salões
- usuários com baixa maturidade tecnológica
- operação mobile-first

Durante a definição arquitetural do produto, foi identificado que:

A maioria dos profissionais da beleza:
- utiliza fortemente WhatsApp
- possui baixa adesão a softwares complexos
- evita sistemas corporativos
- prefere comunicação simples
- já opera parcialmente pelo WhatsApp

Também foi identificado que:
- obrigar clientes finais a instalar aplicativos reduz conversão
- exigir login tradicional aumenta atrito
- excesso de interfaces reduz adoção

---

# Problema

Definir:
qual deve ser o papel do WhatsApp dentro da arquitetura Bellory.

As opções consideradas foram:

## Opção 1
Transformar o WhatsApp na plataforma principal.

## Opção 2
Utilizar o WhatsApp apenas como canal secundário.

## Opção 3
Transformar o WhatsApp em canal operacional inteligente integrado ao Bellory.

---

# Decisão

Foi decidido que:

> O WhatsApp NÃO será a plataforma principal do Bellory.

O WhatsApp será:
- canal operacional
- canal relacionamento
- canal execução
- canal automação
- extensão operacional do sistema

O Bellory continuará sendo:
- plataforma principal
- núcleo operacional
- núcleo inteligência
- núcleo CRM
- núcleo Agenda
- núcleo IA

---

# Motivação Estratégica

A decisão foi tomada porque:

## 1. Baixa fricção

Usuários já utilizam WhatsApp diariamente.

Isso reduz:
- resistência adoção
- curva aprendizado
- necessidade treinamento

## 2. Forte aderência mercado brasileiro

O WhatsApp é:
- principal canal comunicação
- principal canal relacionamento
- principal ferramenta operacional informal

especialmente para:
- pequenos salões
- profissionais autônomos
- periferias urbanas

## 3. Redução de atrito cliente final

O cliente final:
- não precisa baixar app
- não precisa criar conta inicialmente
- não precisa aprender nova plataforma

Pode apenas:
- clicar link
- confirmar
- reagendar
- interagir rapidamente

## 4. Crescimento viral

Cada salão:
- compartilha links
- envia campanhas
- divulga agenda
- amplia alcance organicamente

## 5. Comunicação natural

O WhatsApp já faz parte do comportamento operacional do público-alvo.

O Bellory apenas:
- organiza
- automatiza
- profissionaliza

essa comunicação.

# Consequências Arquiteturais

A arquitetura Bellory passa a considerar o WhatsApp como:

- camada operacional externa
- gateway comunicação
- extensão CRM
- canal automação

# Consequências Técnicas

O sistema deve suportar:

- WhatsApp comum
- WhatsApp links
- WhatsApp Business
- templates
- WhatsApp Cloud API
- webhooks
- mensagens bidirecionais
- chatbot IA
- filas mensagens
- automações

# Consequências UX

O Bellory deve:
- operar sem a necessidade de login do cliente final
- reduzir telas
- simplificar interação
- utilizar links operacionais

# Consequências Operacionais

O WhatsApp será utilizado para:

- confirmações
- lembretes
- campanhas
- recuperação clientes
- relacionamento
- reagendamento
- notificações

# O que o WhatsApp NÃO será

O WhatsApp NÃO será:

- dashboard principal
- CRM principal
- agenda principal
- banco dados
- camada inteligência

Toda lógica operacional continuará no Bellory.

# O que o Bellory continuará sendo

O Bellory continuará sendo:

- plataforma SaaS principal
- núcleo operacional
- motor inteligente agenda
- CRM central
- camada IA
- dashboard operacional
- sistema multi-tenant

# Impacto no Cliente Final

O cliente final poderá:

- acessar links
- confirmar horários
- cancelar
- reagendar
- receber campanhas
- interagir rapidamente

sem necessidade inicial de:
- instalar app
- criar senha
- aprender sistema complexo
- fazer login

# Impacto no CRM

O WhatsApp passa a alimentar:
- relacionamento
- recorrência
- retenção
- campanhas
- histórico operacional

# Impacto na Agenda

A Agenda utilizará WhatsApp para:
- confirmações
- lembretes
- reagendamentos
- redução no_show

# Impacto na IA

A IA poderá:
- gerar mensagens
- sugerir campanhas
- personalizar comunicação
- prever comportamento

# Impacto Comercial

A estratégia aumenta:
- adesão
- retenção
- recorrência
- viralização
- percepção simplicidade

# Impacto de Escalabilidade

A arquitetura deverá preparar:

- filas mensagens
- webhooks
- eventos realtime
- múltiplos providers
- Cloud API
- omnichannel futuro

# Riscos Identificados

## Dependência terceiros

O WhatsApp pertence à Meta.

Mudanças políticas/API podem impactar:
- custos
- limites
- integrações

## Limitações WhatsApp comum

WhatsApp comum:
- não possui APIs oficiais completas
- limita automações
- depende ação usuário

## LGPD e consentimento

Será necessário:
- consentimento mensagens
- opt-out
- proteção dados

# Estratégia Mitigação

O Bellory continuará:
- desacoplado do WhatsApp
- independente operacionalmente
- utilizando arquitetura provider-based

Permitindo:
- troca providers
- múltiplos canais futuros
- fallback operacional

# Providers Futuros

Arquitetura preparada para:
- WhatsApp Cloud API
- Twilio
- Z-API
- Evolution API
- Telegram
- Instagram Direct
- Email
- Push Notifications

# Diretriz Arquitetural Final

O WhatsApp deve funcionar como:

> extensão operacional inteligente do Bellory.

Nunca como:
- substituto plataforma
- núcleo operacional principal

# Resultado Esperado

O usuário deve sentir:

"O Bellory conversa automaticamente com minhas clientes."

Sem precisar:
- operar sistemas complexos
- aprender tecnologia
- abandonar o WhatsApp

# Decisão Final

DECISÃO APROVADA:
WhatsApp será utilizado como:
- canal operacional inteligente
- canal relacionamento
- canal execução
- extensão operacional do Bellory

E NÃO como:
- plataforma principal
- núcleo operacional central
- substituto do SaaS