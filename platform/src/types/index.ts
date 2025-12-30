/**
 * Common TypeScript types and interfaces
 */

import { FastifyRequest } from 'fastify';

/**
 * API Response format
 */
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

/**
 * Authenticated user in JWT token
 */
export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Authenticated Fastify request
 */
export interface AuthenticatedRequest extends FastifyRequest {
  user: JwtPayload;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Common query filters
 */
export interface QueryFilters {
  includeDeleted?: boolean;
}
