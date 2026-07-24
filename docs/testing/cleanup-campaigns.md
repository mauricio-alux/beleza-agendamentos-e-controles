# Limpeza transacional de campanhas via SQL

Este documento descreve o script SQL para limpar dados transacionais do modulo
de campanhas diretamente pelo Supabase SQL Editor.

O script nao recria tenants nem apaga cadastros estruturais. Ele existe para
reiniciar testes do ciclo:

```text
oportunidade identificada
campanha sugerida
tenant aprova ou rejeita
tenant parametriza
mensagens sao preparadas ou geradas
campanha e finalizada
```

## Arquivo

```text
database/scripts/cleanup-campaigns.sql
```

O arquivo deve ser aplicado em uma sessao SQL do Supabase junto com os `set
app.*` de configuracao.

## Dry-run por tenant

```sql
set app.environment = 'development';
set app.cleanup_campaigns_scope = 'tenant';
set app.cleanup_campaigns_mode = 'dry_run';
set app.cleanup_campaigns_tenant_slug = 'espaco-vivian-beauty';
set app.cleanup_campaigns_confirm = 'DRY_RUN_CAMPAIGNS';
```

Depois execute `database/scripts/cleanup-campaigns.sql` na mesma sessao.

## Limpeza real por tenant

```sql
set app.environment = 'development';
set app.cleanup_campaigns_scope = 'tenant';
set app.cleanup_campaigns_mode = 'execute';
set app.cleanup_campaigns_tenant_slug = 'espaco-vivian-beauty';
set app.cleanup_campaigns_confirm = 'CLEAN_TENANT_CAMPAIGNS';
```

Tambem e possivel usar `tenant_id`:

```sql
set app.cleanup_campaigns_tenant_id = '00000000-0000-0000-0000-000000000000';
```

Use `tenant_id` ou `tenant_slug`, nunca ambos.

## Dry-run global

```sql
set app.environment = 'development';
set app.cleanup_campaigns_scope = 'all';
set app.cleanup_campaigns_mode = 'dry_run';
set app.cleanup_campaigns_confirm = 'DRY_RUN_CAMPAIGNS';
```

## Limpeza real global

```sql
set app.environment = 'development';
set app.cleanup_campaigns_scope = 'all';
set app.cleanup_campaigns_mode = 'execute';
set app.cleanup_campaigns_confirm = 'CLEAN_ALL_CAMPAIGNS';
```

A limpeza global real exige confirmacao diferente da limpeza por tenant.

## Ambientes permitidos

Permitidos:

- `development`
- `dev`
- `local`
- `test`
- `homologation`
- `hml`

Bloqueados:

- `production`
- `prod`
- `prd`
- qualquer valor nao reconhecido

Se o ambiente for bloqueado, o script aborta antes das exclusoes.

## Tabelas identificadas

Na modelagem atual, as estruturas relacionadas ao ciclo de campanhas sao:

- `campanhas`
- `campanha_publicos`
- `campanha_envios`
- `mensagens_whatsapp`
- `campanha_acessos`
- `jobs_notificacao`
- `ia_sugestoes`
- `cupons`
- `cupom_servicos`
- `cupom_usos`
- `templates_mensagem`
- `platform_campaigns`

`templates_mensagem` e `platform_campaigns` sao catalogos/estruturas e ficam
preservadas.

## Tabelas limpas

Quando existem no schema, sao processadas nesta ordem:

1. `mensagens_whatsapp`
2. `jobs_notificacao`
3. `ia_sugestoes`
4. `campanha_acessos`
5. `campanha_envios`
6. `campanha_publicos`
7. `cupom_usos`
8. `cupom_servicos`
9. `cupons`
10. `campanhas`

A ordem remove filhos antes da tabela pai e evita `TRUNCATE` ou `CASCADE`
indiscriminado.

## Tabelas preservadas

O script nao apaga automaticamente:

- `tenants`
- `usuarios`
- `clientes`
- `cliente_tenants`
- `profissionais`
- `servicos`
- `agendamentos`
- `categorias`
- `especialidades`
- `templates_mensagem`
- `whatsapp_contas`
- configuracoes WhatsApp do tenant
- `platform_campaigns`

Templates globais do MasterAdmin e catalogos SaaS de campanha permanecem
preservados.

## Criterio para mensagens WhatsApp

`mensagens_whatsapp` e limpa somente quando houver vinculo seguro com campanhas
do tenant:

- `campanha_id` aponta para uma campanha alvo; ou
- `campanha_envio_id` aponta para um envio alvo.

Mensagens operacionais de agenda, como `appointment.created`,
`appointment.confirmed`, `appointment.cancelled`, `appointment.rescheduled`,
`appointment.reminder_24h`, `appointment.reminder_2h`,
`appointment.completed` e `appointment.no_show`, sao preservadas quando nao
possuem esses vinculos de campanha.

Se no futuro existirem mensagens de campanha sem `campanha_id` e sem
`campanha_envio_id`, o script nao deve fazer `DELETE` generico. A adequacao
minima recomendada e tornar obrigatorio o vinculo por um desses campos ou por
uma origem estruturada equivalente.

## Relatorio

Ao final, o SQL retorna um relatorio com:

- modo (`dry_run` ou `execute`);
- escopo (`tenant` ou `all`);
- tenants processados;
- tabelas selecionadas;
- registros que seriam removidos ou foram removidos;
- tabelas preservadas;
- tabelas ausentes no schema, quando houver.

Em `dry_run`, a operacao registrada e `would_delete` e nenhum `DELETE` e
executado.

## Cuidados

- Execute dry-run antes da limpeza real.
- Nao use `scope = 'all'` sem revisar o dry-run global.
- Execute os `set app.*` e o script SQL na mesma sessao.
- Nao altere os criterios de `mensagens_whatsapp` para remover por tenant sem
  campanha, pois isso apagaria mensagens operacionais.
- Caso novas tabelas transacionais sejam adicionadas ao ciclo de campanhas,
  atualize este documento e `database/scripts/cleanup-campaigns.sql` juntos.
