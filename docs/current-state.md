# Current State

## Último checkpoint

- Data: 22/09/2026.
- Fase: R1.6-B concluída no escopo funcional definido.
- Cleanup controlado concluído; documentação consolidada.
- Gate Git: checkpoint pendente por segurança; nenhum staging/commit realizado.
- PublicBookingPage.tsx e public-booking.service.ts misturam R1.6-B com edição
  de perfil sem gate específico comprovado nas fontes consultadas.
- Push não autorizado nesta execução.
- Railway: projeto `pwa-dev-staging`, serviço `pwa-staging`.
- Environment interno `production` exclusivo de DEV/STAGING.
- Deployment aprovado: `4859a35c-0565-4998-94f3-7d6d3e85782a`.
- URL: https://pwa-staging-production.up.railway.app.

## Arquitetura vigente

- Tenant-first: `/agendar/[slug]` inicia relação com estabelecimento.
- `/acesso` é a entrada recorrente, com referências locais de tenants.
- PWA única do SaaS, não por tenant.
- Sem identidade global do cliente; TC tenant-scoped.
- Telefone + DOB identificam/recuperam acesso conforme R1.6-B.
- Telefone sozinho não concede TC.
- TC válido permite retorno sem repetir telefone/DOB.
- Tokens aditivos no fluxo aprovado.
- Upcoming usa cliente_id autorizado, sem expansão por telefone.
- Gateway staging integra frontend Next.js e backend Node.js.
- Dados no Supabase DEV existente; isolamento obrigatório.

## Gates aprovados

- Duas migrations R1.6-B aplicadas remotamente; não reaplicar.
- Gateway corrigido e deployment staging SUCCESS.
- Health, `/acesso` e `/agendar/bellory-test-studio` aprovados.
- Bundle atualizado de LocateAccess confirmado no último deployment.
- TC válido, cliente existente, DOB incorreto e C0/C1/CN aprovados.
- Novo cliente e repetição sem duplicidade aprovados.
- Upcoming positivo/isolamento por cliente_id aprovados.
- Android recorrente aprovado no dispositivo moderno testado.
- iOS recuperação/identificação aprovada no PWA standalone testado.
- Edição telefone/DOB, reenvio e acesso personalizado aprovados.
- DOB continua usando seletor nativo.
- Alerta destacado e limpo ao alterar telefone ou DOB.
- Scroll horizontal eliminado conforme reteste informado.
- Resultados físicos limitados aos dispositivos testados.

## Cleanup desta rodada

- Removidas somente fixtures exclusivas do smoke R1.6-B de 21/09.
- 3 clientes, 3 vínculos, 3 TCs, 2 agendamentos, 2 itens e 3 eventos.
- IDs/marcadores conferidos no DEV antes do DELETE transacional.
- Demais registros das seis tabelas preservados por comparação na transação.
- Ausência posterior das fixtures e referências diretas confirmada.
- Massa DEV compartilhada, tenant, profissional e catálogo preservados.
- Nenhuma migration/schema permanente alterado.

## Pendências reais

- Hardening específico das policies RLS de `tokens_cliente`.
- Rate limit distribuído se houver múltiplas instâncias e governança do perfil
  compartilhado permanecem evoluções futuras registradas na implementação.
- Variação visual/escala residual iOS: cosmética, não bloqueante.
- Hipótese de escala/auto-zoom ligada à tipografia não é causa confirmada.
- Não aplicar CSS especulativo nem generalizar validação a todo Android/iOS.
- Bootstrap/pairing/OTP avançado é evolução opcional, não requisito atual.
- Demais frentes de estabilização e produto permanecem no roadmap.

## Próximo passo recomendado

- Comprovar origem/aprovação das alterações de perfil nos arquivos mistos antes
  de selecionar um checkpoint completo por arquivos inteiros.
- Depois priorizar backlog técnico em tarefa específica autorizada.
- Não reabrir R1.6-B funcional por ausência de reteste nesta execução.

## Restrições importantes

- Não reabrir gates aprovados sem alteração afetada.
- Não executar migrations, deploy ou seed automaticamente.
- Preservar multi-tenant e ausência de identidade global.
- Sem commit/push automático em futuras tarefas.
- Sem cleanup de massa DEV ou exclusão por telefone/data aproximada.
- Não registrar PII, tokens ou credenciais em documentos.

## Referências incrementais

- [Contexto](project-context.md): arquitetura e regras vigentes.
- [Roadmap](roadmap.md): backlog e próximos passos.
- [Relatório incremental](audits/20260918-r1-6-b-deploy-staging.md): evidências,
  inventário técnico e fechamento; seções antigas são histórico.
