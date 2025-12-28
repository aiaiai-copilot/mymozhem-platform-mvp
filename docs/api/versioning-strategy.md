# API Versioning Strategy

## Overview

The Event Management Platform API uses URL-based versioning to ensure backward compatibility and smooth transitions between API versions.

**Current Version:** `v1`

**Base URL Pattern:** `https://api.platform.example.com/api/v{version}`

---

## Why Versioning from Day One?

1. **Third-Party Developer Protection** - Applications integrating with the platform won't break unexpectedly
2. **Backward Compatibility** - Multiple versions can coexist, allowing gradual migration
3. **Clear Communication** - Version changes signal the magnitude of changes
4. **Professional Standard** - Production APIs should always be versioned

---

## Versioning Scheme

### Major Versions (v1, v2, v3)

**When to increment:**
- Breaking changes to request/response structure
- Removed endpoints or fields
- Changed authentication mechanism
- Incompatible behavior changes
- Renamed resources or URL patterns
- Changed error response format

**Examples:**
```
v1 → v2: Changed authentication from API keys to OAuth only
v2 → v3: Removed deprecated participant metadata field
```

### Minor Changes (Same Version)

**Allowed without version bump:**
- Adding new optional fields to responses
- Adding new endpoints
- Adding new optional query parameters
- Bug fixes that don't change behavior
- Performance improvements
- Adding new optional request body fields

**Examples:**
```
✅ Adding new field "participantCount" to Room response
✅ New endpoint POST /api/v1/rooms/{roomId}/invite
✅ New query param ?includeInactive=true
```

---

## Version Lifecycle

### 1. Active Development
- Latest version receives new features
- Bug fixes applied to current and previous version
- Full documentation and support

### 2. Maintenance (Previous Version)
- Security fixes and critical bugs only
- No new features
- Documented with deprecation warnings
- Minimum 6 months of support

### 3. Deprecated
- 3-month notice before removal
- Deprecation warnings in response headers
- Migration guide provided
- Status visible in API documentation

### 4. Sunset (Removed)
- Version no longer available
- Requests return 410 Gone with migration info

---

## Deprecation Process

### Step 1: Announce (T-6 months)
- Public announcement via:
  - API documentation
  - Developer blog
  - Email to registered app developers
  - Changelog

### Step 2: Mark as Deprecated (T-3 months)
- Add deprecation header to all responses:
  ```http
  X-API-Deprecation: true
  X-API-Sunset-Date: 2026-06-01
  X-API-Migration-Guide: https://docs.platform.example.com/migration/v1-to-v2
  ```

### Step 3: Final Warning (T-1 month)
- Email notifications to active API users
- Dashboard warnings for applications still using old version
- Update documentation with prominent deprecation notice

### Step 4: Sunset
- Return 410 Gone for deprecated version
- Response includes link to migration guide
- Monitoring to track remaining usage

---

## Version Support Policy

| Status | Duration | Support Level |
|--------|----------|---------------|
| Current | Indefinite | Full support, new features |
| Previous | 6+ months | Security & critical bugs only |
| Deprecated | 3 months | Warning period, no fixes |
| Sunset | Permanent | Version removed |

**Example Timeline:**
```
v1: 2025-01-01 → 2025-07-01 (Current)
v2: 2025-07-01 → Launch
     2025-07-01 → 2026-01-01 (v1 maintenance)
     2026-01-01 → 2026-04-01 (v1 deprecated)
     2026-04-01 → v1 sunset
```

---

## Breaking Changes

### What Constitutes a Breaking Change?

**Response Changes:**
- ❌ Removing a field from response
- ❌ Renaming a field
- ❌ Changing field type (string → number)
- ❌ Changing field format (date format change)
- ✅ Adding optional field to response

**Request Changes:**
- ❌ Making optional field required
- ❌ Removing accepted field
- ❌ Changing validation rules (stricter)
- ❌ Changing request format
- ✅ Adding new optional field
- ✅ Relaxing validation rules

**Endpoint Changes:**
- ❌ Removing endpoint
- ❌ Changing URL structure
- ❌ Changing HTTP method
- ✅ Adding new endpoint

**Behavior Changes:**
- ❌ Changing default behavior
- ❌ Changing error codes for same scenario
- ❌ Changing authentication requirements
- ✅ Improving performance
- ✅ Fixing bugs that correct wrong behavior

---

## Migration Guide Template

When releasing a new major version, provide:

