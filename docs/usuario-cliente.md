# usuario_cliente — candidato a contexto cliente

A associação usuario/cliente/tenant não equivale a autenticação. A reconciliação central
normaliza exclusivamente com normalizePhoneToE164 e cria pendente/telefone_coincidente.
Ambiguidades não são resolvidas arbitrariamente. A unicidade impede duplicatas e o FK
composto exige cliente_tenants. Estados existentes, inclusive revogado, são preservados.
Não há backfill. A migration 20261002100000_usuario_cliente.sql já foi aplicada
no Supabase DEV/STAGING; não deve ser reaplicada nesta preparação.
Associações automáticas começam com status_verificacao = pendente e
origem_vinculo = telefone_coincidente. Telefone coincidente identifica um candidato,
mas não é prova suficiente de identidade.

Após cadastro/edição de usuário ou cliente, a reconciliação é aditiva e best effort:
falhas são registradas sem dados pessoais e não desfazem a operação principal.
As leituras são paginadas para comparar números legados pelo mesmo helper; otimização
por coluna normalizada não integra esta etapa. Não executar reconciliação global.

O botão profissional consulta apenas associações do usuário autenticado, elegíveis
no momento da consulta. A seleção em /acesso/vinculos reutiliza Localizar meu acesso.
O primeiro acesso pendente exige telefone + nascimento ou TC válido quando aplicável.
Sem TC disponível, o formulário preenche o telefone e solicita nascimento.
O backend confere usuário, associação, cliente e tenant antes de delegar à identidade
existente e antes de retornar o TC.
Após validação bem-sucedida, TC/booking identity pode ser persistido no dispositivo.
Nos acessos posteriores, Acessar como cliente consulta bookingIdentityKey(slug),
envia o TC ao backend e permite acesso direto somente após validação do TC,
cliente, tenant e associação. A credencial local sozinha não autoriza acesso.
TC inválido, expirado ou revogado exige fallback para identificação.
Falha transitória preserva a credencial e permite nova tentativa.
Nenhum TC ou booking-identity é criado somente pela existência do vínculo.
Validar nascimento ou TC não altera status_verificacao: o vínculo continua pendente.
Mesmo verificado ainda usa a validação existente nesta implementação.

O tenant cliente vem do vínculo, nunca do Dashboard. tenant_memberships continua
representando permissões internas; não é alterada por essa associação.
Na abertura sem intenção explícita, sessão profissional válida tem prioridade;
cliente-only e troca explícita de contexto são preservados. last-context não vence
a sessão profissional. Mantém-se o encaminhamento existente de onboarding/admin.
Na PublicBookingPage, ContextAccessLink target="professional" permite retornar à
área profissional quando o contexto profissional está disponível. Essa autorização
depende exclusivamente da sessão profissional + backend/RBAC; TC/booking identity
não concede autorização profissional. Na abertura/reabertura sem intenção explícita,
se os dois contextos coexistirem, a sessão profissional válida tem prioridade.
Continua existindo somente uma PWA MyEsthya, um manifest e um service worker.

# PENDÊNCIA — VERIFICAÇÃO DE `usuario_cliente` VIA WHATSAPP

Igualdade entre usuarios.telefone e clientes.telefone normalizados identifica um
candidato, mas não comprova posse. Até a WhatsApp Business API estar configurada:
- vínculos automáticos permanecem pendente;
- pendente pode disponibilizar Acessar como cliente;
- pendente não autoriza entrada direta;
- acesso exige identificação existente (telefone+nascimento ou TC válido).

Futuramente implementar OTP com geração segura, expiração, armazenamento por hash,
limite de tentativas, reenvio controlado, auditoria e transição pendente → verificado.
Definir política de revalidação/revogação após mudança de telefone: nesta etapa os
vínculos antigos são preservados e novas coincidências apenas geram pendentes.
Após verificado, avaliar/implementar acesso direto sem repetir telefone+nascimento.
O estado verificado fica reservado à futura comprovação, por exemplo OTP/WhatsApp.
OTP e envio WhatsApp ainda não foram implementados. Acesso direto baseado apenas
no vínculo também não foi implementado; o retorno com TC válido usa a validação
backend existente descrita acima.
