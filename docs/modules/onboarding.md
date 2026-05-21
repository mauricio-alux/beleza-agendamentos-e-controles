O `onboarding.md` é extremamente estratégico no Bellory porque ele representa:

* a transformação do usuário em cliente ativo
* a primeira percepção de valor do SaaS
* a redução de fricção operacional
* a ativação rápida do salão
* o início da automação invisível

Na prática:
o onboarding é o momento em que o Bellory “monta o salão para o usuário”.

Isso é um diferencial enorme no mercado brasileiro.

O onboarding do Bellory NÃO deve parecer:

* cadastro burocrático
* ERP corporativo
* configuração técnica

Ele deve parecer:

* assistente inteligente
* ativação guiada
* experiência premium
* automação amigável

Abaixo está a especificação consolidada profissional do módulo.

---

# docs/modules/onboarding.md

````md id="y81h7m"
# Onboarding Module — Bellory

# 1. Objetivo do Módulo

O módulo Onboarding é responsável por:

- ativar rapidamente o salão
- reduzir fricção operacional
- guiar o usuário
- configurar a estrutura inicial
- transformar cadastro em operação real

O objetivo principal é:
fazer o usuário começar a utilizar o Bellory em poucos minutos.

---

# 2. Papel Estratégico

O onboarding é responsável por:

- primeira experiência operacional
- percepção inicial de valor
- ativação do tenant
- criação da estrutura mínima operacional
- aceleração da adoção do sistema

O onboarding NÃO deve parecer:
- formulário corporativo
- processo burocrático
- configuração técnica

Deve parecer:
- assistente inteligente
- configuração automática
- ativação guiada

---

# 3. Objetivo UX

O usuário deve sentir:

"O Bellory já está organizando meu salão para mim."

A experiência deve transmitir:
- acolhimento
- simplicidade
- modernidade
- rapidez
- automação inteligente
- facilidade operacional

---

# 4. Público-Alvo

O módulo foi projetado para:
- profissionais autônomos
- pequenos salões
- baixa maturidade tecnológica
- usuários mobile-first

---

# 5. Conceito Arquitetural

O onboarding deve funcionar como:

- fluxo progressivo
- step-by-step guiado
- configuração incremental
- ativação persistente

O sistema deve:
- salvar progresso automaticamente
- permitir retomada futura
- evitar perda de dados
- minimizar atrito

---

# 6. Estrutura Frontend