### 1. Summary of Changes
```markdown
## v1 → v2 Migration Guide

### Breaking Changes
1. Authentication now requires OAuth 2.0 (API keys deprecated)
2. Room.appSettings moved to Room.settings
3. Removed deprecated metadata field from Participant

### New Features
- Bulk operations for participants
- Advanced filtering on all list endpoints
- WebSocket v2 namespace with binary support
```

### 2. Side-by-Side Comparison
```markdown
## Endpoint Changes

### Create Room
**v1:**
```http
POST /api/v1/rooms
{
  "name": "My Room",
  "appSettings": { "key": "value" }
}
```

**v2:**
```http
POST /api/v2/rooms
{
  "name": "My Room",
  "settings": { "key": "value" },
  "timezone": "UTC"
}
```

### 3. Code Examples
Provide before/after code samples in multiple languages

### 4. Automated Tools
Offer migration tools when possible:
- Code generators
- Request/response transformers
- Compatibility checker

---

## Version Detection

### In Request
Clients specify version via URL:
```http
GET /api/v1/rooms/123
GET /api/v2/rooms/123
```

### In Response
All responses include version information:
```http
X-API-Version: v1
X-API-Latest-Version: v2
X-API-Deprecated: false
```

### Version Negotiation (Future)
Alternative header-based versioning (not currently used):
```http
Accept: application/vnd.platform.v1+json
```

---

## Testing Strategy

### Before Major Release
1. **Beta Period** - 1 month minimum
   - Deploy v2 alongside v1
   - Select beta testers
   - Monitor usage and issues

2. **Automated Testing**
   - Contract tests for all endpoints
   - Backward compatibility tests
   - Performance benchmarks

3. **Documentation**
   - Complete v2 API docs
   - Migration guide
   - Changelog with all changes

### During Transition
1. **Monitoring**
   - Track v1 vs v2 usage
   - Monitor error rates
   - Collect feedback

2. **Support**
   - Dedicated support channel
   - Active migration assistance
   - Regular check-ins with major integrators

---

## Versioning Best Practices

### For Platform Developers

1. **Additive Changes Only** - Add new fields/endpoints rather than modifying existing
2. **Explicit Deprecation** - Mark deprecated features clearly before removal
3. **Backward Compatibility** - Maintain compatibility within major version
4. **Documentation** - Update docs before code changes
5. **Communication** - Announce changes early and often

### For Application Developers

1. **Version Pinning** - Always specify version in requests
2. **Graceful Degradation** - Handle missing fields gracefully
3. **Version Monitoring** - Watch for deprecation headers
4. **Testing** - Test against new versions in staging
5. **Migration Planning** - Don't wait until sunset to migrate

---

## Version History

### v1 (Current)
**Released:** 2025-01-15 (MVP Launch)

**Status:** Active Development

**Features:**
- User authentication (OAuth Google)
- Room/event management
- Participant management with roles
- Prize fund management
- Winner selection
- Application registration
- Real-time WebSocket events
- REST API for all CRUD operations

**Known Limitations:**
- Single OAuth provider (Google only)
- No bulk operations
- Basic filtering capabilities
- No file uploads for prizes

### v2 (Planned)
**Target:** 2025-Q3

**Planned Features:**
- Multiple OAuth providers (Yandex, VK, email)
- Bulk participant operations
- Advanced filtering and search
- File upload for prize images
- Improved rate limiting
- GraphQL endpoint (alternative to REST)
- Enhanced WebSocket binary protocol

**Breaking Changes:**
- TBD (will be documented before beta)

---

## FAQ

**Q: Why not use header-based versioning?**
A: URL-based versioning is simpler, more visible, and easier to test. Headers are reserved for future flexibility.

**Q: Can I use both v1 and v2 in the same application?**
A: Yes, but it's recommended to migrate completely for consistency.

**Q: What happens if I don't specify a version?**
A: Requests without version will be rejected with 400 Bad Request.

**Q: Will WebSocket versions match REST API versions?**
A: WebSocket connections are version-agnostic, but event schemas follow REST API versioning.

**Q: How long will v1 be supported?**
A: Minimum 6 months after v2 release, likely longer depending on adoption.

**Q: Can deprecated versions receive security fixes?**
A: Only during the maintenance period. Once deprecated, no fixes are applied.

---

## Contact

Questions about versioning?
- Email: api@platform.example.com
- Developer Forum: https://forum.platform.example.com/api
- GitHub Issues: https://github.com/platform/issues

---

**Last Updated:** 2025-12-28
**Document Version:** 1.0.0
