/**
 * Authentication Routes
 * /api/v1/auth/*
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db.js';
import { config } from '../config/index.js';
import { generateAccessToken, generateRefreshToken, hashToken } from '../utils/jwt.js';
import type { ApiResponse, AuthenticatedRequest } from '../types/index.js';
import { requireAuth, requireAuthStrict } from '../middleware/auth.js';

// Interface for Google userinfo response
interface GoogleUserInfo {
  sub: string; // Google user ID
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

// Request validation schemas
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6), // For demo - in production use OAuth
});

const RefreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export async function authRoutes(fastify: FastifyInstance) {
  // POST /api/v1/auth/login (Demo login - in production use OAuth)
  fastify.post('/api/v1/auth/login', async (request, reply) => {
    const body = LoginSchema.parse(request.body);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: body.email, deletedAt: null },
    });

    if (!user) {
      const response: ApiResponse = {
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      };
      return reply.status(401).send(response);
    }

    // TODO: DEMO LOGIN - Replace with proper authentication in production
    // Production options:
    // 1. OAuth (Google/Yandex) - no password needed, recommended
    // 2. Password hashing with bcrypt if email/password auth is required
    //
    // For demo purposes, accept "password123" for all seeded users
    const DEMO_PASSWORD = 'password123';
    if (body.password !== DEMO_PASSWORD) {
      const response: ApiResponse = {
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      };
      return reply.status(401).send(response);
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    const refreshToken = generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt,
        deviceInfo: request.headers['user-agent'] || null,
        ipAddress: request.ip,
      },
    });

    const response: ApiResponse = {
      data: {
        accessToken,
        refreshToken,
        expiresIn: 3600, // 1 hour
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
        },
      },
    };

    return reply.send(response);
  });

  // POST /api/v1/auth/refresh
  fastify.post('/api/v1/auth/refresh', async (request, reply) => {
    const body = RefreshTokenSchema.parse(request.body);

    // Find session
    const session = await prisma.session.findUnique({
      where: { refreshToken: body.refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      const response: ApiResponse = {
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired refresh token',
        },
      };
      return reply.status(401).send(response);
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      userId: session.user.id,
      email: session.user.email,
    });

    // Update session last used
    await prisma.session.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });

    const response: ApiResponse = {
      data: {
        accessToken,
        expiresIn: 3600,
      },
    };

    return reply.send(response);
  });

  // POST /api/v1/auth/logout (uses strict auth - sensitive operation)
  fastify.post('/api/v1/auth/logout', { preHandler: requireAuthStrict }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;
    const authHeader = request.headers.authorization!;
    const token = authHeader.substring(7);

    // Add token to blacklist
    const tokenHash = hashToken(token);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Match JWT expiry

    await prisma.tokenBlacklist.create({
      data: {
        tokenHash,
        userId: authReq.user.userId,
        reason: 'logout',
        expiresAt,
      },
    });

    // Delete all user sessions
    await prisma.session.deleteMany({
      where: { userId: authReq.user.userId },
    });

    const response: ApiResponse = {
      data: { success: true },
    };

    return reply.send(response);
  });

  // GET /api/v1/auth/me
  fastify.get('/api/v1/auth/me', { preHandler: requireAuth }, async (request, reply) => {
    const authReq = request as AuthenticatedRequest;

    const user = await prisma.user.findUnique({
      where: { id: authReq.user.userId, deletedAt: null },
    });

    if (!user) {
      const response: ApiResponse = {
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
      };
      return reply.status(404).send(response);
    }

    const response: ApiResponse = {
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
    };

    return reply.send(response);
  });

  // GET /api/v1/auth/google/callback - Handle OAuth callback from Google
  fastify.get('/api/v1/auth/google/callback', async (request, reply) => {
    try {
      // Check if OAuth2 is configured
      const googleOAuth2 = (fastify as unknown as { googleOAuth2?: { getAccessTokenFromAuthorizationCodeFlow: (req: FastifyRequest) => Promise<{ token: { access_token: string } }> } }).googleOAuth2;
      if (!googleOAuth2) {
        return reply.status(503).send({
          error: {
            code: 'OAUTH_NOT_CONFIGURED',
            message: 'Google OAuth is not configured',
          },
        });
      }

      // Exchange authorization code for access token
      const { token } = await googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

      // Fetch user info from Google
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
        },
      });

      if (!userInfoResponse.ok) {
        throw new Error('Failed to fetch Google user info');
      }

      const googleUser = await userInfoResponse.json() as GoogleUserInfo;

      // Find or create user
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { provider: 'google', providerId: googleUser.sub },
            { email: googleUser.email, deletedAt: null },
          ],
        },
      });

      if (user) {
        // Update existing user with Google info if they logged in via email before
        if (user.provider !== 'google' || !user.providerId) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              provider: 'google',
              providerId: googleUser.sub,
              emailVerified: googleUser.email_verified ? new Date() : null,
              name: user.name || googleUser.name || null,
              avatar: user.avatar || googleUser.picture || null,
            },
          });
        }
      } else {
        // Create new user
        user = await prisma.user.create({
          data: {
            email: googleUser.email,
            name: googleUser.name || null,
            avatar: googleUser.picture || null,
            provider: 'google',
            providerId: googleUser.sub,
            emailVerified: googleUser.email_verified ? new Date() : null,
          },
        });
      }

      // Generate platform tokens
      const accessToken = generateAccessToken({
        userId: user.id,
        email: user.email,
      });

      const refreshToken = generateRefreshToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create session
      await prisma.session.create({
        data: {
          userId: user.id,
          refreshToken,
          expiresAt,
          deviceInfo: request.headers['user-agent'] || null,
          ipAddress: request.ip,
        },
      });

      // Get redirect URL from state parameter (passed by frontend)
      const stateParam = (request.query as { state?: string }).state;
      let redirectUrl = '/';
      if (stateParam) {
        try {
          const state = JSON.parse(Buffer.from(stateParam, 'base64').toString());
          redirectUrl = state.redirectUrl || '/';
        } catch {
          // Invalid state, use default redirect
        }
      }

      // Determine frontend origin for redirect
      const frontendOrigin = config.corsOrigin[0] || 'http://localhost:3001';

      // Redirect to frontend with tokens in URL fragment
      const callbackUrl = new URL('/auth/callback', frontendOrigin);
      callbackUrl.hash = `access_token=${accessToken}&refresh_token=${refreshToken}&expires_in=3600&redirect_url=${encodeURIComponent(redirectUrl)}`;

      return reply.redirect(callbackUrl.toString());
    } catch (error: unknown) {
      fastify.log.error({ err: error }, 'Google OAuth error');

      // Redirect to login with error
      const frontendOrigin = config.corsOrigin[0] || 'http://localhost:3001';
      const errorUrl = new URL('/login', frontendOrigin);
      errorUrl.searchParams.set('error', 'oauth_failed');
      return reply.redirect(errorUrl.toString());
    }
  });

  // GET /api/v1/auth/google/url - Get OAuth URL for frontend redirect
  fastify.get('/api/v1/auth/google/url', async (request, reply) => {
    // Check if OAuth is configured
    if (!config.google.clientId || !config.google.clientSecret) {
      const response: ApiResponse = {
        error: {
          code: 'OAUTH_NOT_CONFIGURED',
          message: 'Google OAuth is not configured',
        },
      };
      return reply.status(503).send(response);
    }

    const query = request.query as { redirect_url?: string };
    const redirectUrl = query.redirect_url || '/';

    // Create state with redirect URL and timestamp for security
    const state = Buffer.from(
      JSON.stringify({
        redirectUrl,
        timestamp: Date.now(),
      })
    ).toString('base64');

    // Build Google OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', config.google.clientId);
    authUrl.searchParams.set('redirect_uri', config.google.callbackUrl);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    const response: ApiResponse = {
      data: { url: authUrl.toString() },
    };

    return reply.send(response);
  });
}
