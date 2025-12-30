/**
 * Winners client
 */

import { BaseClient } from './base.js';
import type { ApiResponse } from '../types/api.js';
import type {
  WinnerResponse,
  WinnerListResponse,
  SelectWinnerRequest,
  WinnerListParams,
} from '../types/winners.js';

/**
 * Winners API client
 */
export class WinnersClient extends BaseClient {
  private readonly basePath = '/api/v1/rooms';

  /**
   * Select a winner (atomic operation)
   */
  async select(roomId: string, data: SelectWinnerRequest): Promise<ApiResponse<WinnerResponse>> {
    return this.doPost<WinnerResponse>(`${this.basePath}/${roomId}/winners`, data);
  }

  /**
   * List winners in a room
   */
  async list(roomId: string, params?: WinnerListParams): Promise<ApiResponse<WinnerListResponse>> {
    return this.doGet<WinnerListResponse>(
      `${this.basePath}/${roomId}/winners`,
      params as Record<string, string | number | boolean | undefined>
    );
  }

  /**
   * Get winner by ID
   */
  async get(roomId: string, winnerId: string): Promise<ApiResponse<WinnerResponse>> {
    return this.doGet<WinnerResponse>(`${this.basePath}/${roomId}/winners/${winnerId}`);
  }

  /**
   * Revoke winner (restores prize quantity)
   */
  async revoke(roomId: string, winnerId: string): Promise<ApiResponse<{ message: string }>> {
    return this.doDelete<{ message: string }>(`${this.basePath}/${roomId}/winners/${winnerId}`);
  }
}
