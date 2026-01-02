/**
 * Platform Backend Server
 *
 * Main entry point for the Fastify server
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { config } from './config/index.js';
import { prisma } from './db.js';

// Re-export prisma for backward compatibility
export { prisma };

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

// Register rate limiting (disabled in test mode)
if (config.nodeEnv !== 'test') {
  await fastify.register(rateLimit, {
    // Higher limit in development for E2E tests
    max: config.nodeEnv === 'development' ? 1000 : 100,
    timeWindow: '1 minute',
    keyGenerator: (request) => request.ip,
  });
  fastify.log.info('✓ Rate limiting enabled');
} else {
  fastify.log.info('⚠ Rate limiting disabled (test mode)');
}

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
import { participantRoutes } from './routes/participants.js';
import { prizeRoutes } from './routes/prizes.js';
import { winnerRoutes } from './routes/winners.js';

await fastify.register(authRoutes);
await fastify.register(userRoutes);
await fastify.register(roomRoutes);
await fastify.register(participantRoutes);
await fastify.register(prizeRoutes);
await fastify.register(winnerRoutes);

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
