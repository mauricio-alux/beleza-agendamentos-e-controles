# Reset de Agendamentos DEV/HML

## Objetivo

O script `database/scripts/reset-appointments.sql` remove agendamentos de teste
e seus registros diretamente relacionados. A limpeza pode abranger um tenant
especifico ou todos os tenants.

Ele preserva clientes, profissionais, servicos, campanhas, cupons, tenants,
usuarios e configuracoes.

Nunca execute este script em producao.

## Limpar um Tenant

Execute na mesma sessao SQL:

```sql
set app.environment = 'development';
set app.reset_appointments_scope = 'tenant';
set app.reset_appointments_tenant_id = 'UUID_DO_TENANT';
set app.reset_appointments_confirm = 'RESET_TENANT_APPOINTMENTS';
```

Em seguida, execute o arquivo `database/scripts/reset-appointments.sql`.

## Limpar Todos os Tenants

Use uma sessao nova ou limpe a configuracao anterior:

```sql
set app.environment = 'development';
set app.reset_appointments_scope = 'all';
set app.reset_appointments_tenant_id = '';
set app.reset_appointments_confirm = 'RESET_ALL_APPOINTMENTS';
```

Em seguida, execute o arquivo completo.

## Dados Removidos

O script remove os agendamentos selecionados e os vinculos correspondentes em:

- servicos e historico de status do agendamento;
- confirmacoes, cancelamentos e no-show;
- jobs e mensagens associados;
- interacoes de CRM e atribuicoes de campanha ligadas ao agendamento;
- usos de cupom;
- automacoes;
- lancamentos, recebimentos e comissoes originados pelo agendamento;
- logs de evento que possuam o `appointment_id`.

Ao final, uma consulta informa a quantidade removida de cada tabela.

## Protecoes

- exige ambiente `development`, `dev`, `homologation`, `hml`, `local` ou
  `test`;
- exige escopo explicito `tenant` ou `all`;
- exige confirmacao diferente para reset global e por tenant;
- valida a existencia do tenant no modo `tenant`;
- executa tudo em uma transacao;
- bloqueia novas gravacoes em `agendamentos` durante a limpeza.

Se qualquer comando falhar antes do `commit`, a transacao e revertida.
