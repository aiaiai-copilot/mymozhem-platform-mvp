/**
 * Rooms client
 */

import { BaseClient } from './base.js';
import type { ApiResponse } from '../types/api.js';
import type {
  RoomResponse,
  RoomListResponse,
  CreateRoomRequest,
  UpdateRoomRequest,
  RoomListParams,
} from '../types/rooms.js';

/**
 * Rooms API client
 */
export class RoomsClient extends BaseClient {
  private readonly basePath = '/api/v1/rooms';

  /**
   * List rooms with optional filters
   */
  async list(params?: RoomListParams): Promise<ApiResponse<RoomListResponse>> {
    return this.doGet<RoomListResponse>(this.basePath, params as Record<string, string | number | boolean | undefined>);
  }

  /**
   * Get room by ID
   */
  async get(roomId: string): Promise<ApiResponse<RoomResponse>> {
    return this.doGet<RoomResponse>(`${this.basePath}/${roomId}`);
  }

  /**
   * Create a new room
   */
  async create(data: CreateRoomRequest): Promise<ApiResponse<RoomResponse>> {
    return this.doPost<RoomResponse>(this.basePath, data);
  }

  /**
   * Update room
   */
  async update(roomId: string, data: UpdateRoomRequest): Promise<ApiResponse<RoomResponse>> {
    return this.doPatch<RoomResponse>(`${this.basePath}/${roomId}`, data);
  }

  /**
   * Delete room
   */
  async delete(roomId: string): Promise<ApiResponse<{ message: string }>> {
    return this.doDelete<{ message: string }>(`${this.basePath}/${roomId}`);
  }
}
