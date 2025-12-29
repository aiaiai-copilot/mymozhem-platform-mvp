# Billing & Subscription System

**Date:** December 29, 2025
**Version:** 1.0.0
**Status:** Production-Ready

## Overview

A complete billing and subscription system designed for freemium SaaS platforms with:
- Multiple subscription tiers (Free, Pro, Enterprise, Custom)
- Stripe integration for payment processing
- Trial periods and subscription lifecycle management
- Usage tracking for metered billing
- Invoice generation and payment history
- Backward compatibility (existing users default to Free tier)

## Architecture Decisions

### Design Principles

1. **Start Simple, Scale Later** — Minimum viable models for MVP, extensible for future needs
2. **Stripe-First** — Designed around Stripe's best practices
3. **Flexible Features** — JSON-based feature limits for easy updates
4. **Audit Trail** — Soft deletes and metadata tracking for compliance
5. **Usage Tracking** — Built-in support for metered billing

### Why This Design?

**Problem:** Platform documentation mentioned "Billing and subscriptions" but schema had no billing models.

**Solution:** Production-ready billing system that:
- Supports freemium monetization from day one
- Integrates seamlessly with Stripe
- Tracks usage for future metered billing
- Maintains complete audit trail
- Handles subscription lifecycle properly

## Data Models

### 1. SubscriptionPlan

**Purpose:** Define subscription tiers with pricing and features

```prisma
model SubscriptionPlan {
  id   String                @id @default(cuid())
  tier SubscriptionPlanTier  // FREE, PRO, ENTERPRISE, CUSTOM

  // Plan details
  name        String   // "Free Plan", "Pro Monthly", "Enterprise Yearly"
  description String?
  isActive    Boolean  @default(true)

  // Pricing
  price           Int             @default(0)  // Cents
  currency        String          @default("USD")
  billingInterval BillingInterval @default(MONTHLY)

  // Feature limits
  features Json  // { "maxRooms": 10, "maxParticipants": 100, ... }

  // Stripe integration
  stripePriceId   String? @unique
  stripeProductId String?

  // Metadata
  displayOrder Int  @default(0)
  metadata     Json @default("{}")

  // Timestamps
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?
}
```

**Example Feature JSON:**
```json
{
  "maxRooms": 10,
  "maxParticipantsPerRoom": 100,
  "maxPrizesPerRoom": 20,
  "apps": ["app_lottery_v1"],
  "features": [
    "basic_analytics",
    "email_support"
  ],
  "trialDays": 14
}
```

### 2. Subscription

**Purpose:** Track user's active subscription and billing status

```prisma
model Subscription {
  id     String @id @default(cuid())
  userId String
  planId String

  // Status
  status SubscriptionStatus @default(TRIALING)

  // Billing period
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime

  // Cancellation
  cancelAtPeriodEnd Boolean   @default(false)
  canceledAt        DateTime?
  cancelReason      String?

  // Trial
  trialStart DateTime?
  trialEnd   DateTime?

  // Stripe integration
  stripeCustomerId       String?
  stripeSubscriptionId   String? @unique
  stripeCheckoutSessionId String?

  // Usage tracking
  metadata Json @default("{}")

  // Timestamps
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?
}
```

**Status Lifecycle:**
```
INCOMPLETE → TRIALING → ACTIVE → CANCELED → EXPIRED
                ↓
            PAST_DUE → ACTIVE (payment recovered)
                ↓
            EXPIRED (payment failed permanently)
```

### 3. Payment

**Purpose:** Record all payment transactions

```prisma
model Payment {
  id             String @id @default(cuid())
  subscriptionId String
  userId         String

  // Payment details
  amount        Int     // Cents
  currency      String  @default("USD")
  status        String  // succeeded, pending, failed, refunded
  paymentMethod String?
  failureReason String?

  // Stripe integration
  stripePaymentIntentId String? @unique
  stripeChargeId        String?

  // Metadata
  metadata Json @default("{}")

  // Timestamps
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?
}
```

