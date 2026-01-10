# Vercel Deployment Guide

Deploy the Lottery and Quiz app frontends to Vercel.

## Prerequisites

- [Vercel account](https://vercel.com/)
- GitHub repository with the platform code
- Platform backend deployed (see [Railway setup](./railway-setup.md))

## Architecture Overview

```
                    ┌─────────────────┐
                    │    Vercel       │
                    │  ┌───────────┐  │
Users ──────────────┤  │  Lottery  │  │
                    │  │  App      │  │
                    │  └─────┬─────┘  │
                    │        │        │
                    │  ┌─────┴─────┐  │
                    │  │   Quiz    │  │
                    │  │   App     │  │
                    │  └─────┬─────┘  │
                    └────────┼────────┘
                             │ API calls
                             ▼
                    ┌─────────────────┐
                    │    Railway      │
                    │   Platform      │
                    │   Backend       │
                    └─────────────────┘
```

## Deploy Lottery App

### Step 1: Create Vercel Project

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Vite
   - **Root Directory**: `apps/lottery`
   - **Build Command**: `pnpm build`
   - **Output Directory**: `dist`

### Step 2: Set Environment Variables

In Vercel dashboard → Settings → Environment Variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_PLATFORM_URL` | `https://your-railway-app.railway.app` | Production |
| `VITE_PLATFORM_URL` | `http://localhost:3000` | Preview/Development |

### Step 3: Configure Build Settings

Create `apps/lottery/vercel.json`:

```json
{
  "buildCommand": "cd ../.. && pnpm install && pnpm --filter @event-platform/lottery build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

The rewrite rule enables client-side routing (React Router).

### Step 4: Deploy

1. Push changes to GitHub
2. Vercel automatically deploys
3. Get deployment URL: `https://lottery-xxx.vercel.app`

### Step 5: Add Custom Domain (Optional)

1. In Vercel dashboard → Settings → Domains
2. Add domain: `lottery.yourdomain.com`
3. Configure DNS per Vercel instructions

## Deploy Quiz App

Repeat the same process for the Quiz app:

### Step 1: Create Another Vercel Project

1. **Add New** → **Project**
2. Import the same repository
3. Configure:
   - **Root Directory**: `apps/quiz`
   - **Build Command**: `pnpm build`
   - **Output Directory**: `dist`

### Step 2: Set Environment Variables

| Variable | Value |
|----------|-------|
| `VITE_PLATFORM_URL` | `https://your-railway-app.railway.app` |

### Step 3: Create vercel.json

Create `apps/quiz/vercel.json`:

```json
{
  "buildCommand": "cd ../.. && pnpm install && pnpm --filter @event-platform/quiz build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Step 4: Deploy and Configure Domain

- Deployment URL: `https://quiz-xxx.vercel.app`
- Optional domain: `quiz.yourdomain.com`

## Update Platform CORS

After deploying both apps, update the platform's CORS settings:

### Railway Environment Variables

Update `CORS_ORIGIN` in Railway:

```
CORS_ORIGIN=https://lottery-xxx.vercel.app,https://quiz-xxx.vercel.app
```

Or with custom domains:

```
CORS_ORIGIN=https://lottery.yourdomain.com,https://quiz.yourdomain.com
```

## Monorepo Considerations

### pnpm in Vercel

Vercel auto-detects pnpm via `pnpm-lock.yaml`. Ensure root `package.json` has:

```json
{
  "packageManager": "pnpm@8.15.0"
}
```

### Workspace Dependencies

The apps depend on `@event-platform/sdk`. Vercel builds from root, so dependencies resolve correctly.

If builds fail:
1. Check `pnpm-workspace.yaml` exists
2. Verify SDK is listed in workspace

### Build Caching

Vercel caches node_modules. To clear cache:
1. Dashboard → Settings → General
2. Scroll to "Build Cache"
3. Click "Purge Everything"

## Verify Deployment

### Test Lottery App

```bash
# Open in browser
open https://lottery-xxx.vercel.app

# Check it connects to backend
# 1. Open DevTools → Network
# 2. Login should call your Railway backend
```

### Test Quiz App

```bash
open https://quiz-xxx.vercel.app
```

### Common Verification Steps

1. **Login works**: Credentials authenticate against Railway backend
2. **WebSocket connects**: Real-time updates function
3. **API calls succeed**: No CORS errors in console
4. **Routing works**: Direct URL access loads correctly

## Troubleshooting

### CORS Errors

```
Access-Control-Allow-Origin header missing
```

Fix: Add Vercel domain to `CORS_ORIGIN` in Railway

### API Calls to Wrong URL

Check `VITE_PLATFORM_URL` is set correctly in Vercel environment variables.

### Build Fails with "Module Not Found"

```bash
# Ensure workspace dependencies are built
pnpm --filter @event-platform/sdk build
```

Add prebuild script to app's package.json:
```json
{
  "scripts": {
    "prebuild": "pnpm --filter @event-platform/sdk build"
  }
}
```

### WebSocket Connection Fails

1. Check Railway URL is HTTPS
2. Verify Socket.io client uses correct URL
3. Check browser console for connection errors

### 404 on Page Refresh

Missing rewrite rule. Add `vercel.json` with rewrites (see Step 3).

## Preview Deployments

Vercel creates preview deployments for pull requests:

1. Each PR gets unique URL
2. Uses Preview environment variables
3. Useful for testing before merge

Configure preview-specific `VITE_PLATFORM_URL` for staging backend.

## Environment Variable Reference

See [environment-variables.md](./environment-variables.md) for complete reference.

## Next Steps

- [Update platform CORS for production](./railway-setup.md#step-4-set-environment-variables)
- [Production checklist](./production-checklist.md)
- [Set up Google OAuth](../api/google-oauth-setup.md)
