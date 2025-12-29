# Billing System - Quick Start Guide

## Overview

The platform now has a complete billing and subscription system with:
- 3 tiers: Free, Pro, Enterprise
- Stripe integration
- Trial periods
- Usage tracking
- Payment history
- Invoice generation

## For Developers

### Check if User Can Create Room

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function canCreateRoom(userId: string): Promise<boolean> {
  // Get active subscription
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: userId,
      status: 'ACTIVE',
      deletedAt: null,
    },
    include: { plan: true },
  });

  if (!subscription) return false;

  const features = subscription.plan.features as any;
  const maxRooms = features.maxRooms;

  // -1 means unlimited
  if (maxRooms === -1) return true;

  // Count user's rooms
  const roomCount = await prisma.room.count({
    where: {
      createdBy: userId,
      deletedAt: null,
    },
  });

  return roomCount < maxRooms;
}

// Usage
if (!(await canCreateRoom(userId))) {
  throw new Error('Room limit reached. Please upgrade your plan.');
}
```

### Check Feature Access

```typescript
async function hasFeature(userId: string, featureName: string): Promise<boolean> {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: userId,
      status: 'ACTIVE',
      deletedAt: null,
    },
    include: { plan: true },
  });

  if (!subscription) return false;

  const features = subscription.plan.features as any;
  return features.features?.includes(featureName) || false;
}

// Usage
if (!(await hasFeature(userId, 'custom_branding'))) {
  throw new Error('This feature requires Pro plan');
}
```

### Track Usage

```typescript
// After creating a room
await prisma.usageRecord.create({
  data: {
    subscriptionId: subscription.id,
    userId: userId,
    metricName: 'rooms_created',
    quantity: 1,
    metadata: {
      roomId: room.id,
      appId: room.appId,
    },
  },
});
```

## For Product Managers

### Subscription Tiers

| Tier | Price | Rooms | Participants | Features |
|------|-------|-------|--------------|----------|
| **Free** | $0/mo | 3 | 50/room | Basic analytics, Community support |
| **Pro** | $29.99/mo | 50 | 500/room | Advanced analytics, Priority support, Custom branding |
| **Enterprise** | $999/yr | Unlimited | Unlimited | All Pro features, Dedicated support, SLA 99.9% |

### Feature Flags

Features are stored in JSON in `subscription_plans.features`:

```json
{
  "maxRooms": 50,
  "maxParticipantsPerRoom": 500,
  "maxPrizesPerRoom": 100,
  "apps": ["app_lottery_v1", "app_quiz_v1"],
  "features": [
    "advanced_analytics",
    "priority_support",
    "custom_branding",
    "export_data"
  ],
  "trialDays": 14
}
```

To add a new feature:
1. Add feature name to relevant plans
2. Check feature in code with `hasFeature(userId, 'feature_name')`

### Subscription Lifecycle

```
New User → Free Plan (ACTIVE)
         ↓
         Pro Trial (TRIALING, 14 days)
         ↓
         Payment → Pro Plan (ACTIVE)
         ↓
         Cancel → Pro Plan (CANCELED, active until period end)
         ↓
         Expires → Free Plan (ACTIVE)
```

## For DevOps

### Daily Maintenance

Run `platform/scripts/subscription-maintenance.ts` daily at 2 AM:

```bash
0 2 * * * cd /app/platform && node dist/scripts/subscription-maintenance.js
```

This script:
- Expires trials that ended
- Expires canceled subscriptions
- Notifies users of trials ending soon

### Monitoring Queries

**Active subscriptions by tier:**
```sql
SELECT
  sp.tier,
  COUNT(*) as count
FROM subscriptions s
JOIN subscription_plans sp ON s."planId" = sp.id
WHERE s.status = 'ACTIVE' AND s."deletedAt" IS NULL
GROUP BY sp.tier;
```

**MRR (Monthly Recurring Revenue):**
```sql
SELECT
  SUM(sp.price) / 100.0 as mrr_usd
FROM subscriptions s
JOIN subscription_plans sp ON s."planId" = sp.id
WHERE s.status = 'ACTIVE'
  AND s."deletedAt" IS NULL
  AND sp."billingInterval" = 'MONTHLY';
```

**Payment failure rate (last 30 days):**
```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'failed') * 100.0 / COUNT(*) as failure_rate_pct
FROM payments
WHERE "createdAt" > NOW() - INTERVAL '30 days';
```

## For Finance

### Revenue Reports

**Total Revenue (All Time):**
```typescript
const totalRevenue = await prisma.payment.aggregate({
  where: {
    status: 'succeeded',
    deletedAt: null,
  },
  _sum: {
    amount: true,
  },
});

console.log(`Total Revenue: $${totalRevenue._sum.amount / 100}`);
```

**Revenue by Month:**
```typescript
const startOfMonth = new Date('2025-01-01');
const endOfMonth = new Date('2025-01-31');

