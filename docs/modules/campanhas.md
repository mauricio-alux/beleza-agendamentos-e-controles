O `campanhas.md` é um dos módulos mais estratégicos comercialmente no Bellory, porque ele representa:

* crescimento automático do salão
* retenção operacional
* recuperação de clientes
* ativação comercial simplificada
* marketing automatizado via WhatsApp

Esse é um dos maiores diferenciais do Bellory.

A maioria dos pequenos profissionais:

* não sabe fazer marketing
* não cria campanhas
* não possui automação
* depende apenas do boca-a-boca

O Bellory resolve isso criando:

* campanhas simples
* campanhas automatizadas
* campanhas assistidas por IA
* comunicação operacional inteligente

O módulo Campaigns NÃO deve parecer:

* ferramenta complexa de marketing
* gerenciador técnico de anúncios
* automação corporativa pesada

Ele deve parecer:

* assistente de vendas
* marketing automático
* promoção inteligente
* recuperação automática de clientes

O usuário deve sentir:

“O Bellory ajuda meu salão a vender sozinho.”

Abaixo está a especificação consolidada profissional do módulo.

---

# docs/modules/campaigns.md

````md id="camp91x"
# Campaigns Module — Bellory

# 1. Objetivo do Módulo

O módulo Campaigns é responsável por:

- criar campanhas promocionais
- aumentar retenção
- recuperar clientes
- aumentar recorrência
- automatizar relacionamento comercial
- impulsionar faturamento

O objetivo principal é:
transformar comunicação em crescimento operacional.

---

# 2. Papel Estratégico

O módulo Campaigns representa:
- motor comercial do Bellory
- automação marketing operacional
- recuperação clientes
- retenção automatizada
- crescimento assistido

O módulo NÃO deve parecer:
- plataforma complexa anúncios
- gerenciador técnico marketing
- CRM corporativo pesado

Deve parecer:
- assistente comercial inteligente
- ferramenta simples promoções
- automação invisível

---

# 3. Objetivo UX

O usuário deve sentir:

"O Bellory me ajuda a trazer clientes automaticamente."

A experiência deve transmitir:
- simplicidade
- automação
- crescimento
- praticidade
- inteligência

---

# 4. Público-Alvo

O módulo foi projetado para:
- profissionais autônomos
- pequenos salões
- baixa maturidade tecnológica
- operação mobile-first

---

# 5. Conceito Arquitetural

O módulo Campaigns deve funcionar como:

- camada comercial automatizada
- sistema operacional campanhas
- estrutura promoção integrada
- motor relacionamento comercial

O módulo deve:
- integrar CRM
- integrar WhatsApp
- integrar IA
- integrar Agenda
- utilizar segmentações inteligentes

---

# 6. Estrutura Backend

```text
backend/src/modules/campaigns/
  controllers/
  services/
  repositories/
  validators/
  routes/
  dto/
````

---

# 7. Estrutura Frontend

```text id="camp11a"
frontend/src/
  app/
    campanhas/
  components/
    campaigns/
  hooks/
  services/
