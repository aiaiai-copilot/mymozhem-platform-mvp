/**
 * Room types
 */

import type { User } from './users.js';
import type { Participant } from './participants.js';
import type { Prize } from './prizes.js';
import type { Winner } from './winners.js';

/**
 * Room status enum
 */
export type RoomStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

/**
 * App info embedded in room
 */
export interface RoomApp {
  appId: string;
  manifest: unknown;
  manifestVersion: string | null;
}

/**
 * Room organizer info
 */
export interface RoomOrganizer {
  id: string;
  name: string | null;
  avatar: string | null;
}

/**
 * Room entity
 */
export interface Room {
  id: string;
  name: string;
  description: string | null;
  appId: string;
  appSettings: unknown;
  appManifestVersion: string;
  status: RoomStatus;
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/**
 * Room with relations (full response)
 */
export interface RoomWithRelations extends Room {
  app: RoomApp;
  organizer: RoomOrganizer;
  participants?: Participant[];
  prizes?: Prize[];
  winners?: Winner[];
  _count?: {
    participants: number;
    prizes: number;
    winners: number;
  };
}

/**
 * Create room request payload
 */
export interface CreateRoomRequest {
  name: string;
  description?: string;
  appId: string;
  appSettings?: unknown;
  isPublic?: boolean;
}

/**
 * Update room request payload
 */
export interface UpdateRoomRequest {
  name?: string;
  description?: string;
  appSettings?: unknown;
  status?: RoomStatus;
  isPublic?: boolean;
}

/**
 * Room list query parameters
 */
export interface RoomListParams {
  page?: number;
  limit?: number;
  status?: RoomStatus;
  appId?: string;
  isPublic?: boolean;
}

/**
 * Room response (single room)
 */
export type RoomResponse = RoomWithRelations;

/**
 * Room list response
 */
export type RoomListResponse = RoomWithRelations[];
