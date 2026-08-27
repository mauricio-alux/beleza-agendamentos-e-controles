# Taxonomia V2 - Etapa 5B.2

# Defaults Operacionais e Governanca Regional

## Defaults

Migration aplicada:

- `supabase/migrations/20260827100000_taxonomy_v2_stage5b2_operational_defaults.sql`

Defaults implementados em `perfil_operacional_defaults` com:

- `region_scope = state`
- `country = BR`
- `state = SP`
- `fonte = administrative_reference`
- `vigencia_inicio = 2026-08-27`
- `price_policy = administrative_reference_not_market_price`
- `fallback_policy = city_state_country_global`
- `tenant_overwrite_policy = never_auto_propagate_to_existing_tenants`

| Tipo de Negocio | Servico | Especialidade | Preco | Duracao | Retorno | Online | Regiao |
|---|---|---|---:|---:|---:|---:|---|
| Body Piercing | Body piercing | Perfuracao corporal | 120 | 45 | 90 | false | BR / SP |
| Bronzeamento | Bronzeamento artificial | Bronzeamento artificial | 120 | 45 | 15 | true | BR / SP |
| Bronzeamento | Bronzeamento a jato | Bronzeamento a jato | 150 | 45 | 15 | true | BR / SP |
| Estetica Facial | Limpeza de pele | Limpeza de Pele | 180 | 60 | 30 | true | BR / SP |
| Estetica Facial | Hidratacao facial | Estetica Facial | 140 | 60 | 30 | true | BR / SP |
| Fisioterapia | Avaliacao fisioterapeutica | Avaliacao fisioterapeutica | 180 | 60 | null | true | BR / SP |
| Fisioterapia | Sessao de fisioterapia | Fisioterapia | 160 | 60 | 7 | false | BR / SP |
| Pilates | Aula de Pilates | Pilates | 90 | 60 | 7 | true | BR / SP |
| Tatuagem | Tatuagem | Tatuagem | 300 | 120 | null | false | BR / SP |
| Terapias Integrativas | Reiki | Reiki | 120 | 60 | 15 | true | BR / SP |
| Terapias Integrativas | Reflexologia | Reflexologia | 120 | 45 | 15 | true | BR / SP |

Faixas opcionais tambem foram persistidas em `preco_min_referencia` e `preco_max_referencia`, conforme a especificacao 5B.1B aprovada.

## MasterAdmin

Arquivos atualizados:

- `frontend/src/components/platform/BusinessTypesManager.tsx`
- `frontend/src/services/business-types.service.ts`
- `frontend/src/components/platform/BusinessTypesManager.defaults.test.js`

Funcionalidades:

- Consulta de defaults existentes.
- Edicao de default existente.
- Criacao de default novo.
- Campos de preco minimo, preco recomendado e preco maximo.
- Duracao.
- Retorno, permitindo valor vazio como `null`.
- Online true/false sem coerção indevida para true.
- Escopo regional `global`, `country`, `state`, `city`.
- Campos condicionais de pais, estado e cidade.
- Vigencia inicial.
- Mensagem funcional de fallback: Cidade, Estado, Pais, Geral.

RBAC:

- Backend preserva `ensurePlatform`.
- Apenas MasterAdmin pode manter defaults globais/regionais.
- Contextos tenant, autonomo, funcionario e cliente nao passam pela governanca global.

## Fallback

Fallback existente mantido:

1. city
2. state
3. country
4. global

Testes cobriram fallback para cidade, estado, pais e global. Quando ha default por especialidade, ele continua tendo prioridade adicional sobre default geral do servico.

## Onboarding

Arquivos atualizados:

- `backend/src/modules/operational-profiles/operational-profiles.service.js`
- `backend/src/modules/operational-profiles/operational-profiles.service.test.js`

Comportamento:

- Novo tenant especializado resolve perfil operacional.
- Servicos recomendados sao materializados.
- Defaults regionais sao aplicados na configuracao local do tenant.
- `online=false` e preservado no plano de inicializacao.
- Agenda usa duracao materializada no tenant.
- Booking publico deve respeitar `aceita_agendamento_online=false`, mantendo o servico fora da exibicao publica enquanto o tenant nao habilitar.

## Independencia

Regra implementada:

- `profile_default`: origem de inicializacao.
- `tenant_customized`: autoridade comercial do tenant depois de alteracao.
- `tenant_added`: autoridade comercial do tenant para configuracao adicionada pelo tenant.

Cenario validado:

1. Default inicial = 80.
2. Tenant recebe = 80.
3. Tenant altera = 100.
4. Default muda = 90.
5. Tenant antigo permanece = 100.
6. Novo tenant passa a receber = 90.

Atualizacoes futuras de default global/regional nao sobrescrevem configuracoes `tenant_customized` ou `tenant_added`.

## Seguranca

Pre-auditoria remota:

- `perfil_operacional_defaults` BR/SP antes: 0.
- `servico_tenants` antes: 60.
- `servico_tenant_especialidades` antes: 126.
- `agendamentos` antes: 107.

Pos-auditoria remota:

- `perfil_operacional_defaults` BR/SP depois: 11.
- `online=false`: `BODY_PIERCING`, `PHYSIOTHERAPY_SESSION`, `TATTOO`.
- `retorno=null`: `PHYSIOTHERAPY_ASSESSMENT`, `TATTOO`.
- `servico_tenants` depois: 60.
- `servico_tenant_especialidades` depois: 126.
- `agendamentos` depois: 107.

TENANTS EXISTENTES ALTERADOS AUTOMATICAMENTE = 0

AGENDAMENTOS ALTERADOS = 0

## Qualidade

Comandos executados:

- `npm run check:migrations`: passou.
- `supabase db push --dry-run`: passou; somente `20260827100000_taxonomy_v2_stage5b2_operational_defaults.sql` pendente.
- `supabase db push`: passou.
- `supabase migration list`: local/remoto alinhados ate `20260827100000`.
- `node --test src/modules/operational-profiles/operational-profiles.service.test.js src/modules/operational-profiles/taxonomy-v2-stage5b2-defaults-migration.test.js`: passou.
- `node --test src/components/platform/BusinessTypesManager.defaults.test.js`: passou.
- `node --test src/modules/operational-profiles/operational-profiles.governance.test.js src/modules/operational-profiles/operational-profiles.service.test.js src/modules/operational-profiles/taxonomy-v2-stage5a-migration.test.js src/modules/operational-profiles/taxonomy-v2-stage5b2-defaults-migration.test.js`: passou.
- `node --test src/modules/services/tenant-commercial-governance.test.js src/modules/services/service-specialty-update.test.js`: passou.
- `npm run test:professional-services`: passou.
- `npm run test:appointment-status`: passou.
- `npm run test:client-identity`: passou.
- `npx tsc --noEmit`: passou.
- `npm run build`: passou.
- `Invoke-WebRequest http://127.0.0.1:3000/admin/taxonomia`: 200 OK.

Validacao visual:

- Browser MCP retornou `No browser is available`.
- VALIDACAO VISUAL PENDENTE por indisponibilidade do navegador nesta sessao.
- A validacao HTTP confirmou que `/admin/taxonomia` responde localmente.

## Pendencias

- Validacao visual manual/interativa da tela `/admin/taxonomia` quando browser estiver disponivel.
- Checkpoint Git posterior, sem commit/push nesta etapa.

Nao foi executado `git commit`.

Nao foi executado `git push`.

TAXONOMIA V2 - ETAPA 5B.2 CONCLUIDA: BACKEND/FRONTEND, DEFAULTS E GOVERNANCA REGIONAL IMPLEMENTADOS
