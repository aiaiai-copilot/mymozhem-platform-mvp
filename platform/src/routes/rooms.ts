/**
 * Room Routes
 * /api/v1/rooms/*
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { RoomStatus, ParticipantRole, Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { validateAppSettings, formatValidationErrors, AppManifest } from '../utils/validateAppSettings.js';
import type { ApiResponse, AuthenticatedRequest, PaginationParams } from '../types/index.js';
import { broadcastRoomUpdated, broadcastRoomStatusChanged, broadcastRoomDeleted } from '../websocket/events.js';

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
    const query = request.query as PaginationParams;
    const page = parseInt(String(query.page || '1'), 10);
    const limit = parseInt(String(query.limit || '20'), 10);
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

    // Validate appSettings against app manifest schema
    const manifest = app.manifest as AppManifest;
    const validation = validateAppSettings(body.appSettings, manifest);

    if (!validation.valid) {
      const response: ApiResponse = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'appSettings does not match app manifest schema',
          details: {
            errors: validation.errors,
            hint: formatValidationErrors(validation.errors),
          },
        },
      };
      return reply.status(400).send(response);
    }

    // Create room with locked manifest version
    const room = await prisma.room.create({
      data: {
        name: body.name,
        description: body.description,
        appId: body.appId,
        appManifestVersion: app.manifestVersion, // Lock to current version
        appSettings: body.appSettings as Prisma.InputJsonValue,
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

    // If updating appSettings, validate against manifest
    if (body.appSettings) {
      const existingRoom = await prisma.room.findUnique({
        where: { id: roomId },
        include: { app: true },
      });

      if (existingRoom) {
        const manifest = existingRoom.app.manifest as AppManifest;
        const validation = validateAppSettings(body.appSettings, manifest);

        if (!validation.valid) {
          const response: ApiResponse = {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'appSettings does not match app manifest schema',
              details: {
                errors: validation.errors,
                hint: formatValidationErrors(validation.errors),
              },
            },
          };
          return reply.status(400).send(response);
        }
      }
    }

    // Get current room to check for status changes
    const currentRoom = await prisma.room.findUnique({
      where: { id: roomId },
      select: { status: true },
    });

    // Prepare update data with proper type casting for JSON fields
    const updateData: Prisma.RoomUpdateInput = {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.isPublic !== undefined && { isPublic: body.isPublic }),
      ...(body.appSettings !== undefined && { appSettings: body.appSettings as Prisma.InputJsonValue }),
    };

    const room = await prisma.room.update({
      where: { id: roomId },
      data: updateData,
    });

    // Broadcast room updated
    broadcastRoomUpdated(roomId, body, room);

    // Broadcast status change if status was updated
    if (body.status && currentRoom && body.status !== currentRoom.status) {
      broadcastRoomStatusChanged(roomId, currentRoom.status, body.status);
    }

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

    // Broadcast room deleted
    broadcastRoomDeleted(roomId);

    const response: ApiResponse = {
      data: { success: true },
    };

    return reply.send(response);
  });
}
