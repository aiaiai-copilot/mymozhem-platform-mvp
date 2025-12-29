# Manifest Versioning Implementation Summary

## Audit Issue Addressed

**Original Problem:**
- Room.appSettings is a JSON field validated against app manifest's JSON Schema
- When app updates manifest (changes schema), old rooms may become invalid
- No way to track which manifest version was used when room was created
- Risk of breaking existing rooms when apps release updates

**Solution Implemented:**
Comprehensive manifest versioning system that locks rooms to specific manifest versions at creation time, ensuring backward compatibility and controlled migration paths.

---

## Database Schema Changes

### 1. App Model

**New Fields:**
```prisma
model App {
  // ... existing fields

  // Manifest versioning
  manifest        Json   // Current manifest (JSON)
  manifestVersion String // Semantic version (e.g., "1.2.3")
  manifestHistory Json   @default("[]") // Array of previous manifest versions

  // New index
  @@index([manifestVersion])
}
```

**Field Descriptions:**
- `manifest` - Current/latest version of the application manifest
- `manifestVersion` - Semantic version extracted from `manifest.meta.version`
- `manifestHistory` - Array of previous manifest versions with metadata:
  ```json
  [
    {
      "version": "1.0.0",
      "manifest": { /* complete manifest object */ },
      "publishedAt": "2025-01-15T10:00:00Z",
      "deprecatedAt": null
    }
  ]
  ```

### 2. Room Model

**New Fields:**
```prisma
model Room {
  // ... existing fields

  // Application integration
  appId              String
  appSettings        Json   // Validated against locked manifest version
  appManifestVersion String // Locks room to specific manifest version

  // New indexes
  @@index([appManifestVersion])
  @@index([appId, appManifestVersion])
}
```

**Field Description:**
- `appManifestVersion` - Manifest version at the time room was created
- Settings are **always** validated against this locked version
- Room continues working even after app updates to new versions

---

## How It Works

### Lifecycle Flow

```
1. App Registration (v1.0.0)
   ├─ Extract version from manifest.meta.version
   ├─ Store in App.manifestVersion
   └─ manifestHistory = [] (empty)

2. Room Creation
   ├─ Fetch current app.manifestVersion
   ├─ Validate appSettings against current manifest.settings
   └─ Lock room: appManifestVersion = app.manifestVersion

3. Manifest Update (v1.0.0 → v1.1.0)
   ├─ Archive v1.0.0 to manifestHistory
   ├─ Update App.manifest to v1.1.0
   ├─ Update App.manifestVersion to "1.1.0"
   └─ Old rooms STILL use v1.0.0 (unaffected)

4. Validation (Existing Room)
   ├─ Fetch room.appManifestVersion (e.g., "1.0.0")
   ├─ Check if matches current: app.manifestVersion
   ├─ If different: fetch from app.manifestHistory
   └─ Validate appSettings against correct version
```

### Key Benefits

1. **Backward Compatibility**
   - Old rooms never break when app updates
   - Each room is isolated to its creation version

2. **Forward Compatibility**
   - New features available immediately for new rooms
   - No waiting period or migration blockers

3. **Controlled Migration**
   - Organizers can upgrade rooms when ready (opt-in)
   - Platform can detect incompatible settings before upgrade
   - Migration data can be requested if needed

4. **Complete Audit Trail**
   - Every manifest version preserved in history
   - Can always reconstruct room state at creation time
   - Deprecation tracking built-in

---

## Migration Strategies

### Strategy 1: Automatic (Non-Breaking)

**Use Case:** Adding optional fields

**Example:**
```
v1.0.0 → v1.1.0 (added optional "theme" field)
```

**Process:**
- Room settings already valid for v1.1.0
- Just update `appManifestVersion` field
- No user interaction needed

### Strategy 2: Assisted (Interactive)

**Use Case:** Adding required fields with defaults

**Example:**
```
v1.1.0 → v2.0.0 (added required "drawType" field)
```

**Process:**
1. Organizer initiates upgrade
2. Platform validates current settings
3. Platform identifies missing fields
4. Organizer provides missing values
5. Platform merges and validates
6. Platform upgrades room

### Strategy 3: Manual (Breaking Changes)

**Use Case:** Field type changes, renames

**Example:**
```
v2.0.0 → v3.0.0 (renamed "ticketCount" → "maxTickets")
```

**Process:**
1. App developer provides migration script
2. Platform applies transformation logic
3. Validates transformed settings
4. Updates room with new structure

---

## API Endpoints

### Create Room (with version lock)

```typescript
POST /api/rooms

{
  "name": "New Year Lottery",
  "appId": "app_lottery_v1",
  "appSettings": { "ticketCount": 100 }
}

// Platform logic:
const app = await prisma.app.findUnique({ where: { appId } });
// Validate against app.manifest.settings
// Create room with appManifestVersion = app.manifestVersion
```

### Update Manifest

