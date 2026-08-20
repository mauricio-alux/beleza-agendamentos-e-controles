# Automacoes de Relacionamento

## Feliz aniversario

`Feliz aniversario` e uma automacao de relacionamento separada do modulo de
Campanhas. Ela nao altera nem substitui a campanha manual `Aniversariantes do
mes`.

Fluxo oficial:

```text
scheduler
  -> birthday_greetings.process
  -> tenant_automacoes_relacionamento
  -> cliente_tenants + clientes
  -> templates_mensagem/birthday_greeting
  -> mensagens_whatsapp
  -> whatsapp.process
  -> provider WhatsApp
```

## Diferenca para campanhas

- `Aniversariantes do mes`: campanha manual. O usuario inicia a campanha,
  o sistema identifica clientes com aniversario no mes corrente e gera a fila
  imediatamente para todos os elegiveis do mes.
- `Feliz aniversario`: automacao diaria. O sistema avalia cada tenant ativo e
  enfileira a mensagem somente quando o dia/mes atual do timezone configurado
  coincide com `clientes.data_nascimento`.

## Gatilho

A automacao compara o dia e o mes da data local do tenant com
`clientes.data_nascimento`, ignorando o ano.

Regra de 29/02:

- em anos bissextos, clientes nascidos em 29/02 recebem em 29/02;
- em anos nao bissextos, clientes nascidos em 29/02 recebem em 28/02.

## Horario

O envio nao ocorre a meia-noite. Cada tenant possui configuracao em
`tenant_automacoes_relacionamento.horario_envio`, com padrao `09:00`.

O timezone tambem e configuravel em `tenant_automacoes_relacionamento.timezone`,
com padrao `America/Sao_Paulo`.

Se o scheduler rodar antes do horario configurado, a automacao nao gera fila.
Se rodar depois do horario, ela ainda pode gerar a mensagem do dia. A
idempotencia anual impede duplicidade em reprocessamentos e reinicios.

## Elegibilidade

A automacao reaproveita a base de publico de campanhas e aplica filtros de
relacionamento:

- cliente existente;
- vinculo ativo com o tenant;
- cliente ativo e nao deletado;
- telefone valido para WhatsApp;
- usuario interno do tenant excluido;
- `aceita_campanhas` precisa permitir contato;
- `metadata.opt_out_whatsapp=true` exclui;
- `metadata.permite_marketing=false` exclui;
- status `bloqueado` ou `metadata.bloqueado_comunicacao=true` exclui;
- `clientes.data_nascimento` precisa ser valida e coincidir com o dia.

Mesmo sendo relacionamento, a mensagem usa categoria WhatsApp `Marketing`,
porque e uma iniciativa ativa do negocio para o cliente. Por isso, consentimento
e opt-out sao obrigatorios.

## Template

A automacao usa `templates_mensagem.nome = birthday_greeting`.

Contrato inicial:

- `canal = whatsapp`;
- `tipo = marketing`;
- `metadata.categoria = relacionamento`;
- `metadata.categoria_provider = Marketing`;
- `metadata.provider_template_name = birthday_greeting`;
- `metadata.language = pt_BR`;
- parametros posicionais;
- variaveis iniciais: `nome_cliente`, `nome_salao`;
- `aprovado_provider = false` por padrao.

Dry-run pode enfileirar template pendente. Envio real com
`WHATSAPP_DRY_RUN=false` exige `aprovado_provider=true`,
`provider_template_name` e `language`.

## Idempotencia

A chave anual e:

```text
tenant_id:cliente_id:birthday_greeting:ano
```

A mesma pessoa pode receber uma mensagem por ano em cada tenant no qual seja
cliente elegivel. Reprocessamentos no mesmo dia e reinicios do scheduler nao
duplicam a fila. No ano seguinte, a chave muda e permite novo envio.

## Configuracao MVP

A migration cria `tenant_automacoes_relacionamento` com:

- `ativo`;
- `template_id`;
- `horario_envio`;
- `timezone`;
- `metadata`.

Os registros de tenant nascem inativos por padrao para evitar disparo surpresa.
Cupons de aniversario ficam preparados por metadata (`future_coupon_ready`),
mas nenhum cupom e gerado neste MVP.

## Metricas

As mensagens ficam em `mensagens_whatsapp` com
`tipo_evento = birthday.greeting` e `payload.automation_type =
birthday_greeting`. Metricas devem ser calculadas separadamente das campanhas
manuais, filtrando por esse evento/tipo de automacao.
