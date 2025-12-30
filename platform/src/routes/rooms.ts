/**
 * Room Routes
 * /api/v1/rooms/*
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { RoomStatus, ParticipantRole } from '@prisma/client';
import { prisma } from '../index.js';
import { requireAuth } from '../middleware/auth.js';
import type { ApiResponse, AuthenticatedRequest, PaginationParams } from '../types/index.js';

// Request validation schemas
const CreateRoomSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  appId: z.string(),
  appSettings: z.record(z.unknown()),
  isPublic: z.boolean().default(true),
});

const UpdateRoomSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  appSettings: z.record(z.unknown()).optional(),
  status: z.nativeEnum(RoomStatus).optional(),
  isPublic: z.boolean().optional(),
});

export async function roomRoutes(fastify: FastifyInstance) {
  // GET /api/v1/rooms (list public rooms)
  fastify.get('/api/v1/rooms', async (request, reply) => {
    const { page = 1, limit = 20 } = request.query as PaginationParams;
    const skip = (page - 1) * limit;

    const [rooms, total] = await Promise.all([
      prisma.room.findMany({
        where: {
          isPublic: true,
          deletedAt: null,
        },
        include: {
          app: {
            select: {
              appId: true,
              manifest: true,
            },
          },
          organizer: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              participants: true,
              prizes: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.room.count({
        where: {
          isPublic: true,
          deletedAt: null,
        },
      }),
    ]);

    const response: ApiResponse = {
      data: rooms,
      meta: {
        page,
        limit,
        total,
      },
    };

    return reply.send(response);
  });

  // GET /api/v1/rooms/:roomId
  fastify.get('/api/v1/rooms/:roomId', async (request, reply) => {
    const { roomId } = request.params as { roomId: string };

    const room = await prisma.room.findUnique({
      where: { id: roomId, deletedAt: null },
      include: {
        app: {
          select: {
            appId: true,
            manifest: true,
            manifestVersion: true,
          },
        },
        organizer: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        participants: {
          where: { deletedAt: null },
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
        prizes: {
          where: { deletedAt: null },
        },
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
            prize: true,
          },
        },
      },
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

    const response: ApiResponse = {
      data: room,
    };

    return reply.send(response);
  });

  // POST /api/v1/rooms
  fastify.post('/api/v1/rooms', { preHandler: requireAuth }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const body = CreateRoomSchema.parse(request.body);

    // Get app and current manifest version
    const app = await prisma.app.findUnique({
      where: { appId: body.appId, deletedAt: null, isActive: true },
    });

    if (!app) {
      const response: ApiResponse = {
        error: {
          code: 'NOT_FOUND',
          message: 'App not found or inactive',
        },
      };
      return reply.status(404).send(response);
    }

    // Create room with locked manifest version
    const room = await prisma.room.create({
      data: {
        name: body.name,
        description: body.description,
        appId: body.appId,
        appManifestVersion: app.manifestVersion, // Lock to current version
        appSettings: body.appSettings,
        isPublic: body.isPublic,
        createdBy: authReq.user.userId,
      },
      include: {
        app: {
          select: {
            appId: true,
            manifest: true,
          },
        },
      },
    });

    // Auto-add creator as ORGANIZER
    await prisma.participant.create({
      data: {
        userId: authReq.user.userId,
        roomId: room.id,
        role: ParticipantRole.ORGANIZER,
      },
    });

    const response: ApiResponse = {
      data: room,
    };

    return reply.status(201).send(response);
  });

  // PATCH /api/v1/rooms/:roomId
  fastify.patch('/api/v1/rooms/:roomId', { preHandler: requireAuth }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { roomId } = request.params as { roomId: string };
    const body = UpdateRoomSchema.parse(request.body);

    // Check if user is organizer
    const participation = await prisma.participant.findUnique({
      where: {
        userId_roomId: {
          userId: authReq.user.userId,
          roomId,
        },
        deletedAt: null,
      },
    });

    if (!participation || participation.role !== ParticipantRole.ORGANIZER) {
      const response: ApiResponse = {
        error: {
          code: 'FORBIDDEN',
          message: 'Only room organizers can update the room',
        },
      };
      return reply.status(403).send(response);
    }

    const room = await prisma.room.update({
      where: { id: roomId },
      data: body,
    });

    const response: ApiResponse = {
      data: room,
    };

    return reply.send(response);
  });

  // DELETE /api/v1/rooms/:roomId (soft delete)
  fastify.delete('/api/v1/rooms/:roomId', { preHandler: requireAuth }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const { roomId } = request.params as { roomId: string };

    // Check if user is organizer
    const participation = await prisma.participant.findUnique({
      where: {
        userId_roomId: {
          userId: authReq.user.userId,
          roomId,
        },
        deletedAt: null,
      },
    });

    if (!participation || participation.role !== ParticipantRole.ORGANIZER) {
      const response: ApiResponse = {
        error: {
          code: 'FORBIDDEN',
          message: 'Only room organizers can delete the room',
        },
      };
      return reply.status(403).send(response);
    }

    // Soft delete room
    await prisma.room.update({
      where: { id: roomId },
      data: { deletedAt: new Date() },
    });

    const response: ApiResponse = {
      data: { success: true },
    };

    return reply.send(response);
  });
}
