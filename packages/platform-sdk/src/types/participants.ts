/**
 * Participant types
 */

/**
 * Participant role enum
 */
export type ParticipantRole = 'ADMIN' | 'ORGANIZER' | 'MODERATOR' | 'PARTICIPANT' | 'VIEWER';

/**
 * Participant user info
 */
export interface ParticipantUser {
  id: string;
  name: string | null;
  avatar: string | null;
}

/**
 * Participant entity
 */
export interface Participant {
  id: string;
  userId: string;
  roomId: string;
  role: ParticipantRole;
  metadata: unknown;
  joinedAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/**
 * Participant with user relation
 */
export interface ParticipantWithUser extends Participant {
  user: ParticipantUser;
}

/**
 * Update participant request payload
 */
export interface UpdateParticipantRequest {
  role?: ParticipantRole;
  metadata?: unknown;
}

/**
 * Participant list query parameters
 */
export interface ParticipantListParams {
  page?: number;
  limit?: number;
  role?: ParticipantRole;
}

/**
 * Participant response (single)
 */
export type ParticipantResponse = ParticipantWithUser;

/**
 * Participant list response
 */
export type ParticipantListResponse = ParticipantWithUser[];
