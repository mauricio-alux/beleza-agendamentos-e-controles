# Reset Operacional de Dados DEV/HML

## Objetivo

O script `database/scripts/reset-dev-data.sql` limpa dados operacionais de teste
sem apagar estrutura, seeds globais ou configuracoes essenciais do Bellory.

Ele foi criado para reiniciar ciclos de teste em ambientes:

- local;
- development/dev;
- homologation/hml;
- test.

Nunca execute este script em producao.

## O Que Preserva

O reset preserva:

- tabelas, constraints, indices e migrations;
- `tenants`;
- `usuarios`;
- `tenant_memberships`;
- `assinaturas`;
- `configuracoes_tenant`;
- `onboarding_steps`;
- `planos`;
- cargos;
- especialidades;
- roles;
- permissoes;
- taxonomia Bellory;
- servicos de seed/onboarding marcados como padrao;
- profissionais padrao/admin criados pelo onboarding;
- usuarios `MasterAdmin`;
- emails e tenants configurados nas whitelists do script.

## O Que Limpa

O reset remove dados operacionais dos tenants nao protegidos:

- agendamentos e historicos;
- bloqueios de agenda;
- clientes e vinculos com tenants;
- tokens de cliente;
- campanhas, cupons e envios;
- notificacoes;
- mensagens WhatsApp;
- CRM;
- financeiro operacional;
- automacoes e execucoes;
- IA operacional;
- logs de evento;
- auditoria temporaria de configuracoes;
- profissionais de teste que nao sejam seed/admin/owner;
- servicos manuais que nao sejam seed/onboarding;
- vinculos temporarios associados aos dados removidos.

## Como Executar

1. Abra `database/scripts/reset-dev-data.sql`.
2. Revise as whitelists:
   - `_reset_protected_emails`;
   - `_reset_protected_tenant_slugs`.
3. No inicio da sessao SQL, configure:

```sql
set app.environment = 'development';
set app.reset_dev_data_confirm = 'RESET_DEV_DATA';
```

4. Execute o script completo no Supabase SQL Editor, psql ou ferramenta SQL equivalente.
5. Confira o relatorio final retornado pela tabela temporaria `_reset_report`.

## Protecoes

O script aborta antes de limpar qualquer dado quando:

- `app.reset_dev_data_confirm` nao for exatamente `RESET_DEV_DATA`;
- `app.environment` nao estiver em uma lista de ambientes nao produtivos.

Tambem protege automaticamente usuarios com `tipo_usuario = 'MasterAdmin'`.

## Rollback Basico

O script roda dentro de transacao.

Se ocorrer erro antes do `commit`, o banco faz rollback da execucao.

Depois do `commit`, o rollback depende de backup/snapshot do ambiente. Para
ambientes compartilhados, gere snapshot antes de executar.

## Validacoes Depois da Execucao

Depois do reset, valide:

- login administrativo;
- acesso ao tenant;
- cargos e especialidades ainda existem;
- servicos padrao/onboarding ainda existem;
- compatibilidades do novo MER existem em `servico_catalogo_especialidades` e
  `servico_tenant_especialidades`;
- agenda esta limpa;
- clientes estao limpos;
- campanhas estao limpas;
- equipe de teste foi removida;
- onboarding continua funcionando para novos testes.
