# Deployment Documentation

Guides for deploying the Event Platform to production.

## Architecture

```
                         ┌─────────────────────────────────┐
                         │           Internet              │
                         └─────────────┬───────────────────┘
                                       │
          ┌────────────────────────────┼────────────────────────────┐
          │                            │                            │
          ▼                            ▼                            ▼
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│     Vercel      │         │     Vercel      │         │    Railway      │
│  ┌───────────┐  │         │  ┌───────────┐  │         │  ┌───────────┐  │
│  │  Lottery  │  │         │  │   Quiz    │  │         │  │ Platform  │  │
│  │    App    │  │         │  │    App    │  │         │  │  Backend  │  │
│  └─────┬─────┘  │         │  └─────┬─────┘  │         │  └─────┬─────┘  │
└────────┼────────┘         └────────┼────────┘         └────────┼────────┘
         │                           │                           │
         │         REST API + WebSocket                          │
         └───────────────────────────┴───────────────────────────┘
                                     │
                                     ▼
                         ┌─────────────────────┐
                         │      Railway        │
                         │    PostgreSQL       │
                         └─────────────────────┘
```

## Guides

| Guide | Description |
|-------|-------------|
| [Railway Setup](./railway-setup.md) | Deploy platform backend to Railway |
| [Vercel Setup](./vercel-setup.md) | Deploy frontend apps to Vercel |
| [Environment Variables](./environment-variables.md) | Complete variable reference |
| [Production Checklist](./production-checklist.md) | Pre-launch verification |

## Quick Start

### 1. Deploy Backend (Railway)

```bash
# 1. Create Railway project
# 2. Add PostgreSQL database
# 3. Set environment variables (see environment-variables.md)
# 4. Deploy via GitHub integration
```

### 2. Deploy Frontends (Vercel)

```bash
# For each app (lottery, quiz):
# 1. Create Vercel project
# 2. Set root directory to apps/lottery or apps/quiz
# 3. Set VITE_PLATFORM_URL to Railway URL
# 4. Deploy
```

### 3. Update CORS

Add Vercel URLs to Railway's `CORS_ORIGIN`:
```
CORS_ORIGIN=https://lottery-xxx.vercel.app,https://quiz-xxx.vercel.app
```

### 4. Verify

- [ ] Health endpoint: `curl https://your-railway-app.railway.app/health`
- [ ] Login works on both apps
- [ ] Real-time features work

## Costs

### Railway (Free Tier)

- $5/month credit
- Suitable for development/small production
- PostgreSQL included

### Vercel (Free Tier)

- Unlimited static deployments
- 100GB bandwidth/month
- Suitable for production

### Production Estimates

| Service | Tier | Cost |
|---------|------|------|
| Railway | Starter | ~$5-20/month |
| Vercel | Pro (if needed) | $20/month |
| Domain | Standard | ~$12/year |

## Support

- [Railway Documentation](https://docs.railway.app/)
- [Vercel Documentation](https://vercel.com/docs)
- [Platform API Documentation](../api/README.md)
