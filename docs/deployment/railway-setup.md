# Railway Deployment Guide

Deploy the Event Platform backend to Railway.

## Prerequisites

- [Railway account](https://railway.app/)
- GitHub repository with the platform code
- PostgreSQL database (Railway provides this)

## Step 1: Create Railway Project

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Connect your GitHub account and select the repository

## Step 2: Add PostgreSQL Database

1. In your project, click **New** → **Database** → **PostgreSQL**
2. Railway automatically creates `DATABASE_URL` environment variable
3. Note: Railway's PostgreSQL uses the format:
   ```
   postgresql://postgres:PASSWORD@HOST:PORT/railway
   ```

## Step 3: Configure Build Settings

Railway auto-detects the monorepo. Configure for the platform:

### Option A: Railway.json (Recommended)

Create `railway.json` in repository root:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd platform && pnpm install && pnpm prisma generate && pnpm build"
  },
  "deploy": {
    "startCommand": "cd platform && pnpm prisma migrate deploy && pnpm start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

### Option B: Manual Configuration

In Railway dashboard → Settings:

- **Root Directory**: `platform`
- **Build Command**: `pnpm install && pnpm prisma generate && pnpm build`
- **Start Command**: `pnpm prisma migrate deploy && pnpm start`

## Step 4: Set Environment Variables

In Railway dashboard → Variables, add:

| Variable | Value | Required |
|----------|-------|----------|
| `DATABASE_URL` | (auto-set by Railway PostgreSQL) | Yes |
| `JWT_SECRET` | Generate: `openssl rand -base64 32` | Yes |
| `JWT_EXPIRES_IN` | `24h` | Yes |
| `NODE_ENV` | `production` | Yes |
| `PORT` | `3000` (Railway overrides with `$PORT`) | No |
| `HOST` | `0.0.0.0` | Yes |
| `CORS_ORIGIN` | `https://lottery.yourdomain.com,https://quiz.yourdomain.com` | Yes |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console | For OAuth |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console | For OAuth |
| `GOOGLE_CALLBACK_URL` | `https://your-railway-app.railway.app/api/auth/google/callback` | For OAuth |

### Generate JWT Secret

```bash
# On Mac/Linux
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

## Step 5: Add Health Check Endpoint

Add to `platform/src/routes/health.ts`:

```typescript
import { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
};
```

Register in `platform/src/index.ts`:

```typescript
import { healthRoutes } from './routes/health';
// ...
await app.register(healthRoutes);
```

## Step 6: Deploy

1. Push changes to GitHub
2. Railway automatically deploys on push
3. Monitor deployment in Railway dashboard → Deployments

## Step 7: Run Database Migrations

Migrations run automatically via start command. For manual execution:

```bash
# Railway CLI
railway run pnpm --filter @event-platform/platform prisma migrate deploy
```

## Step 8: Seed Initial Data (Optional)

```bash
# Via Railway CLI
railway run pnpm --filter @event-platform/platform db:seed
```

## Verify Deployment

1. Check Railway logs for startup confirmation
2. Test health endpoint:
   ```bash
   curl https://your-app.railway.app/health
   ```
3. Test API:
   ```bash
   curl https://your-app.railway.app/api/v1/apps
   ```

## Custom Domain (Optional)

1. In Railway dashboard → Settings → Domains
2. Add custom domain (e.g., `api.yourdomain.com`)
3. Configure DNS:
   - Add CNAME record pointing to Railway's domain
   - Wait for SSL certificate provisioning

## Troubleshooting

### Build Fails

```bash
# Check Railway build logs
railway logs --build
```

Common issues:
- Missing pnpm: Railway uses npm by default
- Add `packageManager` to root `package.json`:
  ```json
  "packageManager": "pnpm@8.15.0"
  ```

### Database Connection Fails

- Verify `DATABASE_URL` is set correctly
- Check PostgreSQL service is running
- Ensure Prisma schema matches database

### WebSocket Issues

Railway supports WebSockets. Ensure:
- `HOST` is set to `0.0.0.0`
- CORS allows your frontend domains
- Socket.io client connects to Railway URL

## Environment Variable Reference

See [environment-variables.md](./environment-variables.md) for complete reference.

## Next Steps

- [Deploy frontends to Vercel](./vercel-setup.md)
- [Production checklist](./production-checklist.md)
