# 010 - RBAC Do Dashboard Backend First

## Decisao

O controle de acesso do dashboard e definido pelo backend. O frontend reflete a
autorizacao, mas nunca e a unica barreira.

## Regras

- Administrador gerencia o proprio tenant.
- Autonomo owner gerencia o proprio tenant.
- Autonomo partner opera apenas no proprio contexto profissional.
- Funcionario e Terceiro acessam somente dashboard e agenda pessoais.
- Profissional Adm conserva consulta de agenda e clientes, sem gestao estrutural.
- Modulos de Clientes, Servicos, Equipe e Configuracoes sao estrategicos.

## Consequencias

- menus sao derivados de permissoes;
- paginas possuem guarda contra URL direta;
- endpoints exigem `requirePermission`;
- repositories permanecem tenant-aware;
- Agenda restringe `profissional_id` no servidor;
- concessoes antigas incompatíveis sao removidas por migration;
- novos modulos devem declarar permissao de leitura e escrita separadamente.
