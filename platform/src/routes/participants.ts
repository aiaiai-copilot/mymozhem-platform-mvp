/**
 * Participant Routes
 * /api/v1/rooms/:roomId/participants/*
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ParticipantRole, Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import type { ApiResponse, AuthenticatedRequest } from '../types/index.js';

// Request validation schemas
const UpdateParticipantSchema = z.object({
  role: z.nativeEnum(ParticipantRole).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function participantRoutes(fastify: FastifyInstance) {
  // POST /api/v1/rooms/:roomId/participants - Join room
  fastify.post('/api/v1/rooms/:roomId/participants', { preHandler: requireAuth }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { roomId } = request.params as { roomId: string };

    // Check room exists and is not deleted
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

    // Check if user is already a participant
    const existing = await prisma.participant.findUnique({
      where: {
        userId_roomId: {
          userId: authReq.user.userId,
          roomId,
        },
      },
    });

    if (existing) {
      // If soft-deleted, reactivate
      if (existing.deletedAt) {
        const participant = await prisma.participant.update({
          where: { id: existing.id },
          data: {
            deletedAt: null,
            role: ParticipantRole.PARTICIPANT,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        });

        const response: ApiResponse = {
          data: participant,
        };
        return reply.status(200).send(response);
      }

      // Already active participant
      const response: ApiResponse = {
        error: {
          code: 'CONFLICT',
          message: 'Already a participant in this room',
        },
      };
      return reply.status(409).send(response);
    }

    // Create new participant with default role
    const participant = await prisma.participant.create({
      data: {
        userId: authReq.user.userId,
        roomId,
        role: ParticipantRole.PARTICIPANT,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    const response: ApiResponse = {
      data: participant,
    };

    return reply.status(201).send(response);
  });

  // DELETE /api/v1/rooms/:roomId/participants/me - Leave room
  fastify.delete('/api/v1/rooms/:roomId/participants/me', { preHandler: requireAuth }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { roomId } = request.params as { roomId: string };

    // Find participation
    const participation = await prisma.participant.findUnique({
      where: {
        userId_roomId: {
          userId: authReq.user.userId,
          roomId,
        },
        deletedAt: null,
      },
    });

    if (!participation) {
      const response: ApiResponse = {
        error: {
          code: 'NOT_FOUND',
          message: 'Not a participant in this room',
        },
      };
      return reply.status(404).send(response);
    }

    // Organizers cannot leave their own room (must delete or transfer ownership)
    if (participation.role === ParticipantRole.ORGANIZER) {
      const response: ApiResponse = {
        error: {
          code: 'FORBIDDEN',
          message: 'Organizers cannot leave their own room. Delete the room or transfer ownership first.',
        },
      };
      return reply.status(403).send(response);
    }

    // Soft delete participation
    await prisma.participant.update({
      where: { id: participation.id },
      data: { deletedAt: new Date() },
    });

    const response: ApiResponse = {
      data: { success: true },
    };

    return reply.send(response);
  });

  // GET /api/v1/rooms/:roomId/participants - List participants
  fastify.get('/api/v1/rooms/:roomId/participants', async (request, reply) => {
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

    const participants = await prisma.participant.findMany({
      where: {
        roomId,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    const response: ApiResponse = {
      data: participants,
    };

    return reply.send(response);
  });

  // PATCH /api/v1/rooms/:roomId/participants/:participantId - Update participant (organizer only)
  fastify.patch('/api/v1/rooms/:roomId/participants/:participantId', { preHandler: requireAuth }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { roomId, participantId } = request.params as { roomId: string; participantId: string };
    const body = UpdateParticipantSchema.parse(request.body);

    // Check if user is organizer of this room
    const organizerParticipation = await prisma.participant.findUnique({
      where: {
        userId_roomId: {
          userId: authReq.user.userId,
          roomId,
        },
        deletedAt: null,
      },
    });

    if (!organizerParticipation || organizerParticipation.role !== ParticipantRole.ORGANIZER) {
      const response: ApiResponse = {
        error: {
          code: 'FORBIDDEN',
          message: 'Only room organizers can update participants',
        },
      };
      return reply.status(403).send(response);
    }

    // Find target participant
    const targetParticipant = await prisma.participant.findUnique({
      where: { id: participantId, roomId, deletedAt: null },
    });

    if (!targetParticipant) {
      const response: ApiResponse = {
        error: {
          code: 'NOT_FOUND',
          message: 'Participant not found',
        },
      };
      return reply.status(404).send(response);
    }

    // Prevent changing own role if you're the only organizer
    if (targetParticipant.userId === authReq.user.userId && body.role && body.role !== ParticipantRole.ORGANIZER) {
      const organizerCount = await prisma.participant.count({
        where: {
          roomId,
          role: ParticipantRole.ORGANIZER,
          deletedAt: null,
        },
      });

      if (organizerCount <= 1) {
        const response: ApiResponse = {
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot demote yourself when you are the only organizer',
          },
        };
        return reply.status(403).send(response);
      }
    }

    // Prepare update data with proper type casting for JSON fields
    const updateData: Prisma.ParticipantUpdateInput = {
      ...(body.role !== undefined && { role: body.role }),
      ...(body.metadata !== undefined && { metadata: body.metadata as Prisma.InputJsonValue }),
    };

    const participant = await prisma.participant.update({
      where: { id: participantId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    const response: ApiResponse = {
      data: participant,
    };

    return reply.send(response);
  });

  // DELETE /api/v1/rooms/:roomId/participants/:participantId - Remove participant (organizer only)
  fastify.delete('/api/v1/rooms/:roomId/participants/:participantId', { preHandler: requireAuth }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { roomId, participantId } = request.params as { roomId: string; participantId: string };

    // Check if user is organizer
    const organizerParticipation = await prisma.participant.findUnique({
      where: {
        userId_roomId: {
          userId: authReq.user.userId,
          roomId,
        },
        deletedAt: null,
      },
    });

    if (!organizerParticipation || organizerParticipation.role !== ParticipantRole.ORGANIZER) {
      const response: ApiResponse = {
        error: {
          code: 'FORBIDDEN',
          message: 'Only room organizers can remove participants',
        },
      };
      return reply.status(403).send(response);
    }

    // Find target participant
    const targetParticipant = await prisma.participant.findUnique({
      where: { id: participantId, roomId, deletedAt: null },
    });

    if (!targetParticipant) {
      const response: ApiResponse = {
        error: {
          code: 'NOT_FOUND',
          message: 'Participant not found',
        },
      };
      return reply.status(404).send(response);
    }

    // Prevent removing yourself
    if (targetParticipant.userId === authReq.user.userId) {
      const response: ApiResponse = {
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot remove yourself. Use the leave endpoint instead.',
        },
      };
      return reply.status(403).send(response);
    }

    // Soft delete participant
    await prisma.participant.update({
      where: { id: participantId },
      data: { deletedAt: new Date() },
    });

    const response: ApiResponse = {
      data: { success: true },
    };

    return reply.send(response);
  });
}
