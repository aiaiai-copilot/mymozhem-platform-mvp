# Production Dockerfile for Quiz App
# Multi-stage build: Node for building, nginx for serving

# Stage 1: Build
FROM node:20-alpine AS builder

RUN npm install -g pnpm@8.15.0

WORKDIR /app

# Copy workspace config files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json ./
COPY packages/platform-sdk ./packages/platform-sdk
COPY apps/quiz ./apps/quiz

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build SDK first (generates .d.ts files)
WORKDIR /app/packages/platform-sdk
RUN pnpm build

# Build quiz app with Vite
WORKDIR /app/apps/quiz
ARG VITE_PLATFORM_URL=http://localhost:3000
ENV VITE_PLATFORM_URL=$VITE_PLATFORM_URL
RUN pnpm build

# Stage 2: Production with nginx
FROM nginx:alpine AS production

COPY --from=builder /app/apps/quiz/dist /usr/share/nginx/html
COPY apps/quiz/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
