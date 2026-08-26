# Taxonomia V2 - Etapa 4

Data: 2026-08-25

## Escopo Aplicado

- Governanca MasterAdmin/Tenant implementada sem migration, sem alteracao estrutural de banco e sem seed/reset/cleanup.
- MasterAdmin passa a manter perfis operacionais globais, servicos recomendados por perfil, cargos recomendados por perfil e defaults administrativos.
- Tenant permanece dono da configuracao comercial local apos materializacao: preco, duracao, retorno, status, online e especialidades customizadas locais.
- Alteracoes globais de perfil/default nao propagam automaticamente para tenants existentes.
- Relacao Cargo x Especialidade continua sendo recomendacao/ordenacao; `principal` nao restringe execucao.
- Agenda e booking publico continuam consultando a configuracao local do tenant, sem fallback automatico para default global.

## Implementacao

- Backend:
  - Novas operacoes administrativas em `/admin/taxonomia/perfis-operacionais`.
  - Validacao de TipoNegocio x Servico, Servico x Especialidade e Cargo x Especialidade antes de salvar governanca global.
  - RBAC preservado por `requirePlatformAdmin` e `platform.business_types.manage`.
  - Metadata de governanca registra origem MasterAdmin, politica de nao propagacao e versao da taxonomia.
  - Configuracoes de tenant materializadas por perfil recebem `config_origin: profile_default`; ao serem editadas pelo tenant passam para `tenant_customized`.
  - Configuracoes criadas localmente pelo tenant recebem `config_origin: tenant_added`.

- Frontend:
  - Tela de administracao da taxonomia exibe e permite manter servicos recomendados, cargos recomendados e precos iniciais de referencia por perfil operacional.
  - Acoes administrativas usam os novos endpoints globais e nao alteram configuracoes comerciais de tenants existentes.

## Testes E Validacoes

- `npx tsc --noEmit` em `frontend`: aprovado.
- `npm run build` em `frontend`: aprovado.
- `node -e "require('./src/routes/index.routes'); console.log('backend routes ok')"` em `backend`: aprovado.
- `node --test src/modules/operational-profiles/operational-profiles.service.test.js src/modules/operational-profiles/operational-profiles.governance.test.js src/modules/services/tenant-commercial-governance.test.js src/modules/team/taxonomy-v2-catalog-expansion.test.js` em `backend`: aprovado, 16 testes.
- `npm run test:professional-services` em `backend`: aprovado fora do sandbox, 34 testes.
- Health checks locais:
  - `http://127.0.0.1:3000/admin/taxonomia`: 200 OK.
  - `http://127.0.0.1:3001/public/health`: 200 OK.

## Observacoes

- Nenhuma migration foi criada.
- Nenhum commit ou push foi executado.
- Nao houve alteracao automatica de agendamentos.
- Nao houve propagacao automatica de defaults para tenants existentes.
