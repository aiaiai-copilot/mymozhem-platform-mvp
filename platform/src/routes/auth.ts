/**
 * Authentication Routes
 * /api/v1/auth/*
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index.js';
import { generateAccessToken, generateRefreshToken, hashToken } from '../utils/jwt.js';
import type { ApiResponse, AuthenticatedRequest } from '../types/index.js';
import { requireAuth } from '../middleware/auth.js';

// Request validation schemas
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6), // For demo - in production use OAuth
});

const RefreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export async function authRoutes(fastify: FastifyInstance) {
  // POST /api/v1/auth/login (Demo login - in production use OAuth)
  fastify.post('/api/v1/auth/login', async (request, reply) => {
    const body = LoginSchema.parse(request.body);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: body.email, deletedAt: null },
    });

    if (!user) {
      const response: ApiResponse = {
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      };
      return reply.status(401).send(response);
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    const refreshToken = generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt,
        deviceInfo: request.headers['user-agent'] || null,
        ipAddress: request.ip,
      },
    });

    const response: ApiResponse = {
      data: {
        accessToken,
        refreshToken,
        expiresIn: 3600, // 1 hour
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        },
      },
    };

    return reply.send(response);
  });

  // POST /api/v1/auth/refresh
  fastify.post('/api/v1/auth/refresh', async (request, reply) => {
    const body = RefreshTokenSchema.parse(request.body);

    // Find session
    const session = await prisma.session.findUnique({
      where: { refreshToken: body.refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      const response: ApiResponse = {
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired refresh token',
        },
      };
      return reply.status(401).send(response);
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      userId: session.user.id,
      email: session.user.email,
    });

    // Update session last used
    await prisma.session.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });

    const response: ApiResponse = {
      data: {
        accessToken,
        expiresIn: 3600,
      },
    };

    return reply.send(response);
  });

  // POST /api/v1/auth/logout
  fastify.post('/api/v1/auth/logout', { preHandler: requireAuth }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const authHeader = request.headers.authorization!;
    const token = authHeader.substring(7);

    // Add token to blacklist
    const tokenHash = hashToken(token);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Match JWT expiry

    await prisma.tokenBlacklist.create({
      data: {
        tokenHash,
        userId: authReq.user.userId,
        reason: 'logout',
        expiresAt,
      },
    });

    // Delete all user sessions
    await prisma.session.deleteMany({
      where: { userId: authReq.user.userId },
    });

    const response: ApiResponse = {
      data: { success: true },
    };

    return reply.send(response);
  });

  // GET /api/v1/auth/me
  fastify.get('/api/v1/auth/me', { preHandler: requireAuth }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;

    const user = await prisma.user.findUnique({
      where: { id: authReq.user.userId, deletedAt: null },
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
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    };

    return reply.send(response);
  });
}
