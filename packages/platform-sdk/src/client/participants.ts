/**
 * Participants client
 */

import { BaseClient } from './base.js';
import type { ApiResponse } from '../types/api.js';
import type {
  ParticipantResponse,
  ParticipantListResponse,
  UpdateParticipantRequest,
  ParticipantListParams,
} from '../types/participants.js';

/**
 * Participants API client
 */
export class ParticipantsClient extends BaseClient {
  private readonly basePath = '/api/v1/rooms';

  /**
   * Join a room (create participant)
   */
  async join(roomId: string, metadata?: unknown): Promise<ApiResponse<ParticipantResponse>> {
    return this.doPost<ParticipantResponse>(
      `${this.basePath}/${roomId}/participants`,
      metadata ? { metadata } : undefined
    );
  }

  /**
   * Leave a room (remove self)
   */
  async leave(roomId: string): Promise<ApiResponse<{ message: string }>> {
    return this.doDelete<{ message: string }>(`${this.basePath}/${roomId}/participants/me`);
  }

  /**
   * List participants in a room
   */
  async list(roomId: string, params?: ParticipantListParams): Promise<ApiResponse<ParticipantListResponse>> {
    return this.doGet<ParticipantListResponse>(
      `${this.basePath}/${roomId}/participants`,
      params as Record<string, string | number | boolean | undefined>
    );
  }

  /**
   * Update participant (organizer only)
   */
  async update(
    roomId: string,
    participantId: string,
    data: UpdateParticipantRequest
  ): Promise<ApiResponse<ParticipantResponse>> {
    return this.doPatch<ParticipantResponse>(
      `${this.basePath}/${roomId}/participants/${participantId}`,
      data
    );
  }

  /**
   * Remove participant from room (organizer only)
   */
  async remove(roomId: string, participantId: string): Promise<ApiResponse<{ message: string }>> {
    return this.doDelete<{ message: string }>(
      `${this.basePath}/${roomId}/participants/${participantId}`
    );
  }
}
