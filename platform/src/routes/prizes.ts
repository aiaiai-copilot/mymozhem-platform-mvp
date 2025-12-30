/**
 * Prize Routes
 * /api/v1/rooms/:roomId/prizes/*
 *
 * IMPORTANT: Prize deletion must be SOFT DELETE ONLY!
 * Hard deletion will fail if any Winner records exist due to onDelete: Restrict.
 * See: platform/prisma/MIGRATION_PLAN.md - Prize Deletion Policy
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ParticipantRole, Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import type { ApiResponse, AuthenticatedRequest } from '../types/index.js';

// Request validation schemas
const CreatePrizeSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  quantity: z.number().int().positive().default(1),
  metadata: z.record(z.unknown()).optional(),
});

const UpdatePrizeSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().nullable().optional(),
  quantity: z.number().int().positive().optional(),
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

export async function prizeRoutes(fastify: FastifyInstance) {
  // POST /api/v1/rooms/:roomId/prizes - Create prize (organizer only)
  fastify.post('/api/v1/rooms/:roomId/prizes', { preHandler: requireAuth }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { roomId } = request.params as { roomId: string };
    const body = CreatePrizeSchema.parse(request.body);

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
          message: 'Only room organizers can create prizes',
        },
      };
      return reply.status(403).send(response);
    }

    // Create prize
    const prize = await prisma.prize.create({
      data: {
        roomId,
        name: body.name,
        description: body.description,
        imageUrl: body.imageUrl,
        quantity: body.quantity,
        quantityRemaining: body.quantity,
        metadata: body.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    const response: ApiResponse = {
      data: prize,
    };

    return reply.status(201).send(response);
  });

  // GET /api/v1/rooms/:roomId/prizes - List room prizes
  fastify.get('/api/v1/rooms/:roomId/prizes', async (request, reply) => {
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

    const prizes = await prisma.prize.findMany({
      where: {
        roomId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });

    const response: ApiResponse = {
      data: prizes,
    };

    return reply.send(response);
  });

  // GET /api/v1/rooms/:roomId/prizes/:prizeId - Get prize details
  fastify.get('/api/v1/rooms/:roomId/prizes/:prizeId', async (request, reply) => {
    const { roomId, prizeId } = request.params as { roomId: string; prizeId: string };

    const prize = await prisma.prize.findUnique({
      where: { id: prizeId, roomId, deletedAt: null },
      include: {
        winners: {
          where: { deletedAt: null },
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
          },
        },
      },
    });

    if (!prize) {
      const response: ApiResponse = {
        error: {
          code: 'NOT_FOUND',
          message: 'Prize not found',
        },
      };
      return reply.status(404).send(response);
    }

    const response: ApiResponse = {
      data: prize,
    };

    return reply.send(response);
  });

  // PATCH /api/v1/rooms/:roomId/prizes/:prizeId - Update prize (organizer only)
  fastify.patch('/api/v1/rooms/:roomId/prizes/:prizeId', { preHandler: requireAuth }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { roomId, prizeId } = request.params as { roomId: string; prizeId: string };
    const body = UpdatePrizeSchema.parse(request.body);

    // Check if user is organizer
    if (!(await isOrganizer(authReq.user.userId, roomId))) {
      const response: ApiResponse = {
        error: {
          code: 'FORBIDDEN',
          message: 'Only room organizers can update prizes',
        },
      };
      return reply.status(403).send(response);
    }

    // Find prize
    const existingPrize = await prisma.prize.findUnique({
      where: { id: prizeId, roomId, deletedAt: null },
    });

    if (!existingPrize) {
      const response: ApiResponse = {
        error: {
          code: 'NOT_FOUND',
          message: 'Prize not found',
        },
      };
      return reply.status(404).send(response);
    }

    // If quantity is being updated, adjust quantityRemaining proportionally
    let updateData: Record<string, unknown> = { ...body };
    if (body.quantity !== undefined && body.quantity !== existingPrize.quantity) {
      const awarded = existingPrize.quantity - existingPrize.quantityRemaining;
      const newRemaining = Math.max(0, body.quantity - awarded);
      updateData.quantityRemaining = newRemaining;
    }

    const prize = await prisma.prize.update({
      where: { id: prizeId },
      data: updateData,
    });

    const response: ApiResponse = {
      data: prize,
    };

    return reply.send(response);
  });

  // DELETE /api/v1/rooms/:roomId/prizes/:prizeId - Soft delete prize (organizer only)
  // CRITICAL: This MUST be a soft delete. Hard delete will fail if winners exist!
  fastify.delete('/api/v1/rooms/:roomId/prizes/:prizeId', { preHandler: requireAuth }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { roomId, prizeId } = request.params as { roomId: string; prizeId: string };

    // Check if user is organizer
    if (!(await isOrganizer(authReq.user.userId, roomId))) {
      const response: ApiResponse = {
        error: {
          code: 'FORBIDDEN',
          message: 'Only room organizers can delete prizes',
        },
      };
      return reply.status(403).send(response);
    }

    // Find prize
    const prize = await prisma.prize.findUnique({
      where: { id: prizeId, roomId, deletedAt: null },
    });

    if (!prize) {
      const response: ApiResponse = {
        error: {
          code: 'NOT_FOUND',
          message: 'Prize not found',
        },
      };
      return reply.status(404).send(response);
    }

    // SOFT DELETE ONLY - Never use prisma.prize.delete()!
    // Hard delete will fail with P2003 if Winner records exist
    await prisma.prize.update({
      where: { id: prizeId },
      data: { deletedAt: new Date() },
    });

    const response: ApiResponse = {
      data: { success: true },
    };

    return reply.send(response);
  });
}
