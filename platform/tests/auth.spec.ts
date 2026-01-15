import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../../tests/helpers/auth';

/**
 * TS-P-001: User Authentication (REST API)
 * Tests platform API authentication endpoints
 */
test.describe('TS-P-001: Platform Authentication API', () => {

  test('1.1: Password Login - Success', async ({ request }) => {
    const response = await request.post('http://127.0.0.1:3000/api/v1/auth/login', {
      data: {
        email: TEST_USERS.alice.email,
        password: TEST_USERS.alice.password,
      },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.data).toHaveProperty('user');
    expect(body.data).toHaveProperty('accessToken');
    expect(body.data).toHaveProperty('refreshToken');
    expect(body.data.user.email).toBe(TEST_USERS.alice.email);
    expect(body.data.user.name).toBe(TEST_USERS.alice.name);
  });

  test('1.2: Login with Invalid Credentials', async ({ request }) => {
    const response = await request.post('http://127.0.0.1:3000/api/v1/auth/login', {
      data: {
        email: TEST_USERS.alice.email,
        password: 'wrongpassword',
      },
    });

    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('INVALID_CREDENTIALS');
  });

  test('1.3: Logout - Success', async ({ request }) => {
    // Login first
    const loginResp = await request.post('http://127.0.0.1:3000/api/v1/auth/login', {
      data: {
        email: TEST_USERS.alice.email,
        password: TEST_USERS.alice.password,
      },
    });

    const { accessToken } = (await loginResp.json()).data;

    // Logout
    const logoutResp = await request.post('http://127.0.0.1:3000/api/v1/auth/logout', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    expect(logoutResp.status()).toBe(200);

    const body = await logoutResp.json();
    expect(body.data.success).toBe(true);
  });

  test('1.4: Get Current User', async ({ request }) => {
    // Login first
    const loginResp = await request.post('http://127.0.0.1:3000/api/v1/auth/login', {
      data: {
        email: TEST_USERS.alice.email,
        password: TEST_USERS.alice.password,
      },
    });

    const { accessToken } = (await loginResp.json()).data;

    // Get current user
    const meResp = await request.get('http://127.0.0.1:3000/api/v1/auth/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    expect(meResp.status()).toBe(200);

    const body = await meResp.json();
    expect(body.data.email).toBe(TEST_USERS.alice.email);
    expect(body.data.name).toBe(TEST_USERS.alice.name);
  });

  test('1.5: Get Current User - Unauthorized', async ({ request }) => {
    const response = await request.get('http://127.0.0.1:3000/api/v1/auth/me');

    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  test('1.6: Get Current User - Invalid Token', async ({ request }) => {
    const response = await request.get('http://127.0.0.1:3000/api/v1/auth/me', {
      headers: {
        'Authorization': 'Bearer invalid-token-here',
      },
    });

    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body.error).toBeDefined();
  });
});

/**
 * TS-P-002: Google OAuth API
 * Tests Google OAuth endpoints (without actual Google integration)
 */
test.describe('TS-P-002: Google OAuth API', () => {

  test('2.1: Get Google OAuth URL - Returns Valid URL', async ({ request }) => {
    const response = await request.get('http://127.0.0.1:3000/api/v1/auth/google/url');

    // If OAuth is configured, should return 200 with URL
    // If not configured, should return 503
    if (response.status() === 200) {
      const body = await response.json();
      expect(body.data).toHaveProperty('url');
      expect(body.data.url).toContain('accounts.google.com');
      expect(body.data.url).toContain('client_id=');
      expect(body.data.url).toContain('redirect_uri=');
      expect(body.data.url).toContain('response_type=code');
      expect(body.data.url).toContain('scope=');
    } else {
      // OAuth not configured (expected in test environment without Google credentials)
      expect(response.status()).toBe(503);
      const body = await response.json();
      expect(body.error.code).toBe('OAUTH_NOT_CONFIGURED');
    }
  });

  test('2.2: Get Google OAuth URL - With Redirect URL Parameter', async ({ request }) => {
    const redirectUrl = '/create';
    const response = await request.get(
      `http://127.0.0.1:3000/api/v1/auth/google/url?redirect_url=${encodeURIComponent(redirectUrl)}`
    );

    if (response.status() === 200) {
      const body = await response.json();
      expect(body.data.url).toContain('state=');

      // Decode state parameter to verify redirect URL is included
      const url = new URL(body.data.url);
      const state = url.searchParams.get('state');
      expect(state).toBeTruthy();

      // State is base64 encoded JSON with redirectUrl
      const decodedState = JSON.parse(Buffer.from(state!, 'base64').toString());
      expect(decodedState.redirectUrl).toBe(redirectUrl);
      expect(decodedState.timestamp).toBeDefined();
    } else {
      // OAuth not configured
      expect(response.status()).toBe(503);
    }
  });

  test('2.3: Google OAuth Callback - Without Code Returns Error', async ({ request }) => {
    // Calling callback without authorization code should fail
    const response = await request.get('http://127.0.0.1:3000/api/v1/auth/google/callback', {
      maxRedirects: 0, // Don't follow redirects
    });

    // Should redirect to login with error (302 redirect)
    // Or return error if OAuth not configured
    expect([302, 503]).toContain(response.status());

    if (response.status() === 302) {
      const location = response.headers()['location'];
      expect(location).toContain('error=oauth_failed');
    }
  });
});
