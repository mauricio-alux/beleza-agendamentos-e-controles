# Guia funcional: Login

## Objetivo

Esta documentacao orienta o uso da pagina de Login do Esthya, acessada em `/login`. A tela permite que usuarios ja cadastrados entrem no SaaS para acessar o painel operacional, continuar o onboarding ou acessar a administracao da plataforma, conforme o perfil da conta.

Publico-alvo: administradores do estabelecimento, profissionais autonomos, colaboradores vinculados ao estabelecimento e usuarios internos com perfil de administracao da plataforma.

## Como acessar

1. Acesse a pagina `/login`.
2. Informe o email cadastrado.
3. Informe a senha.
4. Mantenha ou desmarque a opcao "Continuar conectado neste dispositivo".
5. Clique em "Entrar".

Durante o envio, o botao exibe "Entrando..." e fica indisponivel para evitar envios repetidos.

## Mapa da tela

| Elemento | Como aparece | Funcao |
| --- | --- | --- |
| Identidade visual | Esthya, Beauty Tech e chamada institucional | Reforca que o usuario esta entrando no SaaS correto. |
| Voltar para o site | "Voltar para o site" no desktop; "Voltar" no mobile | Retorna para a pagina inicial publica (`/`). |
| Email | Campo "Email" | Recebe o email usado no cadastro da conta. |
| Senha | Campo "Senha" | Recebe a senha da conta. |
| Mostrar ou ocultar senha | Icone de olho no campo de senha | Alterna entre exibir e ocultar o texto digitado. |
| Esqueci minha senha | Link abaixo do rotulo de senha | Aponta para `/recuperar-senha` e inicia o fluxo de redefinicao. |
| Continuar conectado neste dispositivo | Checkbox marcado por padrao | Define se a sessao sera preservada no navegador. |
| Entrar | Botao principal | Valida os campos e tenta autenticar o usuario. |
| Criar conta | Link/botao secundario | Envia o usuario para `/cadastro`. |

## Informando Email e Senha

O campo "Email" e obrigatorio. O sistema espera um email em formato valido, como `nome@empresa.com`.

Mensagens de validacao:

| Situacao | Mensagem exibida |
| --- | --- |
| Campo vazio | "Informe seu email." |
| Formato invalido | "Informe um email valido." |

Antes de enviar o login ao servidor, a tela remove espacos no inicio e no fim e envia o email em letras minusculas.

O campo "Senha" e obrigatorio. Na tela de login, a senha apenas precisa estar preenchida para que a tentativa seja enviada. Regras de forca de senha pertencem ao fluxo de criacao de conta, nao ao login.

Mensagens de validacao:

| Situacao | Mensagem exibida |
| --- | --- |
| Campo vazio | "Informe sua senha." |

O icone de olho permite alternar entre:

| Estado | Resultado |
| --- | --- |
| Mostrar senha | A senha digitada fica visivel. |
| Ocultar senha | A senha volta a ficar protegida. |

## Continuar conectado neste dispositivo

A opcao "Continuar conectado neste dispositivo" vem marcada por padrao.

Quando marcada, a sessao e salva no navegador e pode ser reaproveitada em acessos futuros. Ao abrir o SaaS novamente, o sistema tenta validar a sessao salva; se necessario, tenta renovar a sessao com o token de atualizacao. Se a sessao nao puder ser validada ou renovada, o usuario volta para o login.

Quando desmarcada, a sessao fica apenas no estado atual da aplicacao. Fechar ou recarregar o navegador pode exigir um novo login.

Recomendacao operacional: manter marcada apenas em computador ou navegador de uso confiavel.

## Entrar

Ao clicar em "Entrar", a tela valida email e senha. Se os campos estiverem corretos, o frontend envia a tentativa para a API de autenticacao em `/auth/login`.

Se o login for aceito, o sistema registra a sessao do usuario e decide o destino com base no perfil e no status de onboarding.

## Redirecionamento apos login

