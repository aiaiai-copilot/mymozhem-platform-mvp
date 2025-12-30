/**
 * Prisma Client Instance
 *
 * Extracted to separate file to avoid circular imports
 * (middleware/auth.ts was importing from index.ts)
 */

import { PrismaClient } from '@prisma/client';
import { config } from './config/index.js';

export const prisma = new PrismaClient({
  log: config.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
});
