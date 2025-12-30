/**
 * User types
 */

/**
 * User entity
 */
export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Update user request payload
 */
export interface UpdateUserRequest {
  name?: string;
  avatar?: string;
}

/**
 * User response (single user)
 */
export type UserResponse = User;