```typescript
PATCH /api/apps/{appId}

{
  "manifest": {
    "meta": { "version": "1.1.0" },
    // ... rest of manifest
  }
}

// Platform logic:
// 1. Validate version increment
// 2. Archive current version to manifestHistory
// 3. Update manifest and manifestVersion
// 4. Old rooms unaffected (still use old version)
```

### Upgrade Room (opt-in)

```typescript
POST /api/rooms/{roomId}/upgrade-manifest

{
  "targetVersion": "1.1.0",
  "migrationData": { /* optional missing fields */ }
}

// Platform logic:
// 1. Fetch target manifest version
// 2. Validate current settings + migrationData
// 3. If valid: update appManifestVersion
// 4. If invalid: return error with missing fields
```

### Deprecate Version

```typescript
POST /api/apps/{appId}/deprecate-version

{
  "version": "1.0.0",
  "reason": "Security fix in v1.1.0"
}

// Platform logic:
// 1. Mark version in manifestHistory as deprecated
// 2. Notify organizers of affected rooms
// 3. Suggest upgrade path
```

---

## Database Queries

### Find Rooms by Version

```typescript
// All rooms using v1.0.0
const rooms = await prisma.room.findMany({
  where: {
    appId: 'app_lottery_v1',
    appManifestVersion: '1.0.0',
  },
});
```

### Count Rooms per Version

```typescript
const distribution = await prisma.room.groupBy({
  by: ['appManifestVersion'],
  where: { appId: 'app_lottery_v1' },
  _count: { id: true },
});

// Result:
// [
//   { appManifestVersion: '1.0.0', _count: { id: 42 } },
//   { appManifestVersion: '1.1.0', _count: { id: 18 } }
// ]
```

### Find Outdated Rooms

```typescript
const app = await prisma.app.findUnique({ where: { appId } });

const outdatedRooms = await prisma.room.findMany({
  where: {
    appId: appId,
    appManifestVersion: { not: app.manifestVersion },
    status: { in: ['DRAFT', 'ACTIVE'] },
  },
});
```

### Validate Room Settings

```typescript
// Fetch room with app
const room = await prisma.room.findUnique({
  where: { id: roomId },
  include: { app: true },
});

// Get manifest for locked version
let manifest;
if (room.app.manifestVersion === room.appManifestVersion) {
  manifest = room.app.manifest; // Current version
} else {
  // Fetch from history
  const entry = room.app.manifestHistory.find(
    (e) => e.version === room.appManifestVersion
  );
  manifest = entry.manifest;
}

// Validate against correct schema
validateJsonSchema(room.appSettings, manifest.settings);
```

---

## Semantic Versioning

**Format:** `MAJOR.MINOR.PATCH`

### Version Bump Rules

| Change Type | Example | Version Bump | Notes |
|-------------|---------|--------------|-------|
| Add optional field | `theme?: string` | MINOR (1.0.0 → 1.1.0) | Backward compatible |
| Add required field with default | `drawType: string` | MINOR (1.0.0 → 1.1.0) | Provide migration |
| Remove optional field | Remove `theme` | MAJOR (1.x.x → 2.0.0) | May break users |
| Remove required field | Remove `ticketCount` | MAJOR (1.x.x → 2.0.0) | Breaking change |
| Change field type | `ticketCount: string` | MAJOR (1.x.x → 2.0.0) | Breaking change |
| Rename field | `ticketCount → maxTickets` | MAJOR (1.x.x → 2.0.0) | Breaking change |
| Bug fix | No schema change | PATCH (1.0.0 → 1.0.1) | No migration needed |

---

## Documentation Files

All documentation has been created/updated:

### Platform Documentation

1. **`platform/prisma/schema.prisma`**
   - Updated App model with versioning fields
   - Updated Room model with version lock field
   - Added indexes for efficient queries

2. **`platform/prisma/MANIFEST_VERSIONING.md`** (NEW)
   - Complete versioning guide (19 pages)
   - Lifecycle workflows with examples
   - Migration strategies
   - Validation system
   - Query patterns
   - Best practices

3. **`platform/prisma/SCHEMA_SUMMARY.md`** (UPDATED)
   - Added manifest versioning section
   - Updated index counts (40 → 45)
   - Updated JSON field descriptions
   - Added versioning statistics

4. **`platform/prisma/QUERY_EXAMPLES.md`** (UPDATED)
   - Updated app registration queries
   - Updated room creation queries
   - Added 10+ new versioning queries
   - Added best practices section

5. **`platform/prisma/MIGRATION_PLAN.md`** (UPDATED)
   - Added versioning migration section
   - Backfill script for existing data
   - Validation steps

### API Documentation

6. **`docs/api/app-manifest.md`** (UPDATED)
   - Added versioning requirements section
   - Added version locking explanation
   - Updated manifest update rules
   - Added room upgrade endpoint docs
   - Added migration guide with examples

---

