# Environment Variables Reference

Complete reference for all environment variables used in the Event Platform.

## Platform Backend

Location: `platform/.env`

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/dbname` |
| `JWT_SECRET` | Secret key for JWT signing (min 32 chars) | `openssl rand -base64 32` |
| `HOST` | Server bind address | `0.0.0.0` |
| `CORS_ORIGIN` | Comma-separated allowed origins | `https://app1.com,https://app2.com` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |
| `JWT_EXPIRES_IN` | Token expiration time | `1h` |
| `WS_PORT` | WebSocket port (if separate) | `3001` |

### OAuth Variables (for Google Auth)

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | For OAuth |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | For OAuth |
| `GOOGLE_CALLBACK_URL` | OAuth callback URL | For OAuth |

## Frontend Apps (Lottery & Quiz)

Location: `apps/lottery/.env` and `apps/quiz/.env`

### Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_PLATFORM_URL` | Platform backend URL | `http://localhost:3000` |

Note: Vite requires `VITE_` prefix for client-side variables.

---

## Development Configuration

### platform/.env (Development)

```bash
# Database
DATABASE_URL="postgresql://postgres:devpassword@localhost:5432/event_platform?schema=public"

# JWT Authentication
JWT_SECRET="dev-secret-key-change-in-production-please"
JWT_EXPIRES_IN="1h"

# Server Configuration
PORT=3000
HOST="0.0.0.0"
NODE_ENV="development"

# CORS - Include all local dev ports
CORS_ORIGIN="http://localhost:5173,http://localhost:5174"

# WebSocket
WS_PORT=3001

# OAuth (optional for dev - use password auth)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:3000/api/v1/auth/google/callback"
```

### Apps (Development)

No `.env` needed - apps use default `http://localhost:3000` via Vite proxy.

---

## Production Configuration

### Railway (Platform Backend)

Set these in Railway dashboard → Variables:

```bash
# Database (auto-set by Railway PostgreSQL)
DATABASE_URL="postgresql://postgres:xxx@xxx.railway.app:5432/railway"

# JWT - GENERATE A STRONG SECRET
JWT_SECRET="<run: openssl rand -base64 32>"
JWT_EXPIRES_IN="24h"

# Server
PORT=3000
HOST="0.0.0.0"
NODE_ENV="production"

# CORS - Your Vercel domains
CORS_ORIGIN="https://lottery.yourdomain.com,https://quiz.yourdomain.com"

# OAuth
GOOGLE_CLIENT_ID="<from Google Cloud Console>"
GOOGLE_CLIENT_SECRET="<from Google Cloud Console>"
GOOGLE_CALLBACK_URL="https://api.yourdomain.com/api/v1/auth/google/callback"
```

### Vercel (Lottery App)

Set in Vercel dashboard → Settings → Environment Variables:

```bash
VITE_PLATFORM_URL="https://api.yourdomain.com"
```

### Vercel (Quiz App)

```bash
VITE_PLATFORM_URL="https://api.yourdomain.com"
```

---

## Variable Details

### DATABASE_URL

PostgreSQL connection string format:

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=SCHEMA
```

| Component | Description |
|-----------|-------------|
| `USER` | Database username |
| `PASSWORD` | Database password (URL-encode special chars) |
| `HOST` | Database server hostname |
| `PORT` | Database port (default: 5432) |
| `DATABASE` | Database name |
| `schema` | Prisma schema name (default: public) |

**Railway format:**
```
postgresql://postgres:PASSWORD@containers-xxx.railway.app:PORT/railway
```

**URL-encode special characters in password:**
```bash
# If password is "p@ss!word"
# Encode as "p%40ss%21word"
```

### JWT_SECRET

Used to sign JWT tokens. Must be:
- At least 32 characters
- Random and unpredictable
- Different per environment
- Never committed to git

**Generate:**
```bash
# Mac/Linux
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### JWT_EXPIRES_IN

Token lifetime. Formats:
- `1h` - 1 hour
- `24h` - 24 hours
- `7d` - 7 days
- `30m` - 30 minutes

Production recommendation: `24h`

### CORS_ORIGIN

Comma-separated list of allowed origins for CORS.

```bash
# Single origin
CORS_ORIGIN="https://app.example.com"

# Multiple origins
CORS_ORIGIN="https://lottery.example.com,https://quiz.example.com"
```

**Important:**
- Include protocol (`https://`)
- No trailing slash
- No spaces after commas
- Must match exactly what browser sends

### NODE_ENV

| Value | Behavior |
|-------|----------|
| `development` | Verbose logging, stack traces |
| `test` | Test database, mock data |
| `production` | Minimal logging, optimized |

### GOOGLE_CALLBACK_URL

Must match exactly in:
1. Google Cloud Console → OAuth credentials
2. This environment variable

Format: `https://your-backend.com/api/v1/auth/google/callback`

---

## Security Guidelines

### Never Commit Secrets

Add to `.gitignore`:
```
.env
.env.local
.env.production
```

### Use Different Values Per Environment

| Environment | JWT_SECRET | DATABASE_URL |
|-------------|------------|--------------|
| Development | `dev-secret-...` | localhost |
| Staging | `staging-secret-...` | staging DB |
| Production | `prod-secret-...` | production DB |

### Rotate Secrets Regularly

1. Generate new secret
2. Update in platform (Railway)
3. Restart services
4. Old tokens invalidate (users re-login)

### Validate Required Variables

The platform validates on startup. Missing required variables cause startup failure with clear error message.

---

## Testing Configuration

For running E2E tests:

### platform/.env (Test Mode)

```bash
DATABASE_URL="postgresql://postgres:devpassword@localhost:5432/event_platform_test?schema=public"
NODE_ENV="test"
JWT_SECRET="test-secret-key"
CORS_ORIGIN="http://localhost:5173,http://localhost:5174"
```

### Test Helper Config

Located at `tests/helpers/config.ts`:

```typescript
export const TEST_CONFIG = {
  apiUrl: 'http://localhost:3000',
  lotteryUrl: 'http://localhost:5173',
  quizUrl: 'http://localhost:5174',
};
```

---

## Quick Reference

### Minimum Production Setup

**Railway:**
```bash
DATABASE_URL=<auto>
JWT_SECRET=<generate>
HOST=0.0.0.0
NODE_ENV=production
CORS_ORIGIN=<vercel-urls>
```

**Vercel (each app):**
```bash
VITE_PLATFORM_URL=<railway-url>
```

### Troubleshooting

| Issue | Check |
|-------|-------|
| CORS errors | `CORS_ORIGIN` includes frontend URL |
| Auth fails | `JWT_SECRET` same across restarts |
| DB connection fails | `DATABASE_URL` format and credentials |
| OAuth redirect fails | `GOOGLE_CALLBACK_URL` matches Google Console |
| WebSocket fails | `CORS_ORIGIN` includes frontend URL |