| Condicao confirmada | Destino |
| --- | --- |
| Usuario com perfil global ou operacional `MasterAdmin` | `/admin` |
| Usuario comum com onboarding completo | `/dashboard` ou caminho definido em `NEXT_PUBLIC_DASHBOARD_PATH` |
| Usuario comum com onboarding incompleto | `/onboarding` ou caminho definido em `NEXT_PUBLIC_AUTH_REDIRECT_PATH` |
| Falha ao consultar o status de onboarding apos login | `/onboarding` |

As telas internas tambem protegem o acesso. Se nao houver sessao autenticada, o usuario e redirecionado para `/login`. Se houver sessao, mas o perfil nao tiver permissao para determinada area, a aplicacao exibe "Acesso nao permitido".

## Problemas comuns

| Situacao | Mensagem exibida ao usuario | Orientacao |
| --- | --- | --- |
| Email ou senha incorretos | "Email ou senha invalidos." | Conferir email, senha e tentar novamente. |
| Campo de email vazio | "Informe seu email." | Preencher o email cadastrado. |
| Email em formato incorreto | "Informe um email valido." | Corrigir o formato do email. |
| Campo de senha vazio | "Informe sua senha." | Preencher a senha. |
| Assinatura ou trial exige atencao | "Sua assinatura precisa de atencao para continuar." | Verificar a situacao comercial do estabelecimento ou acionar o responsavel. |
| Sem acesso ao estabelecimento | "Nao foi possivel acessar este estabelecimento. Tente novamente." | Confirmar se o usuario esta ativo e vinculado ao estabelecimento correto. |
| Usuario ou estabelecimento nao encontrado | "Usuario ou estabelecimento nao encontrado." | Confirmar cadastro, vinculo e status do estabelecimento. |
| Servidor demorou para responder | "A conexao com o servidor demorou demais. Tente novamente." | Tentar novamente e verificar se a API esta ativa. |
| Falha de conexao ou erro interno | "Nao foi possivel conectar. Tente novamente." | Verificar conexao, backend local e logs da API. |
| Resposta inesperada do servidor | "Resposta invalida do servidor." | Acionar suporte tecnico para auditoria da resposta da API. |

## Assinatura e trial

O frontend esta preparado para exibir uma mensagem especifica quando a API retorna situacao comercial que impede a continuidade, como trial expirado ou assinatura inativa. Nesses casos, a mensagem funcional apresentada e "Sua assinatura precisa de atencao para continuar.".

Esta tela nao resolve pagamentos, renovacoes ou alteracoes de plano. A orientacao para o usuario e acionar o responsavel pela conta ou o suporte.

## Esqueci minha senha

O link "Esqueci minha senha" aponta para `/recuperar-senha`.

Na tela de recuperacao, o usuario informa o email cadastrado. Se o email estiver em formato valido, o sistema solicita ao mecanismo de autenticacao o envio de instrucoes para redefinicao de senha.

Mensagem de confirmacao exibida:

| Situacao | Mensagem exibida |
| --- | --- |
| Solicitacao enviada | "Se o email estiver cadastrado, enviaremos instrucoes para redefinir sua senha." |

O texto nao confirma se o email existe na base. Esse comportamento reduz exposicao de informacoes sobre contas cadastradas.

Ao abrir o link recebido por email, o usuario acessa `/redefinir-senha`, cria uma nova senha, confirma a senha e conclui a redefinicao. Depois disso, deve voltar para `/login` e entrar novamente.

Mensagens e validacoes da redefinicao:

| Situacao | Mensagem exibida |
| --- | --- |
| Email vazio na recuperacao | "Informe seu email." |
| Email invalido na recuperacao | "Informe um email valido." |
| Link invalido ou expirado | "Link de redefinicao invalido ou expirado. Solicite um novo link." |
| Link expirado ou ja usado | "Este link de redefinicao expirou ou ja foi usado. Solicite um novo link." |
| Nova senha com menos de 8 caracteres | "Use pelo menos 8 caracteres." |
| Nova senha fraca | "Crie uma senha mais forte." |
| Confirmacao diferente da senha | "As senhas nao conferem." |
| Senha redefinida | "Senha redefinida com sucesso. Entre novamente para continuar." |

