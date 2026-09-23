# Compatibilidade mobile do identificador de sessao do Public Booking

## Escopo e diagnostico

Correcao pontual solicitada no documento 4.1.2. A auditoria anterior a alteracao
encontrou uma unica chamada a `crypto.randomUUID()` no frontend, no `useEffect`
de `PublicBookingPage.tsx`, executado no navegador. Nao havia helper equivalente
nem teste que pressupusesse a disponibilidade dessa API.

O `sessao_id` acompanha registros de acesso no Public Booking. Os validadores
aceitam uma string de ate 120 caracteres e o banco possui `varchar(120)`;
nao existe exigencia de UUID RFC 4122 nesse contrato. A autenticacao do cliente
continua baseada no token validado para o tenant, nao no identificador de sessao.

## Causa e compatibilidade

A chamada incondicional a uma API ausente causa o TypeError informado.
`crypto.randomUUID()` exige secure context e suporte do navegador. HTTP em um
IP privado da rede local normalmente nao e um contexto seguro. Ja localhost
no desktop pode ser considerado uma origem confiavel mesmo em HTTP. Portanto,
se o desktop usava localhost, a diferenca de origem explica o comportamento;
nao se pode atribuir a falha apenas ao celular. O navegador e sua versao nao
foram informados e ainda precisam ser confirmados no reteste manual.

`getRandomValues()` pode ser usado em contexto inseguro e fornece aleatoriedade
criptografica. A correcao nao altera flags do navegador nem simula secure context.

Referencias:
- https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID
- https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues
- https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts

## Implementacao

- `frontend/src/lib/session-id.ts`: helper centralizado; prefere `randomUUID`
  quando for uma funcao; caso contrario usa 16 bytes de `getRandomValues` e
  ajusta os bits de versao e variante para produzir UUID v4.
- `frontend/src/components/public-booking/PublicBookingPage.tsx`: substitui a
  geracao direta pelo helper, preservando a chave existente de sessionStorage.
- `frontend/src/lib/session-id.test.js`: cobre API nativa, fallback, reutilizacao,
  persistencia, ausencia de PII e indisponibilidade de ambas as APIs.

Um ID existente e reutilizado sem nova geracao ou escrita. Um ID ausente ou vazio
e gerado e persistido. Nao se usa Math.random, PII ou marca no gerador.
Na ausencia de ambas as APIs criptograficas, o helper falha explicitamente sem
persistir um identificador fraco. Esse ambiente nao e coberto pelo fallback.
Nao houve outros usos equivalentes a migrar.

## Validacao e reteste

Os 6 testes novos, 12 testes de armazenamento de acesso recorrente, 4 testes de
catalogo publico e 14 testes de identidade passaram. A suite do backend deve
ser executada a partir de `backend` para carregar sua configuracao de ambiente.
TypeScript: `npx tsc --noEmit` aprovado.
Build: `npm run build` aprovado, com 44 paginas geradas. A primeira tentativa
encontrou EPERM em `.next/trace`; o build passou apos parar o servidor de
desenvolvimento e executar com a permissao necessaria. O frontend foi reiniciado.
`git diff --check`: aprovado, sem erros de whitespace.

O teste manual no celular permanece pendente: abrir a URL HTTP pelo IP da rede
local, verificar ausencia do TypeError, existencia do ID na chave da sessao e
reutilizacao apos recarregar a mesma aba. Confirmar tambem o fluxo de identidade
do tenant. A Fase 0.6B nao esta validada por esta correcao.

Sem alteracao de backend, arquitetura tenant-first, identidade tenant-scoped,
preferred-tenant ou known-tenants nesta tarefa. Alteracoes anteriores existentes
na arvore de trabalho foram preservadas.

SEM MIGRATION. SEM DB PUSH. SEM SEED. SEM RESET. SEM COMMIT. SEM PUSH.
