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

// ============================================================================
// QUIZ EVENTS
// ============================================================================

/**
 * Quiz question data structure
 */
interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  timeLimit?: number;
}

/**
 * Broadcast quiz question shown event
 * Called when organizer displays a question to all participants
 */
export function broadcastQuizQuestionShown(
  roomId: string,
  question: QuizQuestion,
  questionIndex: number,
  totalQuestions: number
) {
  broadcastToRoom(roomId, 'quiz:question_shown', {
    question: {
      id: question.id,
      text: question.text,
      options: question.options,
      timeLimit: question.timeLimit,
    },
    questionIndex,
    totalQuestions,
  });
}

/**
 * Broadcast quiz answer submitted event
 * Called when a participant submits an answer (doesn't reveal correctness to others)
 */
export function broadcastQuizAnswerSubmitted(
  roomId: string,
  participantId: string,
  participantName: string,
  questionId: string
) {
  broadcastToRoom(roomId, 'quiz:answer_submitted', {
    participantId,
    participantName,
    questionId,
  });
}

/**
 * Broadcast quiz round winner event
 * Called when the first correct answer wins the round
 */
export function broadcastQuizRoundWinner(
  roomId: string,
  winner: {
    participantId: string;
    participantName: string;
    questionId: string;
    responseTimeMs: number;
  }
) {
  broadcastToRoom(roomId, 'quiz:round_winner', { winner });
}

/**
 * Broadcast quiz finished event
 * Called when all questions have been answered
 */
export function broadcastQuizFinished(
  roomId: string,
  leaderboard: Array<{
    participantId: string;
    participantName: string;
    wins: number;
  }>
) {
  broadcastToRoom(roomId, 'quiz:finished', { leaderboard });
}

/**
 * Broadcast quiz status changed event
 * Called when quiz transitions between states
 */
export function broadcastQuizStatusChanged(
  roomId: string,
  quizStatus: 'WAITING' | 'QUESTION_ACTIVE' | 'BETWEEN_ROUNDS' | 'FINISHED'
) {
  broadcastToRoom(roomId, 'quiz:status_changed', { quizStatus });
}
