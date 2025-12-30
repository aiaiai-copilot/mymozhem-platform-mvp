/**
 * Platform Backend Server
 *
 * Main entry point for the Fastify server
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PrismaClient } from '@prisma/client';
import { config } from './config/index.js';

// Initialize Prisma Client
export const prisma = new PrismaClient({
  log: config.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Create Fastify instance
const fastify = Fastify({
  logger: {
    level: config.nodeEnv === 'development' ? 'info' : 'warn',
    transport:
      config.nodeEnv === 'development'
        ? {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
  },
});

// Register CORS
await fastify.register(cors, {
  origin: config.corsOrigin,
  credentials: true,
});

// Register error handler
import { errorHandler } from './middleware/errorHandler.js';
fastify.setErrorHandler(errorHandler);

// Health check endpoint
fastify.get('/health', async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    database: 'connected',
  };
});

// API v1 routes
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { roomRoutes } from './routes/rooms.js';

await fastify.register(authRoutes);
await fastify.register(userRoutes);
await fastify.register(roomRoutes);

// Start server
async function start() {
  try {
    // Test database connection
    await prisma.$connect();
    fastify.log.info('✓ Database connected');

    // Start listening
    await fastify.listen({
      port: config.port,
      host: config.host,
    });

    fastify.log.info(`✓ Server listening on http://${config.host}:${config.port}`);
    fastify.log.info(`✓ Environment: ${config.nodeEnv}`);
  } catch (err) {
    fastify.log.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  fastify.log.info('Shutting down gracefully...');
  await fastify.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the server
start();
