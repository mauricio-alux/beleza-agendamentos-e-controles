# Campanhas MVP 2.9

O MVP implementado usa WhatsApp como unico canal operacional de campanhas.
Campanhas nao chamam o provider diretamente: no modo automatico, cada disparo
gera registros em `public.mensagens_whatsapp`, e o worker centralizado de
WhatsApp faz o envio.

Atualizacao arquitetural: o canal de entrega deve ser tratado como uma
capacidade do tenant, nao como uma variacao da entidade campanha. A campanha
continua sendo a mesma; o Bellory adapta a execucao conforme o tenant tenha
WhatsApp Business API disponivel ou apenas WhatsApp comum/Business App.

## Fluxo

1. O tenant cria ou agenda uma campanha.
2. A campanha seleciona publico, template e parametros.
3. Ao iniciar, o backend estima a audiencia e gera um envio por cliente elegivel.
4. Cada envio cria um registro em `campanha_envios` e uma mensagem em `mensagens_whatsapp`.
5. A fila de WhatsApp processa mensagens `pendente`, `agendado` ou `retry`.
6. Webhooks e processamento atualizam status e metricas.

## Modos de entrega

### Modo automatico - WhatsApp Business API

Usado quando o tenant possui capacidade de envio por Cloud API, diretamente ou
pela infraestrutura central do Bellory. Nesse modo:

- a campanha gera mensagens individuais;
- `campanha_envios` registra cada destinatario elegivel;
- `mensagens_whatsapp` guarda fila, snapshot, status, provider e auditoria;
- envio real exige template aprovado no provider, nome do template e idioma;
- dry-run permite validar a fila sem chamar a Meta.

### Modo assistido - WhatsApp comum ou Business App

Usado quando o tenant nao possui Cloud API disponivel. Nesse modo, o Bellory
nao envia mensagens em nome do tenant. O produto deve preparar a campanha para
envio manual pelo usuario, explorando recursos nativos do WhatsApp, em especial
Listas de Transmissao.

O modo assistido tambem e o fluxo recomendado para o primeiro convite, mesmo em
tenants com WhatsApp Business App + Cloud API em coexistencia, porque os
contatos do aplicativo nao estao necessariamente cadastrados no Bellory.

Fluxo recomendado:

1. Selecionar clientes elegiveis no Bellory.
2. Gerar texto da campanha a partir de template e parametros.
3. Gerar link publico de agendamento da campanha.
4. Permitir copiar ou compartilhar a mensagem.
5. Abrir WhatsApp/WhatsApp Web quando aplicavel.
6. Orientar o usuario a enviar pela sua Lista de Transmissao.
7. Registrar internamente que a campanha foi preparada e, opcionalmente, que o
   usuario confirmou o envio manual.

Esse modo agrega valor mesmo sem automacao da Meta, mas nao deve ser descrito
como envio automatico nem como confirmacao de entrega. A auditoria possivel e
de preparacao/confirmacao manual, nao de status tecnico de entrega, leitura ou
falha.

## Regras de envio

- O canal do MVP e sempre `whatsapp`.
- O modo de entrega depende da capacidade do tenant: automatico por Business
  API ou assistido por WhatsApp comum/Business App.
- Primeiro convite e ativacao inicial: nao exige cadastro previo dos
  destinatarios e nao deve criar registros de cliente antes do primeiro acesso
  pelo link publico.
- Campanhas recorrentes sao relacionamento continuo: usam clientes ja
  conhecidos pelo Bellory e podem gerar `campanha_envios` e
  `mensagens_whatsapp` quando o modo automatico estiver disponivel.
- Templates sao lidos de `templates_mensagem`.
- Templates de campanha devem ser `tipo = marketing` ou marcados como catalogo de campanha em `metadata`.
- Envio real exige template ativo, aprovado no provider, com nome de provider e idioma.
- Em dry-run, o sistema pode gerar preview e fila sem envio externo real.
- Placeholders seguem formato posicional `{{1}}`, `{{2}}`; a ordem semantica vem de `variaveis`.
- Listas de Transmissao do WhatsApp comum so entregam para contatos que tenham
  salvo o numero do profissional/salao na agenda do celular. Por isso, o modo
  assistido e mais adequado para clientes recorrentes e nao substitui Cloud API
  ou campanhas patrocinadas para prospeccao ampla.

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