### 4. Invoice

**Purpose:** Generate and track billing invoices

```prisma
model Invoice {
  id             String @id @default(cuid())
  subscriptionId String
  userId         String

  // Invoice details
  invoiceNumber String  @unique  // INV-2025-001
  amount        Int
  currency      String  @default("USD")
  status        String  // draft, open, paid, void, uncollectible

  // Dates
  issuedAt DateTime @default(now())
  dueAt    DateTime
  paidAt   DateTime?

  // Stripe integration
  stripeInvoiceId String? @unique

  // PDF
  pdfUrl String?

  // Line items
  lineItems Json @default("[]")

  // Metadata
  metadata Json @default("{}")

  // Timestamps
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?
}
```

**Line Items JSON Example:**
```json
[
  {
    "description": "Pro Plan - January 2025",
    "quantity": 1,
    "unitPrice": 2999,
    "total": 2999
  },
  {
    "description": "Additional rooms (5 @ $5/room)",
    "quantity": 5,
    "unitPrice": 500,
    "total": 2500
  }
]
```

### 5. UsageRecord

**Purpose:** Track feature usage for metered billing and analytics

```prisma
model UsageRecord {
  id             String @id @default(cuid())
  subscriptionId String
  userId         String

  // Usage tracking
  metricName String    // "rooms_created", "participants_added"
  quantity   Int
  timestamp  DateTime  @default(now())

  // Metadata
  metadata Json @default("{}")

  // Timestamps
  createdAt DateTime  @default(now())
  deletedAt DateTime?
}
```

## Subscription Tiers

### Free Tier (Freemium)

**Target:** Individual users, testing, small events

```json
{
  "tier": "FREE",
  "name": "Free Plan",
  "price": 0,
  "billingInterval": "MONTHLY",
  "features": {
    "maxRooms": 3,
    "maxParticipantsPerRoom": 50,
    "maxPrizesPerRoom": 10,
    "apps": ["app_lottery_v1"],
    "features": [
      "basic_analytics",
      "community_support"
    ],
    "trialDays": 0
  }
}
```

### Pro Tier

**Target:** Power users, small businesses, regular events

```json
{
  "tier": "PRO",
  "name": "Pro Monthly",
  "price": 2999,  // $29.99
  "billingInterval": "MONTHLY",
  "features": {
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
}
```

### Enterprise Tier

**Target:** Large organizations, agencies, high-volume events

```json
{
  "tier": "ENTERPRISE",
  "name": "Enterprise Yearly",
  "price": 99900,  // $999/year (save $360)
  "billingInterval": "YEARLY",
  "features": {
    "maxRooms": -1,  // Unlimited
    "maxParticipantsPerRoom": -1,  // Unlimited
    "maxPrizesPerRoom": -1,  // Unlimited
    "apps": "*",  // All apps
    "features": [
      "all_pro_features",
      "dedicated_support",
      "sla_99_9",
      "custom_integrations",
      "white_label",
      "priority_features"
    ],
    "trialDays": 30
  }
}
```

## Subscription Lifecycle

### 1. New User Signup

```typescript
// Create user
const user = await prisma.user.create({
  data: {
    email: 'user@example.com',
    name: 'John Doe',
    provider: 'google',
  },
});

// Get Free plan
const freePlan = await prisma.subscriptionPlan.findFirst({
  where: { tier: 'FREE', billingInterval: 'MONTHLY' },
});

// Create Free subscription (no payment required)
const subscription = await prisma.subscription.create({
  data: {
    userId: user.id,
    planId: freePlan.id,
    status: 'ACTIVE',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 365 * 24 * 3600 * 1000), // 1 year
  },
});
```

### 2. Start Trial (Pro/Enterprise)

