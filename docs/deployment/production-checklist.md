# Production Checklist

Complete this checklist before and after deploying to production.

## Pre-Deployment

### Code Quality

- [ ] All tests pass (`pnpm test:e2e`)
- [ ] Type check passes (`pnpm type-check`)
- [ ] No console.log statements in production code
- [ ] No hardcoded URLs (use environment variables)
- [ ] No TODO comments blocking release

### Security

- [ ] JWT_SECRET is cryptographically random (32+ chars)
- [ ] No secrets in git history
- [ ] `.env` files in `.gitignore`
- [ ] CORS_ORIGIN only includes trusted domains
- [ ] Rate limiting configured
- [ ] Input validation on all endpoints
- [ ] SQL injection prevented (Prisma ORM only)
- [ ] XSS prevention (React escapes by default)

### Database

- [ ] Production database created
- [ ] Database connection string secured
- [ ] Migrations tested on staging first
- [ ] Database backup strategy defined
- [ ] Connection pooling configured (if needed)

### Authentication

- [ ] Google OAuth credentials created for production
- [ ] OAuth callback URLs updated
- [ ] Token expiration appropriate for use case
- [ ] Logout properly invalidates sessions

## Deployment Steps

### 1. Platform Backend (Railway)

- [ ] PostgreSQL database added
- [ ] Environment variables configured:
  - [ ] `DATABASE_URL` (auto-set)
  - [ ] `JWT_SECRET` (generated)
  - [ ] `NODE_ENV=production`
  - [ ] `HOST=0.0.0.0`
  - [ ] `CORS_ORIGIN` (frontend URLs)
  - [ ] `GOOGLE_CLIENT_ID`
  - [ ] `GOOGLE_CLIENT_SECRET`
  - [ ] `GOOGLE_CALLBACK_URL`
- [ ] Build succeeds
- [ ] Migrations run successfully
- [ ] Health endpoint responds

### 2. Frontend Apps (Vercel)

- [ ] Lottery app deployed
  - [ ] `VITE_PLATFORM_URL` set to Railway URL
  - [ ] Build succeeds
  - [ ] Routes work (SPA rewrites configured)
- [ ] Quiz app deployed
  - [ ] `VITE_PLATFORM_URL` set to Railway URL
  - [ ] Build succeeds
  - [ ] Routes work

### 3. Cross-Service Configuration

- [ ] CORS updated with Vercel domains
- [ ] WebSocket connections work
- [ ] API calls succeed (no CORS errors)

## Post-Deployment Verification

### Functional Tests

- [ ] **Authentication**
  - [ ] Login works
  - [ ] Logout works
  - [ ] Token persists across page refresh
  - [ ] Expired token redirects to login

- [ ] **Lottery App**
  - [ ] Create room works
  - [ ] Join room works
  - [ ] Prize management works
  - [ ] Winner draw works
  - [ ] Real-time updates work

- [ ] **Quiz App**
  - [ ] Create quiz works
  - [ ] Add questions works
  - [ ] Start quiz works
  - [ ] Participants see questions
  - [ ] Answer submission works
  - [ ] Leaderboard updates

### Performance

- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms
- [ ] WebSocket connection stable
- [ ] No memory leaks (monitor over time)

### Monitoring

- [ ] Error tracking configured (Sentry, etc.)
- [ ] Uptime monitoring configured
- [ ] Log aggregation available
- [ ] Alert thresholds defined

## Domains & SSL

### Custom Domains (Optional)

- [ ] DNS configured for API domain
- [ ] DNS configured for app domains
- [ ] SSL certificates active (automatic with Railway/Vercel)
- [ ] HTTP redirects to HTTPS

### Domain Mapping

| Service | Domain |
|---------|--------|
| Platform API | `api.yourdomain.com` |
| Lottery App | `lottery.yourdomain.com` |
| Quiz App | `quiz.yourdomain.com` |

## Backup & Recovery

### Database Backups

- [ ] Automatic backups enabled
- [ ] Backup retention period set
- [ ] Backup restoration tested
- [ ] Point-in-time recovery available (if needed)

### Disaster Recovery

- [ ] Rollback procedure documented
- [ ] Previous deployment retained
- [ ] Database restore procedure tested

## Scaling Considerations

### Current Capacity

For MVP:
- Railway: Suitable for moderate traffic
- Vercel: CDN handles frontend scaling
- PostgreSQL: Single instance sufficient

### Future Scaling

When needed:
- [ ] Horizontal scaling for API (multiple Railway instances)
- [ ] Connection pooling (PgBouncer)
- [ ] Redis for session/cache
- [ ] CDN for static assets

## Maintenance

### Regular Tasks

| Task | Frequency |
|------|-----------|
| Review error logs | Daily |
| Check database size | Weekly |
| Update dependencies | Monthly |
| Rotate secrets | Quarterly |
| Review access logs | Monthly |

### Dependency Updates

```bash
# Check for updates
pnpm outdated

# Update dependencies
pnpm update

# Run tests after update
pnpm test:e2e
pnpm type-check
```

## Incident Response

### Common Issues

| Issue | Action |
|-------|--------|
| API down | Check Railway logs, restart if needed |
| Database connection failed | Verify DATABASE_URL, check PostgreSQL status |
| CORS errors | Update CORS_ORIGIN, redeploy |
| Auth not working | Verify JWT_SECRET, check Google OAuth settings |
| WebSocket disconnects | Check Railway logs, verify CORS |

### Rollback Procedure

**Railway:**
1. Go to Deployments
2. Find last working deployment
3. Click "Redeploy"

**Vercel:**
1. Go to Deployments
2. Find last working deployment
3. Click "..." → "Promote to Production"

## Security Hardening

### Additional Measures (Post-MVP)

- [ ] WAF (Web Application Firewall)
- [ ] DDoS protection
- [ ] API key rotation automation
- [ ] Security audit
- [ ] Penetration testing
- [ ] GDPR compliance review

### Rate Limiting Configuration

Current defaults (platform/src/config):
- Users: 100 requests/minute
- Applications: 1000 requests/minute
- Unauthenticated: 20 requests/minute

Adjust in production if needed.

## Documentation

- [ ] API documentation up to date
- [ ] Deployment guide complete
- [ ] Runbook for operations
- [ ] Architecture diagram current

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| Reviewer | | | |

---

## Quick Pre-Launch Checklist

Essential items only:

```
[ ] Tests pass
[ ] Type check passes
[ ] JWT_SECRET generated and set
[ ] CORS_ORIGIN includes frontend URLs
[ ] Google OAuth configured (if using)
[ ] Database migrations applied
[ ] Health endpoint responds
[ ] Login works
[ ] Core features work
[ ] No console errors
```