```text
frontend/src/
  app/
    onboarding/
  components/
    onboarding/
  hooks/
  services/
  context/
````

---

# 7. Estrutura Backend

```text id="kv8zn6"
backend/src/modules/onboarding/
```

---

# 8. Rota Principal

```text id="5xvf1j"
/onboarding
```

---

# 9. Fluxo Operacional

## Fluxo principal

1. usuário realiza login
2. sistema verifica onboarding status
3. usuário acessa onboarding
4. etapas são preenchidas
5. progresso é salvo automaticamente
6. onboarding pode ser retomado
7. onboarding é concluído
8. usuário é redirecionado ao dashboard

---

# 10. Objetivos Operacionais

O onboarding deve ativar:

* tenant
* salão
* configurações básicas
* serviços iniciais
* profissional administrador
* parâmetros operacionais

---

# 11. Persistência

O sistema deve:

* salvar automaticamente
* recuperar progresso
* permitir continuidade futura
* manter consistência operacional

---

# 12. Etapas do Onboarding

## 1. Boas-vindas

Objetivo:

* acolher usuário
* iniciar ativação

Exibir:

* nome usuário
* nome salão
* progresso inicial

Mensagem:
"Vamos configurar seu salão em poucos minutos."

---

## 2. Informações do Salão

Capturar:

* nome fantasia
* telefone
* WhatsApp
* cidade
* estado
* horário funcionamento

---

## 3. Configuração Operacional

Capturar:

* intervalo padrão agenda
* duração padrão serviços
* moeda
* timezone

---

## 4. Serviços Iniciais

Permitir:

* selecionar serviços sugeridos
* adicionar novos serviços

Sugestões:

* Corte
* Escova
* Manicure
* Hidratação

---

## 5. Profissional Administrador

Exibir:

* administrador principal
* permissões
* papel operacional

Preparar:

* expansão multi-profissional futura

---

## 6. Finalização

Exibir:

* resumo configuração
* status concluído
* CTA final

CTA:
"Entrar no Bellory"

---

# 13. Estrutura de Componentes

## Estruturais

* OnboardingLayout
* OnboardingHeader
* OnboardingSidebar
* MobileStepIndicator

## Navegação

* OnboardingStepper
* StepNavigation
* OnboardingProgress

## Conteúdo

* WelcomeCard
* SetupCard
* CompletionCard

---

# 14. Hook Frontend

```text id="gwce4r"
useOnboarding()
```

Responsável por:

* carregar progresso
* salvar etapas
* recuperar onboarding
* concluir onboarding
* controlar loading

---

# 15. Service Frontend

```text id="u4oqwf"
onboarding.service.ts
```

Responsável por:

* APIs
* persistência
* normalização payloads
* tratamento erros

---

# 16. Context Frontend

```text id="ptv3wg"
OnboardingProvider.tsx
```

Responsável por:

* estado global onboarding
* progresso atual
* sincronização frontend
* persistência operacional

---

# 17. APIs Backend

## Status onboarding

```text id="lj3x9l"
GET /onboarding/status
```

---

## Atualizar etapa

```text id="2w8v8e"
PATCH /onboarding/steps/:step
```

---

## Concluir onboarding

```text id="dcrvvf"
POST /onboarding/complete
```

---

## Configurações tenant

```text id="shfww7"
GET /tenant/settings
```

---

## Atualizar tenant

```text id="6t6t2p"
PATCH /tenants/current
```

---

## Atualizar configurações

```text id="83mjlwm"
PATCH /tenants/current/settings
```

---

# 18. Salvamento Automático

O onboarding deve:

* salvar silenciosamente
* reduzir perda de progresso
* evitar necessidade de confirmação constante

---

# 19. Retomada de Fluxo

O sistema deve:

* identificar etapa atual
* reabrir fluxo automaticamente
* manter continuidade operacional

---

# 20. Navegação Protegida

O onboarding deve:

* exigir autenticação JWT
* impedir acesso sem login
* validar tenant
* validar ownership

---

# 21. UX/UI

A experiência deve ser:

* elegante
* leve
* progressiva
* extremamente intuitiva
* acolhedora

Inspirado em:

* Stripe
* Notion
* Linear
* Slack onboarding

---

# 22. Mobile-First

Priorizar:

* uso vertical
* poucos campos por etapa
* navegação touch
* progressão simples
* baixa fricção

---

# 23. Desktop

Desktop deve:

* utilizar sidebar elegante
* visão clara progresso
* visual premium clean

---

# 24. Estilo Visual

Utilizar:

* cards modernos
* glow discreto
* gradientes suaves
* glassmorphism leve
* micro animações
* transições suaves

Evitar:

* aparência formulário burocrático
* excesso campos
* poluição visual
* excesso técnico

---

# 25. Paleta Visual

## Primária

```text id="pv8hmn"
#E26D7C
```

## Hover

```text id="j3w5xa"
#D85C6C
```

## Secundária

```text id="8g2a59"
#FFE8E2
```

## Destaque

```text id="bs2dz0"
#7B4BFF
```

## Accent

```text id="c3l2ws"
#FFB3C1
```

## Fundo

```text id="lc2wdv"
#FFFDFC
```

## Texto

```text id="b03r33"
#2B2B2B
```

---

# 26. Validações

Validar:

* nome obrigatório
* WhatsApp válido
* horário válido
* serviço mínimo obrigatório
* tenant válido

---

# 27. Tratamento de Erros

Nunca exibir:

* stack traces
* SQL errors
* mensagens internas

Exibir:

* "Não foi possível salvar"
* "Tente novamente"
* "Conexão perdida"

---

# 28. Estados Operacionais

## Loading

Exibir:

* skeletons
* shimmer
* loading elegante

---

## Empty State

Exibir:

* incentivo operacional
* mensagens amigáveis

---

## Error State

Exibir:

* feedback amigável
* retry simples

---

# 29. Integração Dashboard

Após conclusão:

* redirecionar dashboard
* ativar experiência operacional

---

# 30. Integração Agenda

Configurar:

* parâmetros iniciais agenda
* horários padrão
* duração serviços

---

# 31. Integração Serviços

Criar:

* serviços iniciais
* catálogo operacional mínimo

---

# 32. Integração Auth

Consumir:

* JWT
* sessão autenticada
* tenant atual
* usuário atual

---

# 33. Integração AI Engine

Futuro suporte para:

* onboarding inteligente
* sugestões automáticas
* configuração assistida IA
* recomendações operacionais

---

# 34. Multi-Tenant

Toda operação deve respeitar:

* tenant_id
* ownership
* isolamento tenant

---

# 35. Performance

Priorizar:

* baixo payload
* salvamento incremental
* carregamento rápido
* recuperação eficiente

---

# 36. Polling e Realtime

## MVP Inicial

Atualização via:

* salvamento progressivo
* sincronização simples

---

## Futuro

Preparar:

* realtime sync
* colaboração
* onboarding assistido

---

# 37. Segurança

Garantir:

* autenticação JWT
* proteção rotas
* ownership validation
* validação tenant

Nunca permitir:

* acesso cross-tenant
* alteração indevida

---

# 38. Escalabilidade Futura

Arquitetura preparada para:

* onboarding multi-unidade
* onboarding IA
* onboarding contextual
* templates nicho
* automações setup
* franquias
* marketplace

---

# 39. Objetivo Final

O módulo Onboarding deve representar:

* ativação inteligente
* automação invisível
* redução de fricção
* profissionalização inicial

O usuário deve sentir:

"O Bellory já montou meu salão para mim."