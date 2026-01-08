/**
 * Quiz WebSocket Event Handlers
 *
 * Handles real-time quiz events: question display, answer submission, winner selection
 */

import type { Socket } from 'socket.io';
import type { FastifyBaseLogger } from 'fastify';
import { prisma } from '../db.js';
import {
  broadcastQuizQuestionShown,
  broadcastQuizAnswerSubmitted,
  broadcastQuizRoundWinner,
  broadcastQuizFinished,
  broadcastQuizStatusChanged,
} from './events.js';

interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  timeLimit?: number;
}

interface QuizAppSettings {
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  quizStatus: 'WAITING' | 'QUESTION_ACTIVE' | 'BETWEEN_ROUNDS' | 'FINISHED';
  questionShownAt?: string;
}

// Track active questions and their first correct answerer (in-memory for speed)
const activeQuestions = new Map<string, {
  questionId: string;
  correctIndex: number;
  shownAt: number;
  winnerId?: string;
}>();

/**
 * Handle organizer showing a question to all participants
 */
export async function handleShowQuestion(
  socket: Socket,
  data: {
    roomId: string;
    question: { id: string; text: string; options: string[]; timeLimit?: number };
    questionIndex: number;
    totalQuestions: number;
  },
  log: FastifyBaseLogger
) {
  const { roomId, question, questionIndex, totalQuestions } = data;
  const userId = socket.data.userId;

  // Verify user is organizer of this room
  const participant = await prisma.participant.findFirst({
    where: { roomId, userId, role: 'ORGANIZER', deletedAt: null },
  });

  if (!participant) {
    log.warn(`User ${userId} attempted to show question but is not organizer of room ${roomId}`);
    return;
  }

  // Get room to find correct answer
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return;

  const appSettings = room.appSettings as QuizAppSettings | null;
  const questions = appSettings?.questions || [];
  const fullQuestion = questions.find(q => q.id === question.id);

  if (!fullQuestion) {
    log.warn(`Question ${question.id} not found in room ${roomId}`);
    return;
  }

  // Store active question state
  const questionKey = `${roomId}:${question.id}`;
  activeQuestions.set(questionKey, {
    questionId: question.id,
    correctIndex: fullQuestion.correctIndex,
    shownAt: Date.now(),
  });

  // Broadcast question to all room participants (without correct answer)
  broadcastQuizQuestionShown(
    roomId,
    {
      id: question.id,
      text: question.text,
      options: question.options,
      timeLimit: question.timeLimit,
    },
    questionIndex,
    totalQuestions
  );

  broadcastQuizStatusChanged(roomId, 'QUESTION_ACTIVE');

  log.info(`Quiz question ${questionIndex + 1}/${totalQuestions} shown in room ${roomId}`);
}

/**
 * Handle participant submitting an answer
 */
export async function handleQuizAnswer(
  socket: Socket,
  data: {
    roomId: string;
    questionId: string;
    answerIndex: number;
    timestamp: number;
    participantId: string;
    participantName: string;
  },
  log: FastifyBaseLogger
) {
  const { roomId, questionId, answerIndex, timestamp, participantId, participantName } = data;
  const userId = socket.data.userId;

  // Verify user is a participant in this room
  const participant = await prisma.participant.findFirst({
    where: { roomId, userId, deletedAt: null },
  });

  if (!participant) {
    log.warn(`User ${userId} attempted to answer but is not participant of room ${roomId}`);
    return;
  }

  // Get active question state
  const questionKey = `${roomId}:${questionId}`;
  const activeQuestion = activeQuestions.get(questionKey);

  if (!activeQuestion) {
    log.warn(`No active question ${questionId} in room ${roomId}`);
    return;
  }

  // Already have a winner for this question
  if (activeQuestion.winnerId) {
    log.info(`Question ${questionId} already has a winner, ignoring answer from ${participantName}`);
    return;
  }

  // Broadcast that someone answered (don't reveal if correct)
  broadcastQuizAnswerSubmitted(roomId, participantId, participantName, questionId);

  // Check if answer is correct
  const isCorrect = answerIndex === activeQuestion.correctIndex;

  if (isCorrect) {
    // First correct answer wins!
    activeQuestion.winnerId = participantId;
    const responseTimeMs = timestamp - activeQuestion.shownAt;

    // Create winner record if a prize exists
    try {
      // Get a prize to associate - quiz rooms should have a "Quiz Point" prize
      const room = await prisma.room.findUnique({
        where: { id: roomId },
        include: { prizes: { where: { deletedAt: null } } },
      });

      const prize = room?.prizes[0];

      // Only create Winner record if prize exists (schema requires prizeId)
      if (prize) {
        await prisma.winner.create({
          data: {
            roomId,
            participantId: participant.id,
            prizeId: prize.id,
            metadata: {
              questionId,
              responseTimeMs,
              answerIndex,
              submittedAt: new Date(timestamp).toISOString(),
              type: 'quiz_round_win',
            },
          },
        });
      }

      // Always broadcast round winner (even without prize record)
      broadcastQuizRoundWinner(roomId, {
        participantId: participant.id,
        participantName,
        questionId,
        responseTimeMs,
      });

      broadcastQuizStatusChanged(roomId, 'BETWEEN_ROUNDS');

      log.info(`Quiz round winner: ${participantName} in room ${roomId} (${responseTimeMs}ms)`);
    } catch (error) {
      log.error(`Failed to create quiz winner: ${error}`);
    }
  }
}

/**
 * Handle quiz finished event
 */
export async function handleQuizFinished(
  socket: Socket,
  data: {
    roomId: string;
    leaderboard: Array<{ participantId: string; participantName: string; wins: number }>;
  },
  log: FastifyBaseLogger
) {
  const { roomId, leaderboard } = data;
  const userId = socket.data.userId;

  // Verify user is organizer
  const participant = await prisma.participant.findFirst({
    where: { roomId, userId, role: 'ORGANIZER', deletedAt: null },
  });

  if (!participant) {
    log.warn(`User ${userId} attempted to end quiz but is not organizer of room ${roomId}`);
    return;
  }

  // Clean up active questions for this room
  for (const key of activeQuestions.keys()) {
    if (key.startsWith(roomId)) {
      activeQuestions.delete(key);
    }
  }

  // Broadcast final results
  broadcastQuizFinished(roomId, leaderboard);
  broadcastQuizStatusChanged(roomId, 'FINISHED');

  log.info(`Quiz finished in room ${roomId}`);
}

/**
 * Handle quiz start event
 */
export async function handleQuizStart(
  socket: Socket,
  data: { roomId: string },
  log: FastifyBaseLogger
) {
  const { roomId } = data;
  const userId = socket.data.userId;

  // Verify user is organizer
  const participant = await prisma.participant.findFirst({
    where: { roomId, userId, role: 'ORGANIZER', deletedAt: null },
  });

  if (!participant) {
    log.warn(`User ${userId} attempted to start quiz but is not organizer of room ${roomId}`);
    return;
  }

  broadcastQuizStatusChanged(roomId, 'WAITING');
  log.info(`Quiz started in room ${roomId}`);
}
