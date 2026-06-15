# ---- Stage 1: Install dependencies ----
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copy workspace config files (including .npmrc for shamefully-hoist)
COPY .npmrc pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/webpaper/package.json ./packages/webpaper/
COPY packages/shared/package.json ./packages/shared/
COPY packages/webwidget/package.json ./packages/webwidget/

RUN pnpm install --frozen-lockfile

# ---- Stage 2: Build ----
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copy all node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/webpaper/node_modules ./packages/webpaper/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/webwidget/node_modules ./packages/webwidget/node_modules

# Copy full source code
COPY . .

# Build webpaper
WORKDIR /app/packages/webpaper
RUN pnpm build

# ---- Stage 3: Production (next start) ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy the entire webpaper package (includes .next, node_modules, source)
COPY --from=builder --chown=nextjs:nodejs /app/packages/webpaper ./packages/webpaper

# Copy workspace dependencies that runtime may reference
COPY --from=builder --chown=nextjs:nodejs /app/packages/shared ./packages/shared
COPY --from=builder --chown=nextjs:nodejs /app/packages/webwidget ./packages/webwidget

USER nextjs

EXPOSE 5173

ENV PORT=5173
ENV HOSTNAME="0.0.0.0"

# 使用 next start，与本地 pnpm start 行为一致
WORKDIR /app/packages/webpaper
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "5173"]
