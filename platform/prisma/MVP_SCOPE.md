# MVP Scope - Database Schema

**Date:** December 30, 2025
**Decision:** Remove billing/subscription system from MVP

## Rationale

The billing and subscription system has been **removed from the MVP scope**. The decision is based on:

1. **Validate first, monetize later** - We need to validate the core platform with real users before implementing payment features
2. **Complexity reduction** - Billing adds significant complexity that distracts from core product development
3. **Faster time to market** - Launch with free access, gather feedback, then design proper monetization
4. **Better monetization design** - Real usage data will inform better pricing and feature tiers

## What Was Removed

### Database Tables (5 removed)
- `subscription_plans` - Subscription tier definitions
- `subscriptions` - User subscription records
- `payments` - Payment transaction history
- `invoices` - Billing invoices
- `usage_records` - Usage tracking for metered billing

### Enums (3 removed)
- `SubscriptionPlanTier` (FREE, PRO, ENTERPRISE, CUSTOM)
- `SubscriptionStatus` (TRIALING, ACTIVE, PAST_DUE, etc.)
- `BillingInterval` (MONTHLY, YEARLY, LIFETIME)

### Relations (1 removed)
- `User.subscriptions` → `Subscription[]`

### Indexes (34 removed)
- All billing-related indexes removed
- Total indexes: **79 → 45**

### Documentation (3 files deleted)
- `BILLING_SUBSCRIPTION.md` - Subscription system guide
- `BILLING_QUICK_START.md` - Quick start for billing
- `BILLING_IMPLEMENTATION_SUMMARY.md` - Implementation summary

## Clean MVP Schema

### Tables (8 core tables)
1. **users** - User accounts with OAuth
2. **sessions** - Authentication sessions
3. **token_blacklist** - Revoked JWT tokens
4. **apps** - Registered applications with manifests
5. **rooms** - Events/rooms
6. **participants** - User-room membership
7. **prizes** - Prize records
8. **winners** - Winner records

### Enums (2)
1. **RoomStatus** - DRAFT, ACTIVE, COMPLETED, CANCELLED
2. **ParticipantRole** - ADMIN, ORGANIZER, MODERATOR, PARTICIPANT, VIEWER

### Statistics
- **Lines of code:** 509 → 280 (45% reduction)
- **Tables:** 13 → 8 (38% reduction)
- **Enums:** 5 → 2 (60% reduction)
- **Relations:** 20 → 11 (45% reduction)
- **Indexes:** 79 → 45 (43% reduction)
- **JSON Fields:** 11 → 6 (45% reduction)

## MVP Access Model

**For MVP launch:**
- ✅ All users have **FREE** access to **ALL** features
- ✅ No restrictions on rooms, participants, or prizes
- ✅ No payment processing required
- ✅ No subscription management needed

## Post-MVP Monetization

**After platform validation**, we will:
1. **Analyze usage patterns** - Understand how users actually use the platform
2. **Design proper pricing** - Based on real user behavior and value delivered
3. **Implement billing system** - Add subscription tables, Stripe integration, etc.
4. **Grandfather early users** - Reward early adopters with special pricing

## Benefits of This Approach

### Development Benefits
- ✅ **Faster development** - Focus on core features only
- ✅ **Simpler codebase** - Less complexity, easier to maintain
- ✅ **Easier testing** - No payment flows to test
- ✅ **Faster iterations** - No billing constraints on feature changes

### Business Benefits
- ✅ **Lower barrier to entry** - Users can try full platform without payment
- ✅ **Better user feedback** - Users test full feature set
- ✅ **Data-driven pricing** - Design monetization based on real usage
- ✅ **Competitive advantage** - Launch faster than feature-complete competitors

### User Benefits
- ✅ **Free access** - Try platform risk-free
- ✅ **No credit card required** - Easier signup
- ✅ **Full feature access** - Experience complete platform
- ✅ **Better support** - Team focused on features, not billing issues

## Implementation Notes

### Schema Comments
The schema now includes clear comments:
```prisma
// ============================================================================
// BILLING & SUBSCRIPTIONS
// ============================================================================

// NOTE: Billing and subscription features will be implemented POST-MVP
// after the platform has been validated with real users.
// For MVP: All users have free access to all features.
```

### Documentation Updates
All documentation has been updated to reflect MVP scope:
- `SCHEMA_SUMMARY.md` - Updated statistics and roadmap
- `QUERY_EXAMPLES.md` - Billing queries commented out as reference
- `MIGRATION_PLAN.md` - Billing migration marked as POST-MVP

### Future-Proofing
While billing is removed, the architecture supports adding it later:
- User model is ready (no changes needed)
- Clean separation of concerns (billing won't affect core features)
- Documentation preserved for future reference (commented out, not deleted)

## Timeline

### MVP (Now)
- ✅ Core 8 tables
- ✅ Free access for all users
- ✅ OAuth authentication
- ✅ App integration system
- ✅ Room/event management
- ✅ Prize distribution

### Post-MVP Validation (3-6 months)
- Gather user feedback
- Analyze usage patterns
- Identify most valuable features
- Determine pricing sweet spot

### Billing Implementation (6-12 months)
- Design subscription tiers based on data
- Implement Stripe integration
- Add subscription management
- Grandfather early users

## Risks & Mitigation

### Risk: Users expect billing from day one
**Mitigation:** Clear communication that platform is in beta, free access is temporary promotional offer

### Risk: Hard to add billing later
**Mitigation:**
- Architecture supports billing (User model, API structure)
- Documentation preserved for reference
- Clean separation of concerns

### Risk: Can't sustain free access forever
**Mitigation:**
- Plan for monetization from start
- Gather data to inform pricing
- Transparent communication with users about future pricing

## Success Criteria for Adding Billing

Add billing when we achieve:
1. ✅ **1000+ active users** using platform monthly
2. ✅ **Clear value proposition** validated by user feedback
3. ✅ **Usage patterns understood** - Know what features drive value
4. ✅ **Pricing research done** - User surveys on willingness to pay
5. ✅ **Core features stable** - No major product pivots expected

## References

- MVP architecture documented in `docs/event-platform-context.md`
- Billing implementation reference in `MIGRATION_PLAN.md` (commented section)
- Query examples in `QUERY_EXAMPLES.md` (commented section)

---

**Decision Status:** APPROVED
**Implementation Status:** COMPLETE
**Next Review:** After 1000 active users or 6 months, whichever comes first
