# Migrations do Bellory

## Fonte canonica

A unica fonte canonica oficial de migrations do Bellory e:

```text
supabase/migrations
```

## Nova migration

Toda nova migration do Bellory deve ser criada exclusivamente em:

```text
supabase/migrations
```

Nao criar novas migrations em:

```text
database/migrations
```

Esse diretorio foi descontinuado como fonte operacional de migrations.

## Migration ja aplicada

Migration aplicada ao Supabase remoto e historica. Nao editar, renomear,
recriar com outro timestamp ou remover do historico operacional.

Quando uma correcao for necessaria, criar uma nova migration compensatoria em
`supabase/migrations`.

## Comandos

Use `supabase migration list` para diagnosticar o alinhamento entre migrations
locais e remotas.

Use `supabase db push` somente em execucao controlada e revisada. Antes de
executar, confirmar quais migrations estao pendentes e revisar o SQL.

Nunca usar `supabase db reset` ou `supabase migration repair` como atalho de
rotina para corrigir divergencias historicas.

## Validacao local

Antes de concluir alteracoes relacionadas a banco, execute:

```text
npm run check:migrations
```

Essa validacao falha se encontrar migrations `.sql` em `database/migrations`,
timestamps duplicados em `supabase/migrations`, nomes duplicados ou ausencia do
diretorio canonico.
