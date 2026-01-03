import { APIRequestContext, Page } from '@playwright/test';
import { TEST_CONFIG } from './config';


/**
 * Test user credentials
 */
export const TEST_USERS = {
  alice: { email: 'alice@example.com', password: 'password123', name: 'Alice Johnson' },
  bob: { email: 'bob@example.com', password: 'password123', name: 'Bob Smith' },
  charlie: { email: 'charlie@example.com', password: 'password123', name: 'Charlie Davis' },
  diana: { email: 'diana@example.com', password: 'password123', name: 'Diana Wilson' },
} as const;

export type TestUser = keyof typeof TEST_USERS;

/**
 * Login via API and return access token
 */
export async function loginAsUser(
  request: APIRequestContext,
  user: TestUser
): Promise<string> {
  const userData = TEST_USERS[user];
  const response = await request.post('http://127.0.0.1:3000/api/v1/auth/login', {
    data: {
      email: userData.email,
      password: userData.password,
    },
  });

  if (!response.ok()) {
    throw new Error(`Login failed for ${user}: ${response.status()}`);
  }

  const body = await response.json();
  return body.data.accessToken;
}

/**
 * Login via UI (for browser tests)
 */
export async function loginViaUI(
  page: Page,
  user: TestUser
): Promise<void> {
  const userData = TEST_USERS[user];

  await page.goto(`${TEST_CONFIG.lotteryUrl}/login`);
  await page.fill('input[type="email"]', userData.email);
  await page.fill('input[type="password"]', userData.password);
  await page.click('button:has-text("Login")');

  // Wait for redirect to home page
  await page.waitForURL(`${TEST_CONFIG.lotteryUrl}/`);
}

/**
 * Logout via UI
 */
export async function logoutViaUI(page: Page): Promise<void> {
  await page.click('text=Logout');
  await page.waitForURL(`${TEST_CONFIG.lotteryUrl}/login`);
}

/**
 * Get authorization header for API requests
 */
export function authHeader(token: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${token}`,
  };
}
