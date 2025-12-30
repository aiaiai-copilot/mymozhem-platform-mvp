/**
 * Prize types
 */

/**
 * Prize entity
 */
export interface Prize {
  id: string;
  roomId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  quantity: number;
  quantityRemaining: number;
  metadata: unknown;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/**
 * Prize with winner count
 */
export interface PrizeWithCount extends Prize {
  _count?: {
    winners: number;
  };
}

/**
 * Create prize request payload
 */
export interface CreatePrizeRequest {
  name: string;
  description?: string;
  imageUrl?: string;
  quantity?: number;
  metadata?: unknown;
}

/**
 * Update prize request payload
 */
export interface UpdatePrizeRequest {
  name?: string;
  description?: string;
  imageUrl?: string;
  quantity?: number;
  metadata?: unknown;
}

/**
 * Prize list query parameters
 */
export interface PrizeListParams {
  page?: number;
  limit?: number;
  includeExhausted?: boolean;
}

/**
 * Prize response (single)
 */
export type PrizeResponse = Prize;

/**
 * Prize list response
 */
export type PrizeListResponse = Prize[];
