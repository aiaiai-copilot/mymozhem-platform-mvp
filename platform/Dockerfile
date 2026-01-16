# Production Dockerfile for Event Platform Backend
# Multi-stage build for minimal image size
# Uses Debian-based image for Prisma/OpenSSL compatibility

# Stage 1: Build
FROM node:20-slim AS builder

RUN npm install -g pnpm@8.15.0

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY packages/platform-sdk ./packages/platform-sdk
COPY platform ./platform

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build SDK first (platform depends on it)
RUN pnpm --filter @event-platform/sdk build

# Generate Prisma client (must be after install, in platform directory)
WORKDIR /app/platform
RUN pnpm prisma generate

# Build platform
RUN pnpm build

# Stage 2: Production
FROM node:20-slim AS production

# Install OpenSSL for Prisma (Debian package)
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@8.15.0 prisma@5

WORKDIR /app

# Copy workspace config
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./

# Copy SDK
COPY --from=builder /app/packages/platform-sdk/package.json ./packages/platform-sdk/
COPY --from=builder /app/packages/platform-sdk/dist ./packages/platform-sdk/dist

# Copy platform
COPY --from=builder /app/platform/package.json ./platform/
COPY --from=builder /app/platform/dist ./platform/dist
COPY --from=builder /app/platform/prisma ./platform/prisma

# Install production dependencies (includes @prisma/client)
RUN pnpm install --frozen-lockfile --prod

# Generate Prisma client for runtime
WORKDIR /app/platform
RUN prisma generate

# Set environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

# Run migrations and start server
CMD ["sh", "-c", "prisma migrate deploy && node dist/index.js"]
