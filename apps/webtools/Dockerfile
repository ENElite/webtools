FROM node:24-alpine AS deps

RUN corepack enable && corepack prepare pnpm@11.24.0 --activate
WORKDIR /app

COPY .npmrc pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/webtools/package.json ./apps/webtools/

RUN pnpm install --filter @webtools/webtools... --frozen-lockfile --trust-lockfile

FROM node:24-alpine AS builder

RUN corepack enable && corepack prepare pnpm@11.24.0 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps ./apps
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter @webtools/webtools build

FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=builder --chown=node:node /app/apps/webtools/out ./out

USER node

EXPOSE 3000

CMD ["busybox", "httpd", "-f", "-p", "3000", "-h", "/app/out"]
