/**
 * User Routes
 * /api/v1/users/*
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index.js';
import { requireAuth } from '../middleware/auth.js';
import type { ApiResponse, AuthenticatedRequest } from '../types/index.js';

// Request validation schemas
const UpdateUserSchema = z.object({
  name: z.string().optional(),
  avatar: z.string().url().optional(),
});

export async function userRoutes(fastify: FastifyInstance) {
  // GET /api/v1/users/:userId
  fastify.get('/api/v1/users/:userId', { preHandler: requireAuth }, async (request, reply) => {
    const { userId } = request.params as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      const response: ApiResponse = {
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      };
      return reply.status(404).send(response);
    }

    const response: ApiResponse = {
      data: user,
    };

    return reply.send(response);
  });

  // PATCH /api/v1/users/:userId
  fastify.patch('/api/v1/users/:userId', { preHandler: requireAuth }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { userId } = request.params as { userId: string };
    const body = UpdateUserSchema.parse(request.body);

    // Users can only update their own profile
    if (authReq.user.userId !== userId) {
      const response: ApiResponse = {
        error: {
          code: 'FORBIDDEN',
          message: 'You can only update your own profile',
        },
      };
      return reply.status(403).send(response);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: body,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        updatedAt: true,
      },
    });

    const response: ApiResponse = {
      data: user,
    };

    return reply.send(response);
  });

  // DELETE /api/v1/users/:userId (soft delete)
  fastify.delete('/api/v1/users/:userId', { preHandler: requireAuth }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { userId } = request.params as { userId: string };

    // Users can only delete their own account
    if (authReq.user.userId !== userId) {
      const response: ApiResponse = {
        error: {
          code: 'FORBIDDEN',
          message: 'You can only delete your own account',
        },
      };
      return reply.status(403).send(response);
    }

    // Soft delete user's rooms first (to avoid onDelete: Restrict error)
    await prisma.room.updateMany({
      where: { createdBy: userId },
      data: { deletedAt: new Date() },
    });

    // Soft delete user
    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    const response: ApiResponse = {
      data: { success: true },
    };

    return reply.send(response);
  });
}
