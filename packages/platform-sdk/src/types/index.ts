/**
 * Platform SDK Types
 *
 * Re-exports all type definitions for the Event Platform API
 */

// Core API types
export type {
  ApiError,
  ApiResponse,
  PaginationMeta,
  PaginationParams,
  QueryFilters,
  JwtPayload,
} from './api.js';

// Auth types
export type {
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  CurrentUserResponse,
} from './auth.js';

// User types
export type {
  User,
  UpdateUserRequest,
  UserResponse,
} from './users.js';

// Room types
export type {
  RoomStatus,
  RoomApp,
  RoomOrganizer,
  Room,
  RoomWithRelations,
  CreateRoomRequest,
  UpdateRoomRequest,
  RoomListParams,
  RoomResponse,
  RoomListResponse,
} from './rooms.js';

// Participant types
export type {
  ParticipantRole,
  ParticipantUser,
  Participant,
  ParticipantWithUser,
  UpdateParticipantRequest,
  ParticipantListParams,
  ParticipantResponse,
  ParticipantListResponse,
} from './participants.js';

// Prize types
export type {
  Prize,
  PrizeWithCount,
  CreatePrizeRequest,
  UpdatePrizeRequest,
  PrizeListParams,
  PrizeResponse,
  PrizeListResponse,
} from './prizes.js';

// Winner types
export type {
  WinnerPrize,
  Winner,
  WinnerWithRelations,
  SelectWinnerRequest,
  WinnerListParams,
  WinnerResponse,
  WinnerListResponse,
} from './winners.js';
