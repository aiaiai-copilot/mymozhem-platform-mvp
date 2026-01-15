# Handoff: Google OAuth Implementation

**Date:** January 15, 2026
**Session Focus:** Implementing Google OAuth authentication

## What Was Done

### 1. Backend OAuth Implementation

**Files Modified:**
- `platform/src/index.ts` - Registered `@fastify/oauth2` plugin with Google configuration
- `platform/src/routes/auth.ts` - Added two new endpoints:
  - `GET /api/v1/auth/google/url` - Returns Google OAuth URL for frontend redirect
  - `GET /api/v1/auth/google/callback` - Handles OAuth callback, creates/finds user, issues JWT

**Key Features:**
- Uses `@fastify/oauth2` plugin (already in dependencies)
- State parameter with timestamp for replay attack prevention
- Finds existing users by email or creates new ones
- Links existing email accounts to Google on first OAuth login
- Redirects to frontend with tokens in URL fragment (security best practice)

### 2. SDK Updates

**Files Modified:**
- `packages/platform-sdk/src/types/auth.ts` - Added `GoogleAuthUrlResponse`, `OAuthCallbackTokens` types
- `packages/platform-sdk/src/client/auth.ts` - Added:
  - `getGoogleAuthUrl(redirectUrl?)` - Fetches OAuth URL from backend
  - `parseOAuthCallback(fragment)` - Parses tokens from URL fragment

### 3. Frontend Implementation (Both Apps)

**New Files:**
- `apps/lottery/src/components/GoogleLoginButton.tsx` - Google login button with loading state
- `apps/lottery/src/pages/AuthCallbackPage.tsx` - Handles OAuth callback, stores tokens
- `apps/quiz/src/components/GoogleLoginButton.tsx` - Same (purple theme)
- `apps/quiz/src/pages/AuthCallbackPage.tsx` - Same

**Modified Files:**
- `apps/lottery/src/components/LoginForm.tsx` - Added Google button + divider
- `apps/lottery/src/App.tsx` - Added `/auth/callback` route
- `apps/quiz/src/components/LoginForm.tsx` - Same
- `apps/quiz/src/App.tsx` - Same

### 4. Tests Added (16 total, all passing)

**Platform API Tests (`platform/tests/auth.spec.ts`):**
- 2.1: Get Google OAuth URL - Returns Valid URL
- 2.2: Get Google OAuth URL - With Redirect URL Parameter
- 2.3: Google OAuth Callback - Without Code Returns Error

**Lottery App Tests (`apps/lottery/tests/auth.spec.ts`):**
- 2.1: Google Login Button Visible on Login Page
- 2.2: Google Login Button Is Clickable
- 2.3: OAuth Error Parameter Shows Error Message
- 2.4: Auth Callback Page - Shows Loading While Processing
- 2.5: Auth Callback Page - Processes Token Fragment
- 2.6: Login Page Preserves Redirect After OAuth Error
- 2.7: Divider Between OAuth and Email Login

**Quiz App Tests (`apps/quiz/tests/auth.spec.ts`):**
- 2.1-2.6: Same coverage as lottery app

### 5. Infrastructure

**New File:**
- `docker-compose.yml` - PostgreSQL for local development

## Current State

- **Type checking:** All passing
- **OAuth tests:** 16/16 passing
- **Email/password login:** Still works (kept for development/testing)

## To Enable Google OAuth in Production

Set these environment variables:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=https://your-domain.com/api/v1/auth/google/callback
```

Get credentials from [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
1. Create OAuth 2.0 Client ID
2. Add authorized redirect URI: `https://your-domain.com/api/v1/auth/google/callback`
3. Configure OAuth consent screen

## OAuth Flow

```
1. User clicks "Continue with Google"
2. Frontend calls GET /api/v1/auth/google/url
3. Backend returns Google OAuth URL with state parameter
4. Frontend redirects to Google
5. User authenticates with Google
6. Google redirects to /api/v1/auth/google/callback
7. Backend exchanges code for Google token
8. Backend fetches user info from Google
9. Backend creates/finds user in database
10. Backend generates platform JWT tokens
11. Backend redirects to /auth/callback#access_token=...
12. Frontend parses tokens from URL fragment
13. Frontend stores tokens in localStorage
14. Frontend connects WebSocket with token
15. Frontend redirects to intended page
```

## What's Left for MVP

Per the initial exploration, the MVP is now essentially complete:
- ✅ Platform backend with REST API + WebSocket
- ✅ Lottery app (async mechanics)
- ✅ Quiz app (sync real-time)
- ✅ Google OAuth authentication
- 🔲 Production deployment (Railway + Vercel)

## Running Tests

```bash
# Start PostgreSQL
docker start event-platform-db

# Or create new container
docker run -d --name event-platform-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=devpassword \
  -e POSTGRES_DB=event_platform \
  -p 5432:5432 postgres:16

# Start servers (3 terminals)
cd platform && pnpm dev
pnpm --filter @event-platform/lottery dev
pnpm --filter @event-platform/quiz dev

# Run OAuth tests only
pnpm playwright test --grep "Google OAuth"

# Run all tests
pnpm test:e2e
```

## Notes

- PowerShell on Windows mangles `-e VAR=value` syntax. Use Git Bash or `--env VAR=value` format.
- Docker requires elevated privileges on Windows (Run as Administrator or use Docker Desktop terminal).
