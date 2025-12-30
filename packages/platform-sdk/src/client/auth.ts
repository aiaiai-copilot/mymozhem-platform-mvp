/**
 * Authentication client
 */

import { BaseClient } from './base.js';
import type { ApiResponse } from '../types/api.js';
import type {
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  CurrentUserResponse,
} from '../types/auth.js';

/**
 * Authentication API client
 */
export class AuthClient extends BaseClient {
  private readonly basePath = '/api/v1/auth';

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
    const body: LoginRequest = { email, password };
    return this.doPost<LoginResponse>(`${this.basePath}/login`, body);
  }

  /**
   * Refresh access token
   */
  async refresh(refreshToken: string): Promise<ApiResponse<RefreshTokenResponse>> {
    const body: RefreshTokenRequest = { refreshToken };
    return this.doPost<RefreshTokenResponse>(`${this.basePath}/refresh`, body);
  }

  /**
   * Logout and invalidate tokens
   */
  async logout(): Promise<ApiResponse<{ message: string }>> {
    return this.doPost<{ message: string }>(`${this.basePath}/logout`);
  }

  /**
   * Get current authenticated user
   */
  async me(): Promise<ApiResponse<CurrentUserResponse>> {
    return this.doGet<CurrentUserResponse>(`${this.basePath}/me`);
  }
}
