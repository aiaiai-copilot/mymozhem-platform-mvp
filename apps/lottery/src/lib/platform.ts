import { PlatformClient } from '@event-platform/sdk';

const PLATFORM_URL = import.meta.env.VITE_PLATFORM_URL || 'http://localhost:3000';

export const platform = new PlatformClient(PLATFORM_URL);

// Helper to set token after login
export function setAuthToken(token: string | null) {
  platform.setToken(token);
  if (token) {
    localStorage.setItem('accessToken', token);
  } else {
    localStorage.removeItem('accessToken');
  }
}

// Helper to get stored token
export function getStoredToken(): string | null {
  return localStorage.getItem('accessToken');
}

// Initialize from stored token on load
const storedToken = getStoredToken();
if (storedToken) {
  platform.setToken(storedToken);
}