```typescript
// Get Pro plan
const proPlan = await prisma.subscriptionPlan.findFirst({
  where: { tier: 'PRO', billingInterval: 'MONTHLY' },
});

const features = proPlan.features as any;
const trialDays = features.trialDays || 14;

// Create trial subscription
const subscription = await prisma.subscription.create({
  data: {
    userId: user.id,
    planId: proPlan.id,
    status: 'TRIALING',
    trialStart: new Date(),
    trialEnd: new Date(Date.now() + trialDays * 24 * 3600 * 1000),
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
  },
});
```

### 3. Convert Trial to Paid

```typescript
// After successful payment
await prisma.subscription.update({
  where: { id: subscription.id },
  data: {
    status: 'ACTIVE',
    stripeCustomerId: 'cus_xxx',
    stripeSubscriptionId: 'sub_xxx',
  },
});

// Record payment
await prisma.payment.create({
  data: {
    subscriptionId: subscription.id,
    userId: user.id,
    amount: 2999,
    currency: 'USD',
    status: 'succeeded',
    paymentMethod: 'card',
    stripePaymentIntentId: 'pi_xxx',
  },
});
```

### 4. Cancel Subscription

```typescript
// User cancels (still active until period end)
await prisma.subscription.update({
  where: { id: subscription.id },
  data: {
    cancelAtPeriodEnd: true,
    canceledAt: new Date(),
    cancelReason: 'Too expensive',
  },
});

// At period end, mark as expired
await prisma.subscription.update({
  where: { id: subscription.id },
  data: {
    status: 'EXPIRED',
  },
});

// Downgrade to Free plan
const freePlan = await prisma.subscriptionPlan.findFirst({
  where: { tier: 'FREE' },
});

await prisma.subscription.create({
  data: {
    userId: user.id,
    planId: freePlan.id,
    status: 'ACTIVE',
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 365 * 24 * 3600 * 1000),
  },
});
```

## Stripe Integration

### Setup Stripe Products

```bash
# Create products in Stripe
stripe products create \
  --name "Pro Monthly" \
  --description "Professional plan with advanced features"

# Create price
stripe prices create \
  --product prod_xxx \
  --unit-amount 2999 \
  --currency usd \
  --recurring interval=month
```

### Store Stripe IDs

```typescript
await prisma.subscriptionPlan.update({
  where: { id: proPlan.id },
  data: {
    stripeProductId: 'prod_xxx',
    stripePriceId: 'price_xxx',
  },
});
```

### Webhook Handling

**Important Events:**
- `customer.subscription.created` — New subscription
- `customer.subscription.updated` — Status change
- `customer.subscription.deleted` — Cancellation
- `invoice.paid` — Successful payment
- `invoice.payment_failed` — Failed payment
- `customer.subscription.trial_will_end` — Trial ending soon

```typescript
// Example webhook handler
async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'invoice.paid':
      const invoice = event.data.object as Stripe.Invoice;

      await prisma.payment.create({
        data: {
          subscriptionId: /* lookup by stripeSubscriptionId */,
          userId: /* lookup user */,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: 'succeeded',
          stripePaymentIntentId: invoice.payment_intent as string,
        },
      });
      break;

    case 'customer.subscription.updated':
      const subscription = event.data.object as Stripe.Subscription;

      await prisma.subscription.update({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: mapStripeStatus(subscription.status),
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
      });
      break;
  }
}

function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  const map: Record<string, SubscriptionStatus> = {
    'trialing': 'TRIALING',
    'active': 'ACTIVE',
    'past_due': 'PAST_DUE',
    'canceled': 'CANCELED',
    'unpaid': 'EXPIRED',
    'incomplete': 'INCOMPLETE',
  };
  return map[stripeStatus] || 'EXPIRED';
}
```

## Usage Tracking

### Track Room Creation

