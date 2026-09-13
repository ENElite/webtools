FROM node:24-alpine AS deps

RUN corepack enable && corepack prepare pnpm@11.24.0 --activate
WORKDIR /app

COPY .npmrc pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/webpaper/package.json ./apps/webpaper/
COPY packages/widget-core/package.json ./packages/widget-core/
COPY packages/widget-react/package.json ./packages/widget-react/
COPY packages/widget-studio/package.json ./packages/widget-studio/

RUN pnpm install --filter @webtools/webpaper... --frozen-lockfile --trust-lockfile

FROM node:24-alpine AS builder

RUN corepack enable && corepack prepare pnpm@11.24.0 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps ./apps
COPY --from=deps /app/packages ./packages
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter @webtools/webpaper build

FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=5173 \
    HOSTNAME=0.0.0.0

COPY --from=builder --chown=node:node /app/apps/webpaper/.next/standalone ./
COPY --from=builder --chown=node:node /app/apps/webpaper/.next/static ./apps/webpaper/.next/static

USER node

EXPOSE 5173

CMD ["node", "apps/webpaper/server.js"]
