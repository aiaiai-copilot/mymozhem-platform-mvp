/**
 * WebSocket Authentication Middleware
 *
 * Validates JWT tokens for Socket.io connections
 */

import type { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../db.js';

interface JWTPayload {
  userId: string;
  iat: number;
  exp: number;
}

/**
 * Authenticate socket connection using JWT token
 */
export async function authenticateSocket(socket: Socket, next: (err?: Error) => void) {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication failed: No token provided'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return next(new Error('Authentication failed: User not found'));
    }

    // Attach user data to socket
    socket.data.userId = user.id;
    socket.data.userEmail = user.email;
    socket.data.userName = user.name;

    next();
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'TokenExpiredError') {
        return next(new Error('Authentication failed: Token expired'));
      }
      if (error.name === 'JsonWebTokenError') {
        return next(new Error('Authentication failed: Invalid token'));
      }
      return next(new Error(`Authentication failed: ${error.message}`));
    }
    return next(new Error('Authentication failed: Unknown error'));
  }
}
