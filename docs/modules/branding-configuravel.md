# Branding configuravel

O branding publico da aplicacao e centralizado em duas fontes:

- `backend/src/config/app-brand.js`;
- `frontend/src/config/app-brand.ts`.

Esses modulos concentram nome, dominio, URL base, email de suporte e helpers
para construir URLs publicas. Componentes, metadata, onboarding e respostas
publicas nao devem ler variaveis de ambiente diretamente.

## Variaveis

Backend:

- `APP_NAME`;
- `APP_DOMAIN`;
- `APP_URL`;
- `APP_SUPPORT_EMAIL`.

Frontend:

- `NEXT_PUBLIC_APP_NAME`;
- `NEXT_PUBLIC_APP_DOMAIN`;
- `NEXT_PUBLIC_APP_URL`;
- `NEXT_PUBLIC_APP_SUPPORT_EMAIL`.

Os arquivos `.env.example` registram defaults de desenvolvimento. Em producao,
backend e frontend devem receber valores equivalentes.

## Limites

O branding configuravel nao altera:

- slugs de tenants;
- tabelas e migrations;
- IDs e constantes da taxonomia;
- nomes de tipos internos mantidos por compatibilidade.

Links de tenant continuam no formato `/agendar/{tenantSlug}` e sao montados
a partir da URL publica configurada.
