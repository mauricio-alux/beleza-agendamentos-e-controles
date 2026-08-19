# Campaign Test Data

Este documento descreve a carga controlada de dados para testes do modulo de
campanhas, cupons, agenda e historico no novo MER de Servicos.

## Escopo

A carga ativa usa o marcador `campaign_test_v3` para criar dados
deterministicos, idempotentes e removiveis. O cleanup tambem reconhece a massa
antiga `campaign_test_seed_2026` apenas para saneamento controlado. Ela prepara
dois tenants de teste:

- `Espaco Vivian Beauty`
- `Bellory Test Studio`

O script considera apenas usuarios com os perfis:

- `Funcionario`
- `Terceiro`
- `Autonomo`
- `Administrador`

O perfil `Profissional Adm` e explicitamente excluido da carga, mesmo quando existir no tenant.

Fontes oficiais usadas pela massa `campaign_test_v3`:

- `servicos_catalogo`
- `servico_tenants`
- `servico_catalogo_especialidades`
- `servico_tenant_especialidades`

As tabelas legadas `servicos`, `servico_especialidades` e
`profissional_servicos` nao sao fonte estrutural da massa `campaign_test_v3`.
Clientes criados pela massa usam nomes naturais; informacoes tecnicas ficam em
`metadata`.

## Comandos

Execute a partir de `backend/` somente depois de revisar o audit:

```bash
npm run campaign-test:audit
npm run campaign-test:reconcile -- --dry-run
npm run campaign-test:reconcile
npm run campaign-test:cleanup -- --confirm-campaign-test-cleanup
npm run campaign-test:seed
npm run campaign-test:validate
```

O comando `campaign-test:audit` nao altera dados. Ele lista tenants encontrados, usuarios, profissionais, servicos, templates e a contagem planejada por tabela antes de qualquer seed.

O comando `campaign-test:reconcile` e uma manutencao controlada, menor que um
seed completo. Ele atua somente nos registros marcados com
`metadata.seed = campaign_test_v3` e `metadata.scenario = future_blocks_recovery`
quando o agendamento que deveria bloquear recuperacao de inativos deixou de ser
futuro. Use primeiro `npm run campaign-test:reconcile -- --dry-run` para revisar
cliente, tenant, appointment, data anterior e nova data planejada. A execucao sem
`--dry-run` atualiza apenas `data_inicio` e `data_fim` do agendamento
`future-confirmed` expirado, preservando cliente, servico, especialidade,
profissional, status e demais cenarios.

Antes do ciclo `campaign-test:*`, valide tambem se as ofertas existentes do
tenant respeitam os tipos de negocio ativos:

```bash
cd backend
npm run audit:tenant-service-catalog -- --tenant-id=<tenant_id> --only-invalid
```

O saneamento de referencia da base apos o novo MER esta em
`docs/maintenance/saneamento-base-testes-novo-mer.md`.

## Relatorio detalhado do audit

O `campaign-test:audit` deve ser usado como relatorio de revisao antes da carga. A saida inclui, por tenant:

- tenants considerados e se foram encontrados;
- usuarios encontrados, usuarios elegiveis e usuarios excluidos com motivo;
- quantidade de usuarios por perfil;
- quantidade prevista de clientes por usuario;
- relacao prevista entre usuario, cliente, cenario, servico e profissional;
- registros existentes da propria massa ja marcados com `campaign_test_v3` ou
  `campaign_test_seed_2026`;
- novos registros previstos por tabela;
- marcador ou chave tecnica usada para identificar cada tabela;
- distribuicao dos clientes por cenario, incluindo sobreposicoes intencionais;
- agendas e historicos previstos por status e periodo relativo;
- servicos e profissionais reutilizados e se ha vinculo valido;
- cupons previstos;
- campanhas previstas;
- estrategia de idempotencia por entidade;
- ordem de cleanup;
- riscos ou dependencias encontrados.

O audit pode consultar o banco para ler o estado atual, mas nao insere, altera ou remove registros.

## Ambiente

Ambientes permitidos:

- `development`
- `dev`
- `test`
- `local`

Ambientes bloqueados:

- `production`
- `prod`
- `prd`
- `homologation`
- `hml`

## Plano de carga

Para cada usuario elegivel:

- `Funcionario`: 15 clientes
- `Terceiro`: 15 clientes
- `Autonomo`: 15 clientes
- `Administrador`: 5 clientes

Para cada tenant encontrado, o script prepara registros nas tabelas:

- `clientes`
- `cliente_tenants`
- `agendamentos`
- `agendamento_servicos`
- `cliente_historico_atendimentos`
- `campanhas`
- `cupons`
- `cupom_servicos`
- `cupom_usos`
- `campanha_envios`
- `mensagens_whatsapp`

