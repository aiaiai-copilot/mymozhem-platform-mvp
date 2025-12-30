/**
 * Global Error Handler Middleware
 */

import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import type { ApiResponse } from '../types/index.js';

export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  request.log.error(error);

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error, reply);
  }

  // Zod validation errors
  if (error instanceof ZodError) {
    return handleZodError(error, reply);
  }

  // Fastify validation errors
  if (error.validation) {
    const response: ApiResponse = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: { validation: error.validation },
      },
    };
    return reply.status(400).send(response);
  }

  // JWT errors
  if (error.message?.includes('jwt') || error.message?.includes('token')) {
    const response: ApiResponse = {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
      },
    };
    return reply.status(401).send(response);
  }

  // Default error
  const response: ApiResponse = {
    error: {
      code: error.code || 'INTERNAL_SERVER_ERROR',
      message: error.message || 'An unexpected error occurred',
    },
  };

  return reply.status(error.statusCode || 500).send(response);
}

function handlePrismaError(error: Prisma.PrismaClientKnownRequestError, reply: FastifyReply) {
  const response: ApiResponse = { error: { code: '', message: '' } };

  switch (error.code) {
    case 'P2002': // Unique constraint violation
      response.error = {
        code: 'DUPLICATE_ERROR',
        message: 'A record with this value already exists',
        details: { field: error.meta?.target },
      };
      return reply.status(409).send(response);

    case 'P2003': // Foreign key constraint violation (onDelete: Restrict)
      response.error = {
        code: 'FOREIGN_KEY_ERROR',
        message: 'Cannot delete record: related records exist',
        details: { field: error.meta?.field_name },
      };
      return reply.status(400).send(response);

    case 'P2025': // Record not found
      response.error = {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found',
      };
      return reply.status(404).send(response);

    default:
      response.error = {
        code: 'DATABASE_ERROR',
        message: 'A database error occurred',
      };
      return reply.status(500).send(response);
  }
}

function handleZodError(error: ZodError, reply: FastifyReply) {
  const response: ApiResponse = {
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: error.errors.reduce((acc, err) => {
        const path = err.path.join('.');
        acc[path] = err.message;
        return acc;
      }, {} as Record<string, string>),
    },
  };

  return reply.status(400).send(response);
}
