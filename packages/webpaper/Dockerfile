# ---- Stage 1: Install dependencies ----
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/webpaper/package.json ./packages/webpaper/
COPY packages/shared/package.json ./packages/shared/
COPY packages/webwidget/package.json ./packages/webwidget/

RUN pnpm install --frozen-lockfile

# ---- Stage 2: Build ----
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/webpaper/node_modules ./packages/webpaper/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/webwidget/node_modules ./packages/webwidget/node_modules

COPY . .

WORKDIR /app/packages/webpaper
RUN pnpm build

# ---- Stage 3: Production ----
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy full workspace (source + deps + build output)
COPY --from=builder /app ./

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 5173

ENV PORT=5173
ENV HOSTNAME="0.0.0.0"

CMD ["sh", "-c", "cd packages/webpaper && pnpm start"]
