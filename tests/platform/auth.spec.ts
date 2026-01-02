import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../helpers/auth';

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
