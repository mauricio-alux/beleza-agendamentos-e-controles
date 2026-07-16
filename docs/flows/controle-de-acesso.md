# Fluxo De Controle De Acesso

1. O token e validado pelo `authMiddleware`.
2. O membership ativo define tenant, role e `profissional_id`.
3. O `tenantMiddleware` monta o `permissionContext`.
4. O `rbac.service` combina role, baseline e overrides.
5. Restricoes estruturais do perfil sao aplicadas depois dos overrides.
6. `requirePermission` bloqueia a API antes do controller.
7. Operacoes pessoais aplicam tambem o escopo do profissional.
8. O frontend usa a mesma lista de permissoes para menu, pagina e acoes.

Tentativas de abrir uma URL sem permissao sao redirecionadas ao dashboard. A API
continua bloqueada mesmo que a requisicao seja feita manualmente.

Mensagens de negacao devem ser amigaveis e nao devem expor stack trace, detalhes
SQL ou nomes internos de policies.