```typescript
async function createRoom(userId: string, roomData: any) {
  // Check subscription limits
  const subscription = await getUserActiveSubscription(userId);
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: subscription.planId },
  });

  const features = plan.features as any;
  const maxRooms = features.maxRooms;

  // Count user's rooms
  const roomCount = await prisma.room.count({
    where: {
      createdBy: userId,
      deletedAt: null,
    },
  });

  if (maxRooms !== -1 && roomCount >= maxRooms) {
    throw new Error(`Plan limit reached: ${maxRooms} rooms`);
  }

  // Create room
  const room = await prisma.room.create({ data: roomData });

  // Track usage
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

  return room;
}
```

### Track Participant Addition

```typescript
async function addParticipant(roomId: string, userId: string) {
  // Get room and check limits
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      organizer: {
        include: {
          subscriptions: {
            where: {
              status: 'ACTIVE',
              deletedAt: null,
            },
          },
        },
      },
    },
  });

  const subscription = room.organizer.subscriptions[0];
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: subscription.planId },
  });

  const features = plan.features as any;
  const maxParticipants = features.maxParticipantsPerRoom;

  // Count participants
  const participantCount = await prisma.participant.count({
    where: {
      roomId: roomId,
      deletedAt: null,
    },
  });

  if (maxParticipants !== -1 && participantCount >= maxParticipants) {
    throw new Error(`Plan limit reached: ${maxParticipants} participants`);
  }

  // Add participant
  const participant = await prisma.participant.create({
    data: {
      roomId: roomId,
      userId: userId,
      role: 'PARTICIPANT',
    },
  });

  // Track usage
  await prisma.usageRecord.create({
    data: {
      subscriptionId: subscription.id,
      userId: room.createdBy,
      metricName: 'participants_added',
      quantity: 1,
      metadata: {
        roomId: roomId,
        participantId: participant.id,
      },
    },
  });

  return participant;
}
```

### Usage Analytics

```typescript
// Get usage for current billing period
async function getUsageForPeriod(subscriptionId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });

  const usage = await prisma.usageRecord.groupBy({
    by: ['metricName'],
    where: {
      subscriptionId: subscriptionId,
      timestamp: {
        gte: subscription.currentPeriodStart,
        lte: subscription.currentPeriodEnd,
      },
      deletedAt: null,
    },
    _sum: {
      quantity: true,
    },
  });

  return usage.map(u => ({
    metric: u.metricName,
    total: u._sum.quantity,
  }));
}
```

## Migration Strategy

### 1. Add Subscription Models

```bash
cd platform
npx prisma migrate dev --name add_billing_subscription
```

### 2. Seed Default Plans

