Essa decisão arquitetural é absolutamente central para o Bellory, porque ela impacta:
•	UX
•	frontend
•	arquitetura
•	navegação
•	onboarding
•	agenda
•	CRM
•	WhatsApp
•	adoção do produto
Na prática:
o Bellory NÃO é um sistema desktop adaptado para celular.
Ele deve nascer:
•	mobile-first
•	touch-first
•	baixa fricção
•	orientado ao comportamento real do público-alvo
Isso é um diferencial enorme.
A maioria dos ERPs do mercado:
•	começa no desktop
•	depois “adapta” para mobile
O Bellory deve fazer o contrário:
•	projetar primeiro para celular
•	depois expandir para desktop
Esse documento em docs/decisions/002-mobile-first.md deve registrar formalmente essa decisão estrutural.
Abaixo está a especificação consolidada profissional do ADR.
________________________________________
docs/decisions/002-mobile-first.md
# ADR-002 — Estratégia Mobile-First

# Status

ACEITO

---

# Contexto

O Bellory foi concebido como uma plataforma SaaS voltada para:

- profissionais autônomos
- pequenos salões
- operação simplificada
- baixa maturidade tecnológica
- forte uso WhatsApp

Durante a análise do público-alvo foi identificado que:

A maioria dos usuários:
- utiliza celular como dispositivo principal
- possui pouco uso desktop
- opera diretamente pelo WhatsApp
- utiliza internet móvel
- possui baixa familiaridade tecnológica

Também foi identificado que:
- sistemas desktop-first possuem baixa adesão
- interfaces complexas aumentam abandono
- excesso de telas reduz usabilidade

---

# Problema

Definir:
qual deve ser a estratégia principal de UX e arquitetura frontend do Bellory.

As opções consideradas foram:

## Opção 1
Desktop-first com adaptação mobile posterior.

## Opção 2
Interfaces independentes mobile e desktop.

## Opção 3
Estratégia mobile-first como diretriz principal.

---

# Decisão

Foi decidido que:

> O Bellory será desenvolvido seguindo estratégia mobile-first.

Toda experiência deverá ser:
- priorizada para celular
- otimizada para touch
- simplificada
- vertical
- orientada baixa fricção

O desktop continuará existindo:
- como expansão natural
- camada produtividade adicional
- experiência complementar

---

# Motivação Estratégica

A decisão foi tomada porque:

## 1. Comportamento real do público

O público-alvo:
- trabalha no celular
- agenda pelo celular
- responde WhatsApp pelo celular
- divulga serviços pelo celular

---

## 2. Redução de fricção

Interfaces mobile-first:
- simplificam navegação
- reduzem complexidade
- aumentam adoção
- melhoram retenção

---

## 3. Forte aderência operacional

Pequenos profissionais:
- raramente operam ERPs desktop
- evitam sistemas complexos
- preferem aplicativos simples

---

## 4. Crescimento orgânico

Usuários mobile:
- compartilham links
- divulgam campanhas
- utilizam redes sociais
- utilizam WhatsApp continuamente

---

## 5. Melhor experiência operacional

O Bellory deve funcionar:
- rapidamente
- com poucos cliques
- durante o atendimento
- em movimento
- com baixa carga cognitiva

---

# Consequências Arquiteturais

Toda arquitetura frontend deverá priorizar:

- telas verticais
- componentes responsivos
- experiência touch
- navegação simplificada
- baixo atrito operacional

---

# Consequências Técnicas

O frontend deverá:

- utilizar layouts responsivos
- utilizar grids adaptativos
- evitar tabelas pesadas
- utilizar cards operacionais
- utilizar bottom navigation mobile

---

# Consequências UX

O sistema deverá:

- minimizar campos
- reduzir digitação
- utilizar componentes touch-friendly
- priorizar leitura rápida
- reduzir sobrecarga visual

---

# Consequências Operacionais

