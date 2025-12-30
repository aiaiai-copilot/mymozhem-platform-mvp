/**
 * Authentication Middleware
 *
 * Validates JWT tokens and attaches user to request
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken, hashToken } from '../utils/jwt.js';
import { prisma } from '../index.js';
import type { AuthenticatedRequest, ApiResponse } from '../types/index.js';

/**
 * Require authentication middleware
 * Validates JWT and checks blacklist
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const response: ApiResponse = {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header',
        },
      };
      return reply.status(401).send(response);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT signature (no database lookup - fast!)
    const payload = verifyAccessToken(token);

    // Check if token is blacklisted (revoked)
    const tokenHash = hashToken(token);
    const blacklisted = await prisma.tokenBlacklist.findUnique({
      where: { tokenHash },
    });

    if (blacklisted) {
      const response: ApiResponse = {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token has been revoked',
        },
      };
      return reply.status(401).send(response);
    }

    // Attach user to request
    (request as AuthenticatedRequest).user = payload;
  } catch (error) {
    const response: ApiResponse = {
      error: {
        code: 'UNAUTHORIZED',
        message: error instanceof Error ? error.message : 'Authentication failed',
      },
    };
    return reply.status(401).send(response);
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is present and valid, but doesn't require it
 */
export async function optionalAuth(
  request: FastifyRequest,
  _reply: FastifyReply
) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return; // No token, continue without auth
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    // Check blacklist
    const tokenHash = hashToken(token);
    const blacklisted = await prisma.tokenBlacklist.findUnique({
      where: { tokenHash },
    });

    if (!blacklisted) {
      (request as AuthenticatedRequest).user = payload;
    }
  } catch {
    // Ignore errors for optional auth
  }
}
