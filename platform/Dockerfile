# Production Dockerfile for Event Platform Backend
# Multi-stage build for minimal image size

# Stage 1: Build
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/platform-sdk/package.json ./packages/platform-sdk/
COPY platform/package.json ./platform/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/platform-sdk ./packages/platform-sdk
COPY platform ./platform

# Build SDK first (platform depends on it)
RUN pnpm --filter @event-platform/platform-sdk build

# Generate Prisma client
RUN pnpm --filter @event-platform/platform prisma generate

# Build platform
RUN pnpm --filter @event-platform/platform build

# Stage 2: Production
FROM node:20-alpine AS production

RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/packages/platform-sdk/package.json ./packages/platform-sdk/
COPY --from=builder /app/packages/platform-sdk/dist ./packages/platform-sdk/dist
COPY --from=builder /app/platform/package.json ./platform/
COPY --from=builder /app/platform/dist ./platform/dist
COPY --from=builder /app/platform/prisma ./platform/prisma
COPY --from=builder /app/platform/node_modules/.prisma ./platform/node_modules/.prisma

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Set environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

WORKDIR /app/platform

# Run migrations and start server
CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/index.js"]
