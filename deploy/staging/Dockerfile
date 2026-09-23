FROM node:22-bookworm-slim AS build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/src ./src
COPY frontend/public ./public
COPY frontend/next.config.ts frontend/next-env.d.ts frontend/tsconfig.json frontend/tailwind.config.ts frontend/postcss.config.js ./
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_APP_NAME
ARG NEXT_PUBLIC_APP_LOGO_URL=""
ARG NEXT_PUBLIC_APP_SUPPORT_EMAIL=""
ENV NEXT_PUBLIC_API_URL=/api NEXT_PUBLIC_DEV_MODE=false NEXT_PUBLIC_DEV_PWA_DIAGNOSTICS=true DEV_PWA_MANIFEST_CREDENTIALS=false NEXT_TELEMETRY_DISABLED=1
RUN node -e "const u=new URL(process.env.NEXT_PUBLIC_APP_URL); if(u.protocol!=='https:' || u.pathname!=='/' || u.search || u.hash || u.username || u.password || !process.env.NEXT_PUBLIC_APP_NAME)process.exit(1)"
RUN npm run build
RUN node -e "require('fs').writeFileSync('staging-build.json',JSON.stringify({origin:process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/,''),name:process.env.NEXT_PUBLIC_APP_NAME,logo:process.env.NEXT_PUBLIC_APP_LOGO_URL,support:process.env.NEXT_PUBLIC_APP_SUPPORT_EMAIL}))"


FROM node:22-bookworm-slim
ENV NODE_ENV=production NEXT_PUBLIC_DEV_PWA_DIAGNOSTICS=true DEV_PWA_MANIFEST_CREDENTIALS=false NEXT_TELEMETRY_DISABLED=1 PORT=8080
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY backend/src ./src
WORKDIR /app
COPY --from=build --chown=node:node /app/frontend ./frontend
COPY deploy/staging/*.cjs ./deploy/staging/
USER node
EXPOSE 8080
CMD ["node","deploy/staging/start.cjs"]


