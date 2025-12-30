/**
 * Prizes client
 */

import { BaseClient } from './base.js';
import type { ApiResponse } from '../types/api.js';
import type {
  PrizeResponse,
  PrizeListResponse,
  CreatePrizeRequest,
  UpdatePrizeRequest,
  PrizeListParams,
} from '../types/prizes.js';

/**
 * Prizes API client
 */
export class PrizesClient extends BaseClient {
  private readonly basePath = '/api/v1/rooms';

  /**
   * Create a prize in a room
   */
  async create(roomId: string, data: CreatePrizeRequest): Promise<ApiResponse<PrizeResponse>> {
    return this.doPost<PrizeResponse>(`${this.basePath}/${roomId}/prizes`, data);
  }

  /**
   * List prizes in a room
   */
  async list(roomId: string, params?: PrizeListParams): Promise<ApiResponse<PrizeListResponse>> {
    return this.doGet<PrizeListResponse>(
      `${this.basePath}/${roomId}/prizes`,
      params as Record<string, string | number | boolean | undefined>
    );
  }

  /**
   * Get prize by ID
   */
  async get(roomId: string, prizeId: string): Promise<ApiResponse<PrizeResponse>> {
    return this.doGet<PrizeResponse>(`${this.basePath}/${roomId}/prizes/${prizeId}`);
  }

  /**
   * Update prize
   */
  async update(
    roomId: string,
    prizeId: string,
    data: UpdatePrizeRequest
  ): Promise<ApiResponse<PrizeResponse>> {
    return this.doPatch<PrizeResponse>(`${this.basePath}/${roomId}/prizes/${prizeId}`, data);
  }

  /**
   * Delete prize (soft delete)
   */
  async delete(roomId: string, prizeId: string): Promise<ApiResponse<{ message: string }>> {
    return this.doDelete<{ message: string }>(`${this.basePath}/${roomId}/prizes/${prizeId}`);
  }
}
