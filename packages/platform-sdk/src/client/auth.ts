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
  GoogleAuthUrlResponse,
  OAuthCallbackTokens,
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

  /**
   * Get Google OAuth URL for redirect
   * @param redirectUrl - URL to redirect after successful auth
   */
  async getGoogleAuthUrl(redirectUrl?: string): Promise<ApiResponse<GoogleAuthUrlResponse>> {
    const params = redirectUrl ? `?redirect_url=${encodeURIComponent(redirectUrl)}` : '';
    return this.doGet<GoogleAuthUrlResponse>(`${this.basePath}/google/url${params}`);
  }

  /**
   * Parse OAuth callback tokens from URL fragment
   * @param fragment - URL fragment (everything after #)
   * @returns Parsed tokens or null if invalid
   */
  parseOAuthCallback(fragment: string): OAuthCallbackTokens | null {
    const params = new URLSearchParams(fragment);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const expiresIn = params.get('expires_in');
    const redirectUrl = params.get('redirect_url');

    if (!accessToken || !refreshToken || !expiresIn) {
      return null;
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: parseInt(expiresIn, 10),
      redirectUrl: redirectUrl ? decodeURIComponent(redirectUrl) : '/',
    };
  }
}