## Criar conta

O link "Criar conta" envia o usuario para `/cadastro`.

O fluxo de cadastro e destinado a criar uma nova conta inicial, com dados do responsavel e do estabelecimento. A tela de cadastro solicita, entre outros dados:

| Dado solicitado | Finalidade |
| --- | --- |
| Nome completo | Identificar o usuario responsavel. |
| Nome do salao | Criar ou identificar o estabelecimento inicial. |
| Tipo de negocio | Classificar o segmento de operacao. |
| Perfil operacional | Indicar se o usuario atuara como autonomo ou administrador. |
| Email | Criar o acesso. |
| WhatsApp | Registrar contato operacional. |
| Senha e confirmacao | Definir a credencial de acesso. |
| Aceite dos termos | Confirmar autorizacao para continuidade do cadastro. |

A senha no cadastro deve ter pelo menos 8 caracteres, deve atingir forca minima e a confirmacao deve coincidir. Apos cadastro bem-sucedido, o usuario e direcionado ao onboarding.

## Voltar para o site

O link "Voltar para o site" aparece no painel institucional da tela em desktop. Em telas menores, a mesma acao aparece como "Voltar".

Nos dois casos, o usuario retorna para a pagina inicial publica (`/`).

## Primeiro acesso

Nao foi identificado, na tela de Login, um fluxo separado de primeiro acesso com senha temporaria. O primeiro acesso confirmado pelo codigo ocorre de duas formas:

| Cenario | Comportamento |
| --- | --- |
| Usuario acabou de criar conta em `/cadastro` | Apos cadastro, segue para o onboarding. |
| Usuario ja existe, mas onboarding esta incompleto | Apos login, segue para o onboarding. |

## Logout e encerramento da sessao

Nas telas internas, o cabecalho possui acao de saida identificada pelo botao com rotulo acessivel "Sair". Ao sair, o sistema chama a API de logout quando existe token de acesso, limpa a sessao salva no navegador e redireciona para `/login`.

Se a sessao expirar, for removida ou deixar de ser valida, as telas protegidas tambem redirecionam para `/login`.

## Perfis de usuario

| Perfil ou contexto | Comportamento no login |
| --- | --- |
| `MasterAdmin` | Acessa a area administrativa da plataforma em `/admin`. |
| Administrador do estabelecimento | Acessa onboarding ou dashboard, conforme progresso do estabelecimento. |
| Autonomo | Acessa onboarding ou dashboard, conforme progresso do estabelecimento. |
| Colaborador vinculado ao estabelecimento | Acessa areas permitidas conforme suas permissoes. |
| Usuario sem estabelecimento ativo | Nao deve conseguir prosseguir para o painel operacional. |

## Boas praticas de seguranca

- Usar senha pessoal e nao compartilhar credenciais.
- Desmarcar "Continuar conectado neste dispositivo" em computador compartilhado.
- Usar o botao "Sair" ao terminar o uso em maquina compartilhada.
- Conferir se a URL acessada corresponde ao ambiente esperado.
- Em caso de erro repetido de conexao, confirmar se o backend/API esta ativo antes de repetir muitas tentativas.

## Responsividade

A tela possui comportamento responsivo confirmado no codigo:

| Ambiente | Comportamento |
| --- | --- |
| Desktop | Exibe painel institucional lateral, destaques operacionais e card de login. |
| Mobile/tablet estreito | Oculta o painel institucional lateral e exibe o link reduzido "Voltar". |

## Exemplo de uso

1. A administradora acessa `/login`.
2. Digita o email cadastrado.
3. Digita a senha.
4. Mantem "Continuar conectado neste dispositivo" marcado porque usa um computador proprio.
5. Clica em "Entrar".
6. Se o estabelecimento ja concluiu o onboarding, a administradora segue para o dashboard.
7. Se o estabelecimento ainda precisa de configuracao, a administradora segue para o onboarding.