## Testing Checklist

- [ ] Create app with initial manifest (v1.0.0)
- [ ] Verify `manifestVersion` and empty `manifestHistory`
- [ ] Create room and verify `appManifestVersion` is set
- [ ] Update manifest to v1.1.0
- [ ] Verify old version archived in `manifestHistory`
- [ ] Verify old room still uses v1.0.0
- [ ] Create new room and verify it uses v1.1.0
- [ ] Validate old room settings against v1.0.0 (from history)
- [ ] Validate new room settings against v1.1.0 (current)
- [ ] Upgrade compatible room from v1.0.0 to v1.1.0
- [ ] Attempt upgrade with incompatible settings (should fail)
- [ ] Test migration with provided `migrationData`
- [ ] Deprecate old version
- [ ] Query rooms by version
- [ ] Count rooms per version
- [ ] Find outdated rooms

---

## Implementation Priorities

### Phase 1: Database Schema (COMPLETED)
- [x] Add versioning fields to App model
- [x] Add version lock field to Room model
- [x] Add indexes
- [x] Update documentation

### Phase 2: Core Logic (TODO)
- [ ] Implement manifest version extraction
- [ ] Implement manifest archiving on update
- [ ] Implement version validation logic
- [ ] Implement manifest fetching from history

### Phase 3: API Endpoints (TODO)
- [ ] Update POST /api/apps (extract and store version)
- [ ] Update PATCH /api/apps (archive and increment)
- [ ] Update POST /api/rooms (lock to current version)
- [ ] Implement POST /api/rooms/{id}/upgrade-manifest
- [ ] Implement POST /api/apps/{id}/deprecate-version

### Phase 4: Migration Tools (TODO)
- [ ] Create backfill script for existing data
- [ ] Create bulk upgrade script
- [ ] Create deprecation notification system
- [ ] Create version analytics dashboard

---

## Security Considerations

1. **Version Integrity**
   - Prevent version rollback (no downgrades)
   - Validate semver format on all versions
   - Ensure history entries are immutable

2. **Permission Checks**
   - Only room organizer can upgrade room
   - Only platform admin can deprecate versions
   - Validate user permissions before operations

3. **Data Validation**
   - Always validate settings against locked version
   - Never trust client-provided version strings
   - Verify manifest exists in history before use

4. **Audit Trail**
   - Log all manifest updates
   - Log all room version upgrades
   - Track deprecation events

---

## Performance Optimization

### Caching Strategy

```typescript
// Cache manifests by version
const manifestCache = new Map<string, Manifest>();

function getCachedManifest(appId: string, version: string): Manifest {
  const key = `${appId}:${version}`;
  if (manifestCache.has(key)) return manifestCache.get(key);

  // Fetch and cache
  const manifest = fetchFromDB(appId, version);
  manifestCache.set(key, manifest);
  return manifest;
}
```

### Database Indexes

```sql
-- Efficient version queries
CREATE INDEX "apps_manifestVersion_idx" ON "apps"("manifestVersion");
CREATE INDEX "rooms_appManifestVersion_idx" ON "rooms"("appManifestVersion");
CREATE INDEX "rooms_appId_appManifestVersion_idx" ON "rooms"("appId", "appManifestVersion");
```

### Query Optimization

- Use composite index for room version queries
- Cache frequently accessed manifests
- Batch upgrade operations in transactions
- Limit manifestHistory size (archive very old versions separately)

---

## Conclusion

The manifest versioning system completely addresses the audit concern:

1. **Prevents Breaking Changes**
   - Old rooms locked to original manifest version
   - Continue working even after app updates

2. **Enables Evolution**
   - Apps can release new versions freely
   - New features available immediately for new rooms

3. **Controlled Migration**
   - Organizers upgrade when ready (opt-in)
   - Platform validates before upgrade
   - Migration data requested if needed

4. **Complete Audit Trail**
   - Every manifest version preserved
   - Deprecation tracking built-in
   - Can reconstruct any room's original state

5. **Developer-Friendly**
   - Semantic versioning standard
   - Clear migration patterns
   - Comprehensive documentation

**Status:** Database schema changes complete. Ready for implementation of core logic and API endpoints.

---

## Next Steps

1. **Run Migration**
   ```bash
   cd platform
   npx prisma migrate dev --name add_manifest_versioning
   ```

2. **Backfill Existing Data** (if any)
   ```bash
   npx tsx platform/scripts/backfill-manifest-versions.ts
   ```

3. **Implement Core Logic**
   - Manifest version extraction service
   - Manifest archiving service
   - Version validation utilities

4. **Update API Endpoints**
   - App registration/update
   - Room creation
   - Room manifest upgrade

5. **Test Thoroughly**
   - Follow testing checklist
   - Verify backward compatibility
   - Test migration scenarios

6. **Deploy**
   - Deploy to staging first
   - Validate with real data
   - Monitor version distribution
   - Deploy to production
