/**
 * Users client
 */

import { BaseClient } from './base.js';
import type { ApiResponse } from '../types/api.js';
import type { UserResponse, UpdateUserRequest } from '../types/users.js';

/**
 * Users API client
 */
export class UsersClient extends BaseClient {
  private readonly basePath = '/api/v1/users';

  /**
   * Get user by ID
   */
  async get(userId: string): Promise<ApiResponse<UserResponse>> {
    return this.doGet<UserResponse>(`${this.basePath}/${userId}`);
  }

  /**
   * Update user
   */
  async update(userId: string, data: UpdateUserRequest): Promise<ApiResponse<UserResponse>> {
    return this.doPatch<UserResponse>(`${this.basePath}/${userId}`, data);
  }

  /**
   * Delete user (soft delete)
   */
  async delete(userId: string): Promise<ApiResponse<{ message: string }>> {
    return this.doDelete<{ message: string }>(`${this.basePath}/${userId}`);
  }
}
