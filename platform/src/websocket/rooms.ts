/**
 * WebSocket Room Management
 *
 * Handles room subscriptions and authorization
 */

import type { Socket } from 'socket.io';
import type { FastifyBaseLogger } from 'fastify';
import { prisma } from '../db.js';

interface RoomSubscribeData {
  roomId: string;
}

/**
 * Handle room subscription
 * Verifies user has access to the room and joins Socket.io room
 */
export async function handleRoomSubscription(
  socket: Socket,
  data: RoomSubscribeData,
  logger: FastifyBaseLogger
) {
  const { roomId } = data;
  const userId = socket.data.userId;

  if (!roomId) {
    throw new Error('roomId is required');
  }

  // Check if room exists
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { id: true, name: true, status: true },
  });

  if (!room) {
    throw new Error('Room not found');
  }

  // Check if user is a participant in the room
  const participant = await prisma.participant.findFirst({
    where: {
      roomId,
      userId,
    },
    select: { id: true, role: true },
  });

  if (!participant) {
    throw new Error('Access denied: Not a participant in this room');
  }

  // Join Socket.io room
  await socket.join(`room:${roomId}`);

  logger.info(`User ${userId} subscribed to room ${roomId}`);

  // Emit subscription confirmation
  socket.emit('room:subscribed', { roomId, room });
}

/**
 * Handle room unsubscription
 */
export async function handleRoomUnsubscription(
  socket: Socket,
  data: RoomSubscribeData,
  logger: FastifyBaseLogger
) {
  const { roomId } = data;
  const userId = socket.data.userId;

  if (!roomId) {
    return;
  }

  // Leave Socket.io room
  await socket.leave(`room:${roomId}`);

  logger.info(`User ${userId} unsubscribed from room ${roomId}`);

  // Emit unsubscription confirmation
  socket.emit('room:unsubscribed', { roomId });
}
