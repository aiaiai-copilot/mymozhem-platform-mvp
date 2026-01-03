/**
 * WebSocket Server Setup
 *
 * Initializes Socket.io server with Fastify integration
 */

import { Server as SocketIOServer } from 'socket.io';
import type { FastifyInstance } from 'fastify';
import { config } from '../config/index.js';
import { authenticateSocket } from './auth.js';
import { handleRoomSubscription, handleRoomUnsubscription } from './rooms.js';

export let io: SocketIOServer;

/**
 * Initialize WebSocket server
 */
export async function initializeWebSocket(fastify: FastifyInstance) {
  // Create Socket.io server attached to Fastify HTTP server
  io = new SocketIOServer(fastify.server, {
    cors: {
      origin: config.corsOrigin,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use(authenticateSocket);

  // Connection handler
  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    fastify.log.info(`WebSocket connected: ${socket.id} (user: ${userId})`);

    // Room subscription
    socket.on('room:subscribe', async (data, callback) => {
      try {
        await handleRoomSubscription(socket, data, fastify.log);
        callback?.({ success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Subscription failed';
        fastify.log.error(`Room subscription error: ${message}`);
        callback?.({ success: false, error: { code: 'SUBSCRIPTION_FAILED', message } });
      }
    });

    // Room unsubscription
    socket.on('room:unsubscribe', async (data) => {
      try {
        await handleRoomUnsubscription(socket, data, fastify.log);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unsubscription failed';
        fastify.log.error(`Room unsubscription error: ${message}`);
      }
    });

    // Disconnection
    socket.on('disconnect', (reason) => {
      fastify.log.info(`WebSocket disconnected: ${socket.id} (reason: ${reason})`);
    });

    // Error handling
    socket.on('error', (error) => {
      fastify.log.error(`WebSocket error: ${error.message}`);
    });
  });

  fastify.log.info('✓ WebSocket server initialized');
}

/**
 * Get Socket.io server instance
 */
export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('WebSocket server not initialized');
  }
  return io;
}
