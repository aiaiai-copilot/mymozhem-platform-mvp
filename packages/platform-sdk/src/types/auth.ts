/**
 * Authentication types
 */

import type { User } from './users.js';

/**
 * Login request payload
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Login response data
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

/**
 * Refresh token request payload
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Refresh token response data
 */
export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: number;
}

/**
 * Current user response (GET /auth/me)
 */
export type CurrentUserResponse = User;

/**
 * Google OAuth URL response
 */
export interface GoogleAuthUrlResponse {
  url: string;
}

/**
 * OAuth callback tokens (parsed from URL fragment)
 */
export interface OAuthCallbackTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  redirectUrl: string;
}
