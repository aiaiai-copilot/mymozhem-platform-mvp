/**
 * Winner Routes
 * /api/v1/rooms/:roomId/winners/*
 *
 * Winner selection uses atomic operations to prevent race conditions
 * when multiple winners are selected simultaneously.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ParticipantRole, Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import type { ApiResponse, AuthenticatedRequest } from '../types/index.js';

// Request validation schemas
const SelectWinnerSchema = z.object({
  participantId: z.string(),
  prizeId: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Helper: Check if user is organizer of a room
 */
async function isOrganizer(userId: string, roomId: string): Promise<boolean> {
  const participation = await prisma.participant.findUnique({
    where: {
      userId_roomId: { userId, roomId },
      deletedAt: null,
    },
  });
  return participation?.role === ParticipantRole.ORGANIZER;
}

export async function winnerRoutes(fastify: FastifyInstance) {
  // POST /api/v1/rooms/:roomId/winners - Select winner (organizer only)
  fastify.post('/api/v1/rooms/:roomId/winners', { preHandler: requireAuth }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { roomId } = request.params as { roomId: string };
    const body = SelectWinnerSchema.parse(request.body);

    // Check room exists
    const room = await prisma.room.findUnique({
      where: { id: roomId, deletedAt: null },
    });

    if (!room) {
      const response: ApiResponse = {
        error: {
          code: 'NOT_FOUND',
          message: 'Room not found',
        },
      };
      return reply.status(404).send(response);
    }

    // Check if user is organizer
    if (!(await isOrganizer(authReq.user.userId, roomId))) {
      const response: ApiResponse = {
        error: {
          code: 'FORBIDDEN',
          message: 'Only room organizers can select winners',
        },
      };
      return reply.status(403).send(response);
    }

    // Verify participant exists and belongs to this room
    const participant = await prisma.participant.findUnique({
      where: { id: body.participantId, roomId, deletedAt: null },
    });

    if (!participant) {
      const response: ApiResponse = {
        error: {
          code: 'NOT_FOUND',
          message: 'Participant not found in this room',
        },
      };
      return reply.status(404).send(response);
    }

    // Verify prize exists and belongs to this room
    const prize = await prisma.prize.findUnique({
      where: { id: body.prizeId, roomId, deletedAt: null },
    });

    if (!prize) {
      const response: ApiResponse = {
        error: {
          code: 'NOT_FOUND',
          message: 'Prize not found in this room',
        },
      };
      return reply.status(404).send(response);
    }

    // Check if participant already won this prize
    const existingWin = await prisma.winner.findFirst({
      where: {
        participantId: body.participantId,
        prizeId: body.prizeId,
        deletedAt: null,
      },
    });

    if (existingWin) {
      const response: ApiResponse = {
        error: {
          code: 'CONFLICT',
          message: 'Participant has already won this prize',
        },
      };
      return reply.status(409).send(response);
    }

    // ATOMIC: Decrement prize quantity
    // This prevents race conditions when multiple winners are selected simultaneously
    const updated = await prisma.prize.updateMany({
      where: {
        id: body.prizeId,
        quantityRemaining: { gt: 0 },
      },
      data: {
        quantityRemaining: { decrement: 1 },
      },
    });

    if (updated.count === 0) {
      const response: ApiResponse = {
        error: {
          code: 'PRIZE_EXHAUSTED',
          message: 'No prizes remaining',
        },
      };
      return reply.status(400).send(response);
    }

    // Create winner record
    const winner = await prisma.winner.create({
      data: {
        roomId,
        participantId: body.participantId,
        prizeId: body.prizeId,
        metadata: body.metadata as Prisma.InputJsonValue | undefined,
      },
      include: {
        participant: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        prize: true,
      },
    });

    const response: ApiResponse = {
      data: winner,
    };

    return reply.status(201).send(response);
  });

  // GET /api/v1/rooms/:roomId/winners - List room winners
  fastify.get('/api/v1/rooms/:roomId/winners', async (request, reply) => {
    const { roomId } = request.params as { roomId: string };

    // Check room exists
    const room = await prisma.room.findUnique({
      where: { id: roomId, deletedAt: null },
    });

    if (!room) {
      const response: ApiResponse = {
        error: {
          code: 'NOT_FOUND',
          message: 'Room not found',
        },
      };
      return reply.status(404).send(response);
    }

    const winners = await prisma.winner.findMany({
      where: {
        roomId,
        deletedAt: null,
      },
      include: {
        participant: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        prize: {
          select: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const response: ApiResponse = {
      data: winners,
    };

    return reply.send(response);
  });

  // GET /api/v1/rooms/:roomId/winners/:winnerId - Get winner details
  fastify.get('/api/v1/rooms/:roomId/winners/:winnerId', async (request, reply) => {
    const { roomId, winnerId } = request.params as { roomId: string; winnerId: string };

    const winner = await prisma.winner.findUnique({
      where: { id: winnerId, roomId, deletedAt: null },
      include: {
        participant: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        prize: true,
      },
    });

    if (!winner) {
      const response: ApiResponse = {
        error: {
          code: 'NOT_FOUND',
          message: 'Winner not found',
        },
      };
      return reply.status(404).send(response);
    }

    const response: ApiResponse = {
      data: winner,
    };

    return reply.send(response);
  });

  // DELETE /api/v1/rooms/:roomId/winners/:winnerId - Revoke winner (organizer only)
  fastify.delete('/api/v1/rooms/:roomId/winners/:winnerId', { preHandler: requireAuth }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { roomId, winnerId } = request.params as { roomId: string; winnerId: string };

    // Check if user is organizer
    if (!(await isOrganizer(authReq.user.userId, roomId))) {
      const response: ApiResponse = {
        error: {
          code: 'FORBIDDEN',
          message: 'Only room organizers can revoke winners',
        },
      };
      return reply.status(403).send(response);
    }

    // Find winner
    const winner = await prisma.winner.findUnique({
      where: { id: winnerId, roomId, deletedAt: null },
    });

    if (!winner) {
      const response: ApiResponse = {
        error: {
          code: 'NOT_FOUND',
          message: 'Winner not found',
        },
      };
      return reply.status(404).send(response);
    }

    // Soft delete winner and restore prize quantity
    await prisma.$transaction([
      // Soft delete the winner record
      prisma.winner.update({
        where: { id: winnerId },
        data: { deletedAt: new Date() },
      }),
      // Restore the prize quantity
      prisma.prize.update({
        where: { id: winner.prizeId },
        data: {
          quantityRemaining: { increment: 1 },
        },
      }),
    ]);

    const response: ApiResponse = {
      data: { success: true },
    };

    return reply.send(response);
  });
}
