/**
 * Platform SDK Client
 *
 * Main entry point for the type-safe API client
 */

import { BaseClient, PlatformApiError } from './base.js';
import { AuthClient } from './auth.js';
import { UsersClient } from './users.js';
import { RoomsClient } from './rooms.js';
import { ParticipantsClient } from './participants.js';
import { PrizesClient } from './prizes.js';
import { WinnersClient } from './winners.js';

export { PlatformApiError } from './base.js';

/**
 * Platform API Client
 *
 * Type-safe client for interacting with the Event Platform API.
 *
 * @example
 * ```typescript
 * import { PlatformClient } from '@event-platform/sdk';
 *
 * const client = new PlatformClient('http://localhost:3000');
 *
 * // Login
 * const { data } = await client.auth.login('alice@example.com', 'password123');
 * client.setToken(data.accessToken);
 *
 * // List rooms with full type safety
 * const rooms = await client.rooms.list({ page: 1, limit: 10 });
 *
 * // Join a room
 * await client.participants.join(roomId);
 *
 * // Create a prize
 * await client.prizes.create(roomId, { name: 'Grand Prize', quantity: 1 });
 *
 * // Select a winner
 * await client.winners.select(roomId, { participantId, prizeId });
 * ```
 */
export class PlatformClient {
  private readonly baseUrl: string;
  private token: string | null = null;

  /**
   * Authentication endpoints
   */
  public readonly auth: AuthClient;

  /**
   * User management endpoints
   */
  public readonly users: UsersClient;

  /**
   * Room management endpoints
   */
  public readonly rooms: RoomsClient;

  /**
   * Participant management endpoints
   */
  public readonly participants: ParticipantsClient;

  /**
   * Prize management endpoints
   */
  public readonly prizes: PrizesClient;

  /**
   * Winner management endpoints
   */
  public readonly winners: WinnersClient;

  /**
   * Create a new Platform API client
   *
   * @param baseUrl - The base URL of the Platform API (e.g., 'http://localhost:3000')
   * @param token - Optional initial authentication token
   */
  constructor(baseUrl: string, token?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token ?? null;

    // Initialize sub-clients
    this.auth = new AuthClient(this.baseUrl, this.token ?? undefined);
    this.users = new UsersClient(this.baseUrl, this.token ?? undefined);
    this.rooms = new RoomsClient(this.baseUrl, this.token ?? undefined);
    this.participants = new ParticipantsClient(this.baseUrl, this.token ?? undefined);
    this.prizes = new PrizesClient(this.baseUrl, this.token ?? undefined);
    this.winners = new WinnersClient(this.baseUrl, this.token ?? undefined);
  }

  /**
   * Set authentication token for all clients
   */
  setToken(token: string | null): void {
    this.token = token;
    this.auth.setToken(token);
    this.users.setToken(token);
    this.rooms.setToken(token);
    this.participants.setToken(token);
    this.prizes.setToken(token);
    this.winners.setToken(token);
  }

  /**
   * Get current authentication token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Check if client is authenticated
   */
  isAuthenticated(): boolean {
    return this.token !== null;
  }
}
