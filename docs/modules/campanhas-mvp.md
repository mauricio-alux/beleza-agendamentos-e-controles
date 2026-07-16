# Campanhas MVP 2.9

O MVP implementado usa WhatsApp como unico canal operacional de campanhas.
Campanhas nao chamam o provider diretamente: cada disparo gera registros em
`public.mensagens_whatsapp`, e o worker centralizado de WhatsApp faz o envio.

## Fluxo

1. O tenant cria ou agenda uma campanha.
2. A campanha seleciona publico, template e parametros.
3. Ao iniciar, o backend estima a audiencia e gera um envio por cliente elegivel.
4. Cada envio cria um registro em `campanha_envios` e uma mensagem em `mensagens_whatsapp`.
5. A fila de WhatsApp processa mensagens `pendente`, `agendado` ou `retry`.
6. Webhooks e processamento atualizam status e metricas.

## Regras de envio

- O canal do MVP e sempre `whatsapp`.
- Templates sao lidos de `templates_mensagem`.
- Templates de campanha devem ser `tipo = marketing` ou marcados como catalogo de campanha em `metadata`.
- Envio real exige template ativo, aprovado no provider, com nome de provider e idioma.
- Em dry-run, o sistema pode gerar preview e fila sem envio externo real.
- Placeholders seguem formato posicional `{{1}}`, `{{2}}`; a ordem semantica vem de `variaveis`.

## Idempotencia

Cada mensagem de campanha usa chave:

```text
tenant_id:campanha_id:cliente_id:template_id
```

Essa chave impede duplicidade quando a mesma campanha for processada mais de uma vez.

## Cancelamento

Cancelar uma campanha marca apenas mensagens ainda nao submetidas como canceladas:

- `pendente`
- `agendado`
- `retry`

Mensagens ja submetidas ao provider nao sao revertidas pelo cancelamento.

## Cupons

Campanhas podem associar cupons como mecanismo de rastreio e beneficio.

Tipos suportados:

- `percentual`
- `valor`
- `preco_promocional`

O backend permite criar cupons vinculados a campanha, com validade, limites e
restricao futura por servico via `cupom_servicos`.

## APIs

```text
GET    /campaigns
POST   /campaigns
GET    /campaigns/meta
GET    /campaigns/:id
PATCH  /campaigns/:id
POST   /campaigns/:id/estimate
POST   /campaigns/:id/preview
POST   /campaigns/:id/start
POST   /campaigns/:id/schedule
POST   /campaigns/:id/cancel
GET    /campaigns/:id/messages
GET    /campaigns/:id/metrics
POST   /campaigns/coupons
```

## Dados de teste

A carga de testes controlada esta documentada em
`docs/testing/campaign-test-data.md`.
