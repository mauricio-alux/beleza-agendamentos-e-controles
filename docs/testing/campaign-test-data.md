# Campaign Test Data

Este documento descreve a carga controlada de dados para testes do modulo de campanhas.

## Escopo

A carga usa o marcador `campaign_test_seed_2026` para criar dados deterministicos, idempotentes e removiveis. Ela prepara dois tenants de teste:

- `Espaco Vivian Beauty`
- `Bellory Test Studio`

O script considera apenas usuarios com os perfis:

- `Funcionario`
- `Terceiro`
- `Autonomo`
- `Administrador`

O perfil `Profissional Adm` e explicitamente excluido da carga, mesmo quando existir no tenant.

## Comandos

Execute a partir de `backend/` somente depois de revisar o audit:

```bash
npm run campaign-test:audit
npm run campaign-test:seed
npm run campaign-test:validate
npm run campaign-test:cleanup -- --confirm-campaign-test-cleanup
```

O comando `campaign-test:audit` nao altera dados. Ele lista tenants encontrados, usuarios, profissionais, servicos, templates e a contagem planejada por tabela antes de qualquer seed.

## Relatorio detalhado do audit

O `campaign-test:audit` deve ser usado como relatorio de revisao antes da carga. A saida inclui, por tenant:

- tenants considerados e se foram encontrados;
- usuarios encontrados, usuarios elegiveis e usuarios excluidos com motivo;
- quantidade de usuarios por perfil;
- quantidade prevista de clientes por usuario;
- relacao prevista entre usuario, cliente, cenario, servico e profissional;
- registros existentes da propria massa ja marcados com `campaign_test_seed_2026`;
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
campanhas = 7
cupons = 3
cupom_usos = 3
campanha_envios = 6 quando houver template de marketing e clientes elegiveis
mensagens_whatsapp = 6 quando houver template de marketing e clientes elegiveis
```

Para cada usuario `Funcionario`, `Terceiro` ou `Autonomo`, a matriz de 15 clientes gera:

```text
agendamentos = 18
cliente_historico_atendimentos = 15
```

Para cada usuario `Administrador`, a matriz de 5 clientes gera:

```text
agendamentos = 5
cliente_historico_atendimentos = 4
```

Assim:

```text
agendamentos = 18 * (Funcionario + Terceiro + Autonomo) + 5 * Administrador
cliente_historico_atendimentos = 15 * (Funcionario + Terceiro + Autonomo) + 4 * Administrador
```

A quantidade exata deve ser confirmada pelo `campaign-test:audit`, porque depende dos usuarios e tenants existentes no ambiente no momento da execucao.

## Cenarios cobertos

A massa contempla:

- clientes novos;
- clientes recorrentes;
- clientes inativos ha cerca de 45 dias;
- clientes inativos ha cerca de 120 dias;
- clientes com agendamento futuro;
- clientes com agendamento cancelado;
- clientes com no-show;
- clientes com aniversario proximo;
- clientes inelegiveis por opt-out ou telefone invalido;
- campanhas nos estados principais do fluxo;
- cupons validos, expirados e restritos a servico;
- mensagens em estados diferentes da fila operacional.

## Garantias

- Nao usa `TRUNCATE`.
- Nao remove dados sem o marcador `campaign_test_seed_2026`.
- Nao altera templates aprovados no provider.
- Nao simula `entregue` ou `lido` sem webhook real.
- Nao chama provider de WhatsApp.
- Nao envia mensagens reais.
- Nao inclui usuarios `Profissional Adm`.
- A limpeza exige confirmacao explicita.

## Limpeza

A limpeza remove apenas registros marcados pela carga, respeitando dependencias entre tabelas:

```bash
npm run campaign-test:cleanup -- --confirm-campaign-test-cleanup
```

Sem o argumento `--confirm-campaign-test-cleanup`, a limpeza e bloqueada.

Para reiniciar o ciclo transacional completo de campanhas de um tenant de
teste, incluindo campanhas criadas manualmente ou sugeridas pela IA/regra sem o
marcador `campaign_test_seed_2026`, use o script SQL dedicado no Supabase:

```text
database/scripts/cleanup-campaigns.sql
```

Detalhes de seguranca, tabelas processadas e criterios de preservacao estao em
`docs/testing/cleanup-campaigns.md`.