```

---

# 8. Rotas Frontend

## Campanhas

```text id="camp22b"
/campanhas
```

---

## Nova campanha

```text id="camp33c"
/campanhas/nova
```

---

## Detalhes campanha

```text id="camp44d"
/campanhas/[id]
```

---

# 9. Objetivos Operacionais

O módulo deve permitir:

* criar campanhas
* programar campanhas
* segmentar clientes
* enviar promoções
* acompanhar engajamento
* recuperar clientes
* aumentar recorrência

---

# 10. Tipos de Campanhas

## Promoções

Exemplo:

* desconto
* pacote promocional
* semana especial

---

## Recuperação Clientes

Exemplo:

* clientes inativos
* clientes sem retorno

---

## Datas Comemorativas

Exemplo:

* Dia das mães
* Dia da mulher
* Natal
* Ano novo

---

## Fidelização

Exemplo:

* retorno automático
* bônus recorrência
* cupons fidelidade

---

## Relacionamento

Exemplo:

* aniversário
* agradecimento
* pós-atendimento

---

# 11. Entidades Principais

## Campanha

Representa:

* campanha principal

---

## Destaque

Representa:

* template promocional

---

## DestaqueSalao

Representa:

* customização tenant

---

## Cupom

Representa:

* benefício operacional

---

## Cliente

Representa:

* público alvo

---

# 12. Estrutura Campanha

Cada campanha deve possuir:

* título
* descrição
* imagem
* mensagem
* público alvo
* período
* status
* canal envio
* CTA

---

# 13. Status Campanha

## Status possíveis

```text id="camp55e"
rascunho
agendada
ativa
pausada
finalizada
cancelada
```

---

# 14. Segmentação Clientes

Permitir segmentar:

* clientes ativos
* clientes inativos
* aniversariantes
* recorrentes
* VIP
* risco abandono
* clientes novos

---

# 15. Integração CRM

Consumir:

* segmentações
* frequência clientes
* retenção
* recorrência

---

# 16. Integração WhatsApp

O WhatsApp é o principal canal operacional.

Permitir:

* envio campanhas
* envio promoções
* lembretes
* mensagens automáticas
* CTA agendamento

---

# 17. Integração Agenda

Campanhas devem:

* incentivar novos agendamentos
* aumentar ocupação
* reduzir horários ociosos

---

# 18. Integração AI Engine

Futuro suporte para:

* campanhas automáticas
* sugestões inteligentes
* previsão engajamento
* previsão retorno
* mensagens IA
* automação contextual

---

# 19. Templates Campanhas

O sistema deve possuir:

* templates prontos
* campanhas rápidas
* campanhas inteligentes

---

# 20. Biblioteca Visual

Preparar:

* imagens promocionais
* banners
* artes campanhas
* assets marketing

---

# 21. Campanhas Assistidas

Futuro:

* IA sugere campanhas
* IA sugere horários
* IA sugere públicos
* IA sugere mensagens

---

# 22. Cupons

Campanhas podem gerar:

* cupons
* descontos
* bônus
* promoções limitadas

---

# 23. KPIs Campaigns

Exibir:

* campanhas ativas
* taxa abertura
* taxa retorno
* clientes recuperados
* agendamentos gerados
* faturamento associado

---

# 24. APIs Backend

## Listar campanhas

```text id="camp66f"
GET /campaigns
```

---

## Criar campanha

```text id="camp77g"
POST /campaigns
```

---

## Atualizar campanha

```text id="camp88h"
PATCH /campaigns/:id
```

---

## Enviar campanha

```text id="camp99i"
POST /campaigns/:id/send
```

---

## KPIs campanhas

```text id="camp00j"
GET /campaigns/kpis
```

---

# 25. Hook Frontend

```text id="camp12k"
useCampaigns()
```

Responsável por:

* carregar campanhas
* criar campanhas
* segmentações
* métricas
* status campanhas

---

# 26. Service Frontend

```text id="camp13l"
campaigns.service.ts
```

Responsável por:

* APIs
* payloads
* normalização
* tratamento erros

---

# 27. Componentes Frontend

## Estruturais

* CampaignLayout
* CampaignBuilder
* CampaignPreview

## Operacionais

* CampaignCard
* CampaignMetrics
* CampaignAudience
* CampaignScheduler
* CouponGenerator

## Estados

* EmptyCampaignState

---

# 28. Funcionalidades Frontend

Permitir:

* criar campanhas
* editar campanhas
* agendar envio
* visualizar métricas
* segmentar público
* gerar cupons
* visualizar preview

---

# 29. UX/UI

A experiência deve ser:

* visual
* intuitiva
* moderna
* acolhedora
* extremamente simples

Inspirado em:

* Canva simplificado
* Mailchimp simplificado
* Notion
* Fresha

---

# 30. Mobile-First

Priorizar:

* criação rápida campanhas
* templates touch
* poucos cliques
* preview vertical
* navegação simples

---

# 31. Desktop

Desktop deve:

* utilizar grids modernos
* visual marketing clean
* edição confortável
* métricas organizadas

---

# 32. Estilo Visual

Utilizar:

* cards modernos
* gradientes suaves
* glow discreto
* micro animações
* glassmorphism leve

Evitar:

* excesso técnico
* aparência corporativa
* visual ERP

---

# 33. Paleta Visual

## Primária

```text id="camp14m"
#E26D7C
```

## Hover

```text id="camp15n"
#D85C6C
```

## Secundária

```text id="camp16o"
#FFE8E2
```

## Destaque

```text id="camp17p"
#7B4BFF
```

## Accent

```text id="camp18q"
#FFB3C1
```

## Fundo

```text id="camp19r"
#FFFDFC
```

## Texto

```text id="camp20s"
#2B2B2B
```

---

# 34. Automações Futuras

Preparar:

* campanhas automáticas
* retorno automático
* recuperação clientes
* campanhas recorrentes
* campanhas sazonais

---

# 35. Agendamentos Inteligentes

Campanhas futuras devem:

* sugerir horários livres
* preencher agenda ociosa
* incentivar baixa ocupação

---

# 36. Segurança

Garantir:

* autenticação JWT
* ownership validation
* tenant isolation
* proteção campanhas

Nunca permitir:

* campanhas cross-tenant
* vazamento contatos

---

# 37. Multi-Tenant

Toda operação deve respeitar:

* tenant_id
* permissões
* ownership

---

# 38. Privacidade

Preparar:

* LGPD
* opt-out campanhas
* consentimento mensagens
* bloqueio contatos

---

# 39. Tratamento de Erros

Nunca exibir:

* SQL errors
* stack traces
* erros internos

Exibir:

* "Não foi possível enviar campanha"
* "Tente novamente"

---

# 40. Estados Operacionais

## Loading

Exibir:

* shimmer
* loading elegante
* skeletons

---

## Empty State

Exibir:

* incentivo campanhas
* sugestões marketing

Exemplo:
"Crie campanhas e atraia mais clientes."

---

## Error State

Exibir:

* retry simples
* mensagens amigáveis

---

# 41. Polling e Realtime

## MVP Inicial

Atualização:

* polling leve

---

## Futuro

Preparar:

* envio realtime
* métricas instantâneas
* atualizações live

---

# 42. Performance

Priorizar:

* filas futuras
* envio assíncrono
* paginação
* lazy loading
* cache futuro

---

# 43. Escalabilidade Futura

Arquitetura preparada para:

* IA campanhas
* marketplace templates
* campanhas multi-canal
* push notifications
* email marketing
* automações avançadas
* funis retenção

---

# 44. Objetivo Final

O módulo Campaigns deve representar:

* crescimento automático
* marketing simplificado
* retenção inteligente
* recuperação operacional

O usuário deve sentir:

"O Bellory ajuda meu salão a crescer automaticamente."