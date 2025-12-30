/**
 * Winner types
 */

import type { ParticipantWithUser } from './participants.js';

/**
 * Winner prize info
 */
export interface WinnerPrize {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
}

/**
 * Winner entity
 */
export interface Winner {
  id: string;
  roomId: string;
  participantId: string;
  prizeId: string;
  metadata: unknown;
  createdAt: string;
  deletedAt: string | null;
}

/**
 * Winner with relations (full response)
 */
export interface WinnerWithRelations extends Winner {
  participant: ParticipantWithUser;
  prize: WinnerPrize;
}

/**
 * Select winner request payload
 */
export interface SelectWinnerRequest {
  participantId: string;
  prizeId: string;
  metadata?: unknown;
}

/**
 * Winner list query parameters
 */
export interface WinnerListParams {
  page?: number;
  limit?: number;
  prizeId?: string;
  participantId?: string;
}

/**
 * Winner response (single)
 */
export type WinnerResponse = WinnerWithRelations;

/**
 * Winner list response
 */
export type WinnerListResponse = WinnerWithRelations[];