## Arquivos consultados

| Arquivo | Uso na auditoria |
| --- | --- |
| `frontend/src/app/login/page.tsx` | Titulo, subtitulo e composicao da pagina de Login. |
| `frontend/src/components/auth/LoginForm.tsx` | Campos, validacoes, mensagens, checkbox, link de senha, criacao de conta e redirecionamento. |
| `frontend/src/app/recuperar-senha/page.tsx` | Pagina publica para solicitar instrucoes de redefinicao. |
| `frontend/src/components/auth/RecoverPasswordForm.tsx` | Validacao do email e mensagem de confirmacao da recuperacao. |
| `frontend/src/app/redefinir-senha/page.tsx` | Pagina publica para criar nova senha a partir do link recebido. |
| `frontend/src/components/auth/ResetPasswordForm.tsx` | Validacao da nova senha, confirmacao e envio da redefinicao. |
| `frontend/src/components/auth/AuthLayout.tsx` | Layout, identidade visual, destaques e link de retorno ao site. |
| `frontend/src/components/auth/LoadingButton.tsx` | Estado de carregamento "Entrando..." e bloqueio do botao durante envio. |
| `frontend/src/services/auth.service.ts` | API chamada, recuperacao/redefinicao de senha, persistencia da sessao, mensagens amigaveis e logout no frontend. |
| `frontend/src/context/AuthProvider.tsx` | Hidratacao, renovacao, persistencia e limpeza da sessao. |
| `frontend/src/layouts/DashboardLayout.tsx` | Protecao das telas internas e redirecionamento para login. |
| `frontend/src/components/dashboard/TopHeader.tsx` | Acao de logout e retorno para `/login`. |
| `frontend/src/app/cadastro/page.tsx` | Existencia da tela de cadastro. |
| `frontend/src/components/cadastro/RegisterForm.tsx` | Campos e validacoes do cadastro. |
| `frontend/src/services/onboarding.service.ts` | Status de onboarding usado no destino pos-login. |
| `backend/src/routes/auth.routes.js` | Rotas `/auth/login`, `/auth/recover-password`, `/auth/reset-password`, `/auth/refresh`, `/auth/logout` e `/auth/me`. |
| `backend/src/modules/auth/auth.controller.js` | Entrada das rotas de autenticacao. |
| `backend/src/modules/auth/auth.validators.js` | Regras minimas de validacao do backend para login, recuperacao, redefinicao e cadastro. |
| `backend/src/modules/auth/auth.service.js` | Autenticacao, recuperacao/redefinicao, contexto do usuario, vinculo ao estabelecimento, refresh, logout e resposta de sessao. |

## Divergencias identificadas

| Item | Situacao encontrada | Impacto |
| --- | --- | --- |
| Acentuacao em alguns arquivos exibidos no terminal | Alguns textos aparecem com caracteres corrompidos na leitura pelo terminal, embora sejam mensagens funcionais da interface. | Pode indicar diferenca de encoding na visualizacao local; a documentacao registra as mensagens em portugues normalizado. |
| Persistencia da sessao | A opcao "Continuar conectado" controla salvamento local da sessao, nao uma tela separada de escolha de duracao. | Usuario deve entender que desmarcar a opcao reduz a permanencia da sessao no navegador. |
| Primeiro acesso | Nao ha fluxo separado de primeiro acesso na tela de Login. | Primeiro acesso operacional ocorre por cadastro ou redirecionamento para onboarding. |
| Email de redefinicao de senha | O texto do email depende da configuracao externa do provedor de autenticacao. | Se o email chegar em ingles ou o link chegar expirado, e necessario ajustar o template externo e solicitar um novo link. |

## Escopo desta entrega

Esta entrega criou somente documentacao funcional da pagina de Login. Nao foram alterados componentes de frontend, regras de backend, banco de dados, migracoes, mensagens do produto, layout ou regras de autenticacao.