As mensagens de WhatsApp sao registros de fila em modo de teste. O script nao chama provider, nao chama Meta e nao dispara mensagem real.

## Formula de contagem

Para cada tenant:

```text
clientes = 15 * (Funcionario + Terceiro + Autonomo) + 5 * Administrador
cliente_tenants = clientes
campanhas = 5
cupons = 6
cupom_usos = 3
cupom_servicos = 6
campanha_envios = 3
mensagens_whatsapp = 3
```

Para cada usuario `Funcionario`, `Terceiro` ou `Autonomo`, a matriz de 15 clientes gera:

```text
agendamentos = 17
cliente_historico_atendimentos = 15
```

Para cada usuario `Administrador`, a matriz de 5 clientes gera:

```text
agendamentos = 5
cliente_historico_atendimentos = 4
```

Assim:

```text
agendamentos = 17 * (Funcionario + Terceiro + Autonomo) + 5 * Administrador
cliente_historico_atendimentos = 15 * (Funcionario + Terceiro + Autonomo) + 4 * Administrador
```

A quantidade exata deve ser confirmada pelo `campaign-test:audit`, porque depende dos usuarios e tenants existentes no ambiente no momento da execucao.

## Cenarios cobertos

A massa contempla:

- clientes novos;
- clientes recorrentes;
- retorno dentro e fora do prazo recomendado;
- servico ocasional sem recuperacao de inativos;
- clientes com agendamento futuro;
- clientes com agendamento cancelado;
- clientes com no-show;
- clientes com aniversario no mes e fora do mes;
- clientes inelegiveis por opt-out ou telefone invalido;
- campanhas nos estados principais do fluxo;
- cupons gerais, por servico, por especialidade, por combinacao, expirados e inativos;
- mensagens em estado dry-run da fila operacional;
- isolamento entre tenants de teste.

### Cenario temporal `future_blocks_recovery`

O cenario `future_blocks_recovery` garante que recuperacao de inativos continue
excluindo clientes que ja possuem agendamento operacional futuro. Por definicao,
ele depende da data corrente: o backend considera futuro somente quando o
agendamento esta em status operacional ativo e `data_inicio > now`.

Quando a massa fica muitos dias sem manutencao, o appointment criado como
`future-confirmed` pode passar para o passado. Nesse caso o validator deve manter
`inactive_recovery.ok = false`, mas tambem reporta diagnostico explicito em
`future_blocks_recovery.stale`.

Para restaurar a cobertura sem recriar a massa:

```bash
npm run campaign-test:reconcile -- --dry-run
npm run campaign-test:reconcile
npm run campaign-test:validate
```

A reconciliacao usa uma data dinamica baseada no instante da execucao:
`now + 30 dias + indice deterministico`, preservando o horario UTC anterior e a
duracao original. Se o cliente ja tiver agendamento futuro valido do cenario, a
rotina nao cria nem atualiza outro registro.

## Garantias

- Nao usa `TRUNCATE`.
- Nao remove dados sem marcador controlado.
- Nao grava novos snapshots dependentes de `servicos.servico_id`.
- Nao altera templates aprovados no provider.
- Nao simula `entregue` ou `lido` sem webhook real.
- Nao chama provider de WhatsApp.
- Nao envia mensagens reais.
- Preserva `WHATSAPP_DRY_RUN`.
- Nao inclui usuarios `Profissional Adm`.
- A limpeza exige confirmacao explicita.
- Seed e validacao sao idempotentes.
- Reconcile e idempotente para cenarios temporais: nao cria clientes, nao cria
  agendamentos e nao altera outros cenarios.
- A partir da Fase 8.3, os scripts legados `campaign-test-data.js` e
  `campaign-test-data-v2.js` foram removidos fisicamente.

## Limpeza

A limpeza remove apenas registros marcados pela carga, respeitando dependencias entre tabelas:

```bash
npm run campaign-test:cleanup -- --confirm-campaign-test-cleanup
```

Sem o argumento `--confirm-campaign-test-cleanup`, a limpeza e bloqueada.

Para reiniciar o ciclo transacional completo de campanhas de um tenant de
teste, incluindo campanhas criadas manualmente ou sugeridas pela IA/regra sem
marcador controlado, use o script SQL dedicado no Supabase:

```text
database/scripts/cleanup-campaigns.sql
```

Detalhes de seguranca, tabelas processadas e criterios de preservacao estao em
`docs/testing/cleanup-campaigns.md`.

## Validacao pos-DROP da Fase 8.3

Em 2026-07-29, `npm run campaign-test:audit` e
`npm run campaign-test:validate` passaram apos a remocao fisica de `servicos`,
`servico_especialidades` e `profissional_servicos`.

A massa `campaign_test_v3` permanece a fonte ativa e usa somente o novo MER de
Servicos.
