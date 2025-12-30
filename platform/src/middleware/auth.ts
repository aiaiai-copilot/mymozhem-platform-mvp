/**
 * Authentication Middleware
 *
 * Validates JWT tokens and attaches user to request
 *
 * Two variants:
 * - requireAuth: Fast path, JWT signature only (use for 99% of endpoints)
 * - requireAuthStrict: JWT + blacklist check (use for sensitive operations)
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAccessToken, hashToken } from '../utils/jwt.js';
import { prisma } from '../db.js';
import type { AuthenticatedRequest, ApiResponse } from '../types/index.js';

/**
 * Fast authentication middleware (JWT signature only)
 *
 * Validates JWT signature without database lookup.
 * Use for most endpoints - 10-20x faster than strict auth.
 *
 * Trade-off: Revoked tokens remain valid until expiry (max 1 hour).
 * This is acceptable for most operations since:
 * - Access tokens expire quickly (1 hour)
 * - Sensitive operations use requireAuthStrict
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

    // Verify JWT signature only (no database lookup - fast!)
    const payload = verifyAccessToken(token);

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
 * Strict authentication middleware (JWT + blacklist check)
 *
 * Validates JWT signature AND checks token blacklist.
 * Use for sensitive operations where immediate token revocation matters:
 * - logout
 * - delete account
 * - change password
 * - sensitive data access
 */
export async function requireAuthStrict(
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

    // Verify JWT signature
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
 * Optional authentication middleware (fast path)
 *
 * Attaches user if token is present and valid, but doesn't require it.
 * Uses fast JWT-only validation (no blacklist check).
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

    // Fast path: no blacklist check for optional auth
    (request as AuthenticatedRequest).user = payload;
  } catch {
    // Ignore errors for optional auth
  }
}
