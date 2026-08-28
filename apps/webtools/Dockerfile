# ---- Stage 1: Install dependencies ----
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copy workspace config files (including .npmrc for shamefully-hoist)
COPY .npmrc pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/webtools/package.json ./packages/webtools/
COPY packages/shared/package.json ./packages/shared/
COPY packages/webwidget/package.json ./packages/webwidget/

RUN pnpm install --frozen-lockfile

# ---- Stage 2: Build ----
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copy all node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/webtools/node_modules ./packages/webtools/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/webwidget/node_modules ./packages/webwidget/node_modules

# Copy full source code
COPY . .

# Build webtools (static export)
WORKDIR /app/packages/webtools
RUN pnpm build

# ---- Stage 3: Production ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

# Copy static build output
COPY --from=builder --chown=appuser:nodejs /app/packages/webtools/out ./out

USER appuser

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npx", "serve", "out", "-l", "3000"]