const monthRevenue = await prisma.payment.aggregate({
  where: {
    status: 'succeeded',
    createdAt: {
      gte: startOfMonth,
      lte: endOfMonth,
    },
  },
  _sum: {
    amount: true,
  },
});
```

### Invoice Generation

Invoices are created automatically when payments succeed:

```typescript
// Create invoice
const invoice = await prisma.invoice.create({
  data: {
    subscriptionId: subscription.id,
    userId: user.id,
    invoiceNumber: `INV-${year}-${nextNumber}`,
    amount: 2999,
    currency: 'USD',
    status: 'paid',
    issuedAt: new Date(),
    dueAt: new Date(),
    paidAt: new Date(),
    stripeInvoiceId: 'in_xxx',
    lineItems: [
      {
        description: 'Pro Plan - January 2025',
        quantity: 1,
        unitPrice: 2999,
        total: 2999,
      },
    ],
  },
});
```

## For Customer Support

### Check User's Subscription

```typescript
const subscription = await prisma.subscription.findFirst({
  where: {
    userId: userId,
    status: 'ACTIVE',
  },
  include: {
    plan: true,
    payments: {
      orderBy: { createdAt: 'desc' },
      take: 5,
    },
  },
});

console.log(`Plan: ${subscription.plan.name}`);
console.log(`Status: ${subscription.status}`);
console.log(`Period: ${subscription.currentPeriodStart} to ${subscription.currentPeriodEnd}`);
console.log(`Recent Payments:`, subscription.payments);
```

### Cancel Subscription

```typescript
await prisma.subscription.update({
  where: { id: subscription.id },
  data: {
    cancelAtPeriodEnd: true,
    canceledAt: new Date(),
    cancelReason: 'Customer requested',
    status: 'CANCELED',
  },
});
```

### Extend Trial

```typescript
const newTrialEnd = new Date(Date.now() + 7 * 24 * 3600 * 1000); // +7 days

await prisma.subscription.update({
  where: { id: subscription.id },
  data: {
    trialEnd: newTrialEnd,
  },
});
```

## Stripe Integration

### Webhook Events to Handle

| Event | Action |
|-------|--------|
| `customer.subscription.created` | Create subscription in DB |
| `customer.subscription.updated` | Update subscription status |
| `customer.subscription.deleted` | Mark subscription as expired |
| `invoice.paid` | Create payment record |
| `invoice.payment_failed` | Update subscription to PAST_DUE |
| `customer.subscription.trial_will_end` | Send notification |

### Webhook Handler Example

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function handleStripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const event = stripe.webhooks.constructEvent(
    req.body,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET!
  );

  switch (event.type) {
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;
    // ... more handlers
  }

  res.json({ received: true });
}
```

## Common Tasks

### Upgrade User to Pro

```typescript
// 1. Get current subscription
const current = await prisma.subscription.findFirst({
  where: { userId, status: 'ACTIVE' },
});

// 2. Expire current subscription
await prisma.subscription.update({
  where: { id: current.id },
  data: {
    status: 'EXPIRED',
    deletedAt: new Date(),
  },
});

// 3. Create Pro subscription
const proPlan = await prisma.subscriptionPlan.findFirst({
  where: { tier: 'PRO', billingInterval: 'MONTHLY' },
});

await prisma.subscription.create({
  data: {
    userId: userId,
    planId: proPlan.id,
    status: 'ACTIVE',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    stripeCustomerId: current.stripeCustomerId,
    stripeSubscriptionId: 'sub_new_xxx',
  },
});
```

### Get Usage Analytics

```typescript
const usage = await prisma.usageRecord.groupBy({
  by: ['metricName'],
  where: {
    userId: userId,
    timestamp: {
      gte: startDate,
      lte: endDate,
    },
  },
  _sum: {
    quantity: true,
  },
});

// Result:
// [
//   { metricName: 'rooms_created', _sum: { quantity: 5 } },
//   { metricName: 'participants_added', _sum: { quantity: 42 } },
// ]
```

## Troubleshooting

### User Can't Create Room

1. Check active subscription exists
2. Check plan limits
3. Count existing rooms
4. Verify room hasn't soft-deleted

### Payment Failed

1. Check Stripe payment intent status
2. Update subscription to PAST_DUE
3. Notify user
4. Retry payment (Stripe handles this automatically)

### Trial Not Working

1. Verify `trialEnd` date is in future
2. Check subscription status is TRIALING
3. Verify plan has `trialDays` in features JSON

## Resources

- Full Documentation: `platform/prisma/BILLING_SUBSCRIPTION.md`
- Query Examples: `platform/prisma/QUERY_EXAMPLES.md` (Billing section)
- Migration Guide: `platform/prisma/MIGRATION_PLAN.md` (Billing section)
- Stripe Docs: https://stripe.com/docs/billing/subscriptions

## Support

For questions or issues:
1. Check logs in `platform/logs/`
2. Run Prisma Studio: `npx prisma studio`
3. Check Stripe Dashboard for payment details
4. Review subscription maintenance logs

---

**Quick Reference:**

- **Free Plan**: 3 rooms, 50 participants/room, $0
- **Pro Plan**: 50 rooms, 500 participants/room, $29.99/mo (14-day trial)
- **Enterprise**: Unlimited, $999/yr (30-day trial)
- **Stripe**: Full integration with webhooks
- **Usage Tracking**: All actions logged in `usage_records`
- **Maintenance**: Daily cron job handles expirations
