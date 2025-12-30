/**
 * JWT Utilities
 *
 * Token generation and validation
 */

import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import type { JwtPayload } from '../types/index.js';
import crypto from 'crypto';

/**
 * Generate access token (JWT)
 * Validated by signature only - no database lookup required
 */
export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

/**
 * Generate refresh token
 * Stored in database Session table
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verify access token
 * Returns decoded payload if valid
 */
export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Hash token for storage (used for blacklist)
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
