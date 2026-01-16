# Production Dockerfile for Lottery App
# Multi-stage build: Node for building, nginx for serving

# Stage 1: Build
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/platform-sdk/package.json ./packages/platform-sdk/
COPY apps/lottery/package.json ./apps/lottery/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/platform-sdk ./packages/platform-sdk
COPY apps/lottery ./apps/lottery

# Build SDK first
RUN pnpm --filter @event-platform/platform-sdk build

# Build lottery app
ARG VITE_PLATFORM_URL=http://localhost:3000
ENV VITE_PLATFORM_URL=$VITE_PLATFORM_URL
RUN pnpm --filter @event-platform/lottery build

# Stage 2: Production with nginx
FROM nginx:alpine AS production

# Copy built assets
COPY --from=builder /app/apps/lottery/dist /usr/share/nginx/html

# Copy nginx config for SPA routing
COPY apps/lottery/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
