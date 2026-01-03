/**
 * WebSocket Event Broadcasting
 *
 * Utilities for broadcasting events to room subscribers
 */

import { getIO } from './index.js';

/**
 * Broadcast event to all clients in a room
 */
export function broadcastToRoom(roomId: string, event: string, data: Record<string, unknown>) {
  try {
    const io = getIO();
    io.to(`room:${roomId}`).emit(event, {
      ...data,
      roomId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // WebSocket not initialized yet, skip broadcasting
    console.warn(`Failed to broadcast ${event} to room ${roomId}:`, error);
  }
}

/**
 * Broadcast participant joined event
 */
export function broadcastParticipantJoined(roomId: string, participant: unknown) {
  broadcastToRoom(roomId, 'participant:joined', { participant });
}

/**
 * Broadcast participant left event
 */
export function broadcastParticipantLeft(roomId: string, participantId: string, userId: string) {
  broadcastToRoom(roomId, 'participant:left', { participantId, userId });
}

/**
 * Broadcast winner selected event
 */
export function broadcastWinnerSelected(roomId: string, winner: unknown) {
  broadcastToRoom(roomId, 'winner:selected', { winner });
}

/**
 * Broadcast prize created event
 */
export function broadcastPrizeCreated(roomId: string, prize: unknown) {
  broadcastToRoom(roomId, 'prize:created', { prize });
}

/**
 * Broadcast prize updated event
 */
export function broadcastPrizeUpdated(roomId: string, prizeId: string, changes: unknown, prize: unknown) {
  broadcastToRoom(roomId, 'prize:updated', { prizeId, changes, prize });
}

/**
 * Broadcast prize deleted event
 */
export function broadcastPrizeDeleted(roomId: string, prizeId: string) {
  broadcastToRoom(roomId, 'prize:deleted', { prizeId });
}

/**
 * Broadcast room updated event
 */
export function broadcastRoomUpdated(roomId: string, changes: unknown, room: unknown) {
  broadcastToRoom(roomId, 'room:updated', { changes, room });
}

/**
 * Broadcast room status changed event
 */
export function broadcastRoomStatusChanged(roomId: string, oldStatus: string, newStatus: string) {
  broadcastToRoom(roomId, 'room:status_changed', { oldStatus, newStatus });
}

/**
 * Broadcast room deleted event
 */
export function broadcastRoomDeleted(roomId: string) {
  broadcastToRoom(roomId, 'room:deleted', {});
}
