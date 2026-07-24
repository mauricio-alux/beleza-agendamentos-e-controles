# Git Workflow

## Branches

`master` representa somente estado estavel do projeto.

Novas demandas funcionais nao devem ser desenvolvidas diretamente em `master`.

## Nova Demanda

Fluxo recomendado:

```text
git status
working tree clean
git switch -c fix/<nome>
ou
git switch -c feature/<nome>
CODEX implementa
testes
review
commit
merge controlado em master
```

Antes de iniciar uma nova demanda funcional relevante, o CODEX deve confirmar que o working tree esta limpo ou informar explicitamente quais alteracoes pendentes ja existiam.

O CODEX nao deve aproveitar uma demanda para executar backlog, TODOs ou alteracoes nao solicitadas.

Nenhuma migration deve ser aplicada ao remoto sem autorizacao explicita.

## Checkpoints Criticos

Antes de mudancas em migrations, RBAC, WhatsApp, campaign engine, agenda engine, autenticacao ou multi-tenant, crie um checkpoint ou garanta uma branch limpa antes da execucao.

## Migrations

Fonte canonica:

```text
supabase/migrations
```

Toda migration deve ser commitada no Git.

Fluxo:

```text
criar migration
revisar
commit
aplicar controladamente
```

Nunca deixe migration aplicada no remoto sem versao correspondente no Git.