O Bellory deverá funcionar:
- durante atendimentos
- em ambientes movimentados
- com conexão móvel
- com uso rápido
- com atenção parcial do usuário

---

# Diretrizes Mobile-First

## Navegação

Priorizar:
- bottom navigation
- menus simples
- poucas opções simultâneas

---

## Componentes

Utilizar:
- cards
- listas verticais
- botões grandes
- áreas touch amplas

Evitar:
- grids complexos
- tabelas densas
- hover-dependente

---

## Inputs

Priorizar:
- teclado correto mobile
- máscaras inteligentes
- seleção simplificada
- poucos campos por tela

---

## Fluxos

Todo fluxo deve:
- reduzir cliques
- reduzir etapas
- minimizar esforço cognitivo

---

# Consequências Visuais

O Bellory deve parecer:

- moderno
- leve
- rápido
- simples
- elegante

Nunca:
- ERP pesado
- sistema corporativo complexo
- painel burocrático

---

# Desktop

O desktop será:
- complementar
- produtivo
- expandido visualmente

Mas nunca:
- experiência prioritária

---

# Responsividade

Todos os módulos devem suportar:

- mobile
- tablet
- desktop

Porém:
- mobile será sempre prioridade principal

---

# Consequências nos Módulos

## Dashboard

Deve utilizar:
- cards empilhados
- KPIs rápidos
- widgets verticais

---

## Agenda

Deve utilizar:
- timeline vertical
- slots touch
- navegação rápida

---

## CRM

Deve utilizar:
- cards cliente
- pesquisa rápida
- histórico simplificado

---

## Campaigns

Deve utilizar:
- templates rápidos
- preview vertical
- poucos cliques

---

## WhatsApp

Deve parecer:
- extensão natural do celular

---

# Performance Mobile

O sistema deverá priorizar:

- baixo payload
- lazy loading
- carregamento rápido
- cache futuro
- otimização imagens

---

# PWA

Arquitetura preparada para:

- Progressive Web App
- instalação futura
- offline parcial
- notificações push

---

# Estratégia Visual

Inspirado em:
- Linear
- Notion
- WhatsApp
- Calendly
- Fresha

---

# Estratégia de Navegação

Priorizar:
- navegação simples
- baixa profundidade
- poucas camadas
- acesso rápido

---

# Estratégia de Inputs

Priorizar:
- seleção rápida
- dropdowns simplificados
- autosuggest futuro
- preenchimento inteligente

---

# Estratégia de Feedback

O sistema deve fornecer:
- feedback imediato
- loading elegante
- animações suaves
- transitions rápidas

---

# Estratégia de Onboarding

O onboarding deve:
- funcionar perfeitamente mobile
- reduzir digitação
- reduzir campos simultâneos

---

# Estratégia Cliente Final

O cliente final deverá:
- acessar links rapidamente
- confirmar agendamentos facilmente
- navegar sem login complexo

---

# Riscos Identificados

## Limitação espaço visual

Mobile possui:
- espaço reduzido
- atenção reduzida
- menor densidade operacional

---

## Complexidade futura

Funcionalidades avançadas poderão exigir:
- simplificação visual
- progressive disclosure
- adaptação contextual

---

# Estratégia Mitigação

Utilizar:
- arquitetura modular
- progressive disclosure
- componentes reutilizáveis
- layouts adaptativos

---

# Diretriz Arquitetural Final

O Bellory deve ser desenvolvido:

> primeiro para celular.

E depois:
- expandido elegantemente para desktop.

Nunca o contrário.

---

# Resultado Esperado

O usuário deve sentir:

"O Bellory foi feito para funcionar naturalmente no meu celular."

Sem:
- dificuldade operacional
- excesso de telas
- aparência ERP
- complexidade técnica

---

# Decisão Final

DECISÃO APROVADA:
O Bellory seguirá estratégia:

- mobile-first
- touch-first
- baixa fricção
- operação simplificada
- experiência vertical prioritária

com desktop como:
- camada complementar
- expansão produtividade
- experiência secundária