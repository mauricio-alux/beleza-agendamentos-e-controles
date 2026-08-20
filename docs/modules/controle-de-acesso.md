# Controle De Acesso

O Bellory usa RBAC por permissao, sempre combinado com tenant ativo e
membership contextual.

## Matriz

| Perfil | Dashboard | Agenda | Clientes | Servicos | Equipe | Relatorios | Configuracoes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Administrador | completo | gerencia | gerencia | gerencia | gerencia | consulta | gerencia |
| Autonomo owner | completo | gerencia | gerencia | gerencia | gerencia | consulta | gerencia |
| Autonomo partner | pessoal | propria | sem modulo global | sem modulo global | nao acessa | nao acessa | nao acessa |
| Funcionario | pessoal | propria, operacional | nao acessa modulo global | nao acessa | nao acessa | nao acessa | apenas perfil e seguranca pessoais |
| Terceiro | pessoal | atribuida, operacional | nao acessa | nao acessa | nao acessa | nao acessa | apenas perfil e seguranca pessoais |
| Profissional Adm | limitado | consulta e confirmacao | consulta | nao acessa | nao acessa | nao acessa | perfil e seguranca |

`Funcionario`, `Terceiro` e o perfil legado `Profissional` recebem acesso de
agenda pessoal com permissoes operacionais granulares (`agenda.confirm`,
`agenda.cancel`, `agenda.reschedule`, `agenda.complete` e `agenda.no_show`).
A Agenda aplica ainda o `tenant_memberships.profissional_id`, impedindo
consulta ou acao sobre agenda de outro profissional.

Atendentes administrativos podem receber permissao operacional especifica,
como `agenda.confirm`, sem acesso a configuracoes sensiveis. A exibicao de
botoes da agenda deve seguir as permissoes efetivas:

- `Confirmar`: `agenda.confirm`, `agenda.write` ou `agenda.manage`;
- `Cancelar`: `agenda.cancel`, `agenda.write` ou `agenda.manage`;
- `Reagendar`: `agenda.reschedule`, `agenda.write` ou `agenda.manage`;
- `Concluir Agora`: `agenda.complete`, `agenda.write` ou `agenda.manage`;
- `Cliente Nao Compareceu`: `agenda.no_show`, `agenda.write` ou
  `agenda.manage`.

## Camadas

- frontend filtra menus e acoes por permissao;
- `DashboardLayout` protege acesso direto por URL;
- rotas Express usam `requirePermission`;
- servicos e repositories recebem `tenantId`;
- Agenda aplica escopo profissional no backend;
- overrides nao ampliam perfis pessoais para modulos estrategicos.

Clientes vinculados a atendimentos podem ser apresentados dentro do contexto da
Agenda. Isso nao concede acesso ao modulo global de Clientes.

## Campanhas

Perfis internos do tenant (`Administrador`, `Autonomo`, `Funcionario` e
`Terceiro`) nao sao publico-alvo de campanhas do proprio tenant. Mesmo que uma
pessoa interna tambem possua registro em `clientes`, a elegibilidade de
campanhas deve priorizar a protecao e excluir esse destinatario no tenant onde
o papel interno esta ativo. A regra e tenant-aware: a mesma pessoa pode ser
interna em um tenant e cliente final em outro.

## Tipos de negocio

Manutencao global de `tipos_negocio`, `servicos_catalogo`,
`tipo_negocio_servicos_catalogo` e `servico_catalogo_especialidades` pertence
ao contexto de plataforma e exige MasterAdmin com permissao
`platform.business_types.manage`.

Responsavel autorizado do tenant e definido por RBAC/permissao efetiva, nao
pelo texto exibido do perfil. Proprietario, Administrador do tenant e Autonomo
owner podem manter os proprios vinculos em `tenant_tipos_negocio` quando o
contexto conceder `tenant.manage`. Autonomo sem responsabilidade administrativa
nao pode alterar tipos, servicos ou configuracoes estruturais.

Essa alteracao troca recomendacoes e permissoes de catalogo e dispara a
sincronizacao oficial de disponibilidade em `servico_tenants`. A sincronizacao
cria servicos ausentes como `ativo = false`, mas nao ativa ofertas nem remove
profissionais, agenda ou historico automaticamente.

Na tela `/configuracoes/salao`, o tipo principal e mantido como campo separado
e nao integra a lista de complementares. Complementares podem ficar vazios. A
remocao de complementares e recusada quando deixaria servicos ativos sem tipo
de negocio permitido, retornando mensagem funcional com a lista de servicos
afetados.