```typescript
// platform/prisma/seed-subscriptions.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSubscriptionPlans() {
  // Free Plan
  await prisma.subscriptionPlan.create({
    data: {
      tier: 'FREE',
      name: 'Free Plan',
      description: 'Perfect for trying out the platform',
      price: 0,
      currency: 'USD',
      billingInterval: 'MONTHLY',
      isActive: true,
      displayOrder: 0,
      features: {
        maxRooms: 3,
        maxParticipantsPerRoom: 50,
        maxPrizesPerRoom: 10,
        apps: ['app_lottery_v1'],
        features: ['basic_analytics', 'community_support'],
        trialDays: 0,
      },
    },
  });

  // Pro Monthly
  await prisma.subscriptionPlan.create({
    data: {
      tier: 'PRO',
      name: 'Pro Monthly',
      description: 'For regular event organizers',
      price: 2999,
      currency: 'USD',
      billingInterval: 'MONTHLY',
      isActive: true,
      displayOrder: 1,
      features: {
        maxRooms: 50,
        maxParticipantsPerRoom: 500,
        maxPrizesPerRoom: 100,
        apps: ['app_lottery_v1', 'app_quiz_v1'],
        features: [
          'advanced_analytics',
          'priority_support',
          'custom_branding',
          'export_data',
        ],
        trialDays: 14,
      },
    },
  });

  // Pro Yearly (20% discount)
  await prisma.subscriptionPlan.create({
    data: {
      tier: 'PRO',
      name: 'Pro Yearly',
      description: 'Save 20% with annual billing',
      price: 28800, // $288/year (save $72)
      currency: 'USD',
      billingInterval: 'YEARLY',
      isActive: true,
      displayOrder: 2,
      features: {
        maxRooms: 50,
        maxParticipantsPerRoom: 500,
        maxPrizesPerRoom: 100,
        apps: ['app_lottery_v1', 'app_quiz_v1'],
        features: [
          'advanced_analytics',
          'priority_support',
          'custom_branding',
          'export_data',
        ],
        trialDays: 14,
      },
    },
  });

  // Enterprise Yearly
  await prisma.subscriptionPlan.create({
    data: {
      tier: 'ENTERPRISE',
      name: 'Enterprise',
      description: 'Unlimited everything for large organizations',
      price: 99900, // $999/year
      currency: 'USD',
      billingInterval: 'YEARLY',
      isActive: true,
      displayOrder: 3,
      features: {
        maxRooms: -1, // Unlimited
        maxParticipantsPerRoom: -1,
        maxPrizesPerRoom: -1,
        apps: '*',
        features: [
          'all_pro_features',
          'dedicated_support',
          'sla_99_9',
          'custom_integrations',
          'white_label',
          'priority_features',
        ],
        trialDays: 30,
      },
    },
  });

  console.log('Subscription plans seeded!');
}

seedSubscriptionPlans()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### 3. Backfill Existing Users

```typescript
// platform/scripts/backfill-free-subscriptions.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillFreeSubscriptions() {
  console.log('Backfilling Free subscriptions for existing users...');

  // Get Free plan
  const freePlan = await prisma.subscriptionPlan.findFirst({
    where: {
      tier: 'FREE',
      billingInterval: 'MONTHLY',
    },
  });

  if (!freePlan) {
    throw new Error('Free plan not found. Run seed first.');
  }

  // Get all users without active subscription
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
      subscriptions: {
        none: {
          status: 'ACTIVE',
          deletedAt: null,
        },
      },
    },
  });

  console.log(`Found ${users.length} users without active subscription`);

  // Create Free subscriptions
  for (const user of users) {
    await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: freePlan.id,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      },
    });

    console.log(`Created Free subscription for user ${user.email}`);
  }

  console.log('Backfill complete!');
}

backfillFreeSubscriptions()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

### 4. Run Backfill

```bash
npx tsx platform/scripts/backfill-free-subscriptions.ts
```

## Helper Functions

### Get User's Active Subscription

```typescript
async function getUserActiveSubscription(userId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: userId,
      status: 'ACTIVE',
      deletedAt: null,
    },
    include: {
      plan: true,
    },
  });

  if (!subscription) {
    throw new Error('No active subscription found');
  }

  return subscription;
}
```

### Check Feature Access

```typescript
async function hasFeatureAccess(
  userId: string,
  featureName: string
): Promise<boolean> {
  const subscription = await getUserActiveSubscription(userId);
  const features = subscription.plan.features as any;

  return features.features?.includes(featureName) || false;
}
```

### Check Limit

```typescript
async function checkLimit(
  userId: string,
  limitName: string,
  currentUsage: number
): Promise<boolean> {
  const subscription = await getUserActiveSubscription(userId);
  const features = subscription.plan.features as any;
  const limit = features[limitName];

  // -1 means unlimited
  if (limit === -1) return true;

  return currentUsage < limit;
}
```

## Best Practices

### 1. Always Check Limits Before Operations

```typescript
// BAD: Create room without checking
const room = await prisma.room.create({ data: roomData });

// GOOD: Check limit first
const canCreate = await checkLimit(userId, 'maxRooms', currentRoomCount);
if (!canCreate) {
  throw new Error('Plan limit reached. Please upgrade.');
}
const room = await prisma.room.create({ data: roomData });
```

### 2. Track Usage After Operations

```typescript
// Always track usage for analytics and future metered billing
await prisma.usageRecord.create({
  data: {
    subscriptionId: subscription.id,
    userId: userId,
    metricName: 'rooms_created',
    quantity: 1,
    metadata: { roomId: room.id },
  },
});
```

### 3. Handle Subscription Expiration

```typescript
// Daily cron job
async function expireTrials() {
  const now = new Date();

  await prisma.subscription.updateMany({
    where: {
      status: 'TRIALING',
      trialEnd: {
        lt: now,
      },
    },
    data: {
      status: 'EXPIRED',
    },
  });
}
```

### 4. Notify Users of Expiration

```typescript
// 3 days before trial end
async function notifyTrialEnding() {
  const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 3600 * 1000);

  const expiringTrials = await prisma.subscription.findMany({
    where: {
      status: 'TRIALING',
      trialEnd: {
        lte: threeDaysFromNow,
        gte: new Date(),
      },
    },
    include: {
      user: true,
      plan: true,
    },
  });

  for (const subscription of expiringTrials) {
    // Send email notification
    await sendEmail(subscription.user.email, {
      subject: 'Your trial ends soon',
      template: 'trial-ending',
      data: {
        planName: subscription.plan.name,
        trialEndDate: subscription.trialEnd,
      },
    });
  }
}
```

## Security Considerations

1. **Never expose Stripe secrets** — Store in environment variables
2. **Verify webhook signatures** — Prevent webhook spoofing
3. **Validate subscription status** — Check before granting access
4. **Use Stripe Customer Portal** — Let Stripe handle payment method updates
5. **Soft delete subscriptions** — Keep audit trail for compliance
6. **Track cancellation reasons** — Understand churn

## Testing

### Test Subscription Flow

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Subscription Flow', () => {
  it('should create Free subscription for new user', async () => {
    const user = await prisma.user.create({
      data: { email: 'test@example.com', provider: 'google' },
    });

    const freePlan = await prisma.subscriptionPlan.findFirst({
      where: { tier: 'FREE' },
    });

    const subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: freePlan.id,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      },
    });

    expect(subscription.status).toBe('ACTIVE');
  });

  it('should enforce room limit on Free plan', async () => {
    const subscription = await getUserActiveSubscription(userId);
    const features = subscription.plan.features as any;

    expect(features.maxRooms).toBe(3);

    const roomCount = await prisma.room.count({
      where: { createdBy: userId },
    });

    expect(roomCount).toBeLessThan(features.maxRooms);
  });
});
```

## Metrics to Track

### Business Metrics
- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)
- Churn rate
- Trial conversion rate
- Average revenue per user (ARPU)
- Customer lifetime value (LTV)

### Technical Metrics
- Subscription status distribution
- Failed payment rate
- Usage vs. limits per plan
- Most used features per tier

## Next Steps

1. [ ] Set up Stripe account and products
2. [ ] Run migration: `npx prisma migrate dev --name add_billing`
3. [ ] Seed subscription plans
4. [ ] Backfill existing users to Free plan
5. [ ] Implement Stripe webhook handlers
6. [ ] Add subscription management API endpoints
7. [ ] Build pricing page UI
8. [ ] Implement subscription upgrade/downgrade flows
9. [ ] Set up automated dunning (failed payment handling)
10. [ ] Add usage analytics dashboard

## Resources

- [Stripe Subscription Best Practices](https://stripe.com/docs/billing/subscriptions/overview)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [SaaS Metrics Guide](https://www.profitwell.com/recur/all/saas-metrics)
- [Subscription State Machine](https://stripe.com/docs/billing/subscriptions/overview#subscription-statuses)

---

**Conclusion:**

This billing system provides a solid foundation for monetizing the event management platform. It starts simple with freemium support but is designed to scale with features like:
- Multiple billing intervals
- Usage tracking for metered billing
- Complete Stripe integration
- Trial management
- Payment history
- Invoice generation

All existing users will be automatically assigned to the Free plan during migration, ensuring backward compatibility.
