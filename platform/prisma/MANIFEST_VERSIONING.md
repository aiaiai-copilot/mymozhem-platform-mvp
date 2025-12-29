# Application Manifest Versioning Guide

## Overview

This document describes the manifest versioning system that ensures room settings remain valid even when applications update their manifests.

## Problem Statement

**Audit Issue:** Without versioning, manifest changes break existing rooms:

1. **Room.appSettings** is validated against app manifest's JSON Schema
2. If app updates manifest (changes schema), old rooms become invalid
3. No way to track which manifest version was used when room was created
4. Risk of breaking existing rooms when apps release updates

**Example Scenario:**
```
1. App manifest v1.0.0 requires: { ticketCount: number }
2. Room created with: { ticketCount: 100 }
3. App updates to v2.0.0, adds required field: { ticketCount: number, drawType: string }
4. Old room fails validation (missing drawType)
5. Room becomes unusable
```

## Solution: Manifest Versioning

### Database Schema Changes

#### App Model
```prisma
model App {
  // ... existing fields

  manifest        Json   // Current manifest (JSON)
  manifestVersion String // Semantic version (e.g., "1.2.3")
  manifestHistory Json   @default("[]") // Array of previous versions

  @@index([manifestVersion])
}
```

#### Room Model
```prisma
model Room {
  // ... existing fields

  appId              String
  appSettings        Json   // Settings validated against specific manifest version
  appManifestVersion String // Locks room to specific manifest version

  @@index([appManifestVersion])
  @@index([appId, appManifestVersion])
}
```

### Manifest Version Format

**Semantic Versioning (semver):**
- Format: `MAJOR.MINOR.PATCH` (e.g., "1.2.3")
- **MAJOR** - Breaking changes (incompatible schema changes)
- **MINOR** - New features (backward-compatible additions)
- **PATCH** - Bug fixes (no schema changes)

**Examples:**
- `1.0.0` → Initial release
- `1.1.0` → Added optional field
- `2.0.0` → Changed required field (breaking)

### Manifest History Structure

**manifestHistory JSON Array:**
```json
[
  {
    "version": "1.0.0",
    "manifest": { /* full manifest at v1.0.0 */ },
    "publishedAt": "2025-01-15T10:00:00Z",
    "deprecatedAt": null
  },
  {
    "version": "1.1.0",
    "manifest": { /* full manifest at v1.1.0 */ },
    "publishedAt": "2025-02-01T14:30:00Z",
    "deprecatedAt": null
  }
]
```

**Fields:**
- `version` - Semantic version string
- `manifest` - Complete manifest object at that version
- `publishedAt` - ISO 8601 timestamp when version was published
- `deprecatedAt` - ISO 8601 timestamp when version was deprecated (null if active)

---

## Lifecycle Workflows

### 1. App Registration (New App)

**Request:**
```http
POST /api/apps
Content-Type: application/json

{
  "appId": "app_lottery_v1",
  "manifest": {
    "meta": {
      "name": "Holiday Lottery",
      "version": "1.0.0",
      // ... other manifest fields
    }
  }
}
```

**Platform Logic:**
```typescript
// Extract version from manifest
const manifestVersion = manifest.meta.version; // "1.0.0"

// Validate semver format
if (!isValidSemver(manifestVersion)) {
  throw new Error('Invalid manifest version format');
}

// Create app with initial version
await prisma.app.create({
  data: {
    appId: 'app_lottery_v1',
    appSecret: generateSecret(),
    manifest: manifest,
    manifestVersion: manifestVersion,
    manifestHistory: [], // Empty for first version
  },
});
```

**Result:**
- App registered with version 1.0.0
- manifestHistory is empty (no previous versions)

---

### 2. Room Creation (Using Latest Manifest)

**Request:**
```http
POST /api/rooms
Content-Type: application/json

{
  "name": "New Year Lottery 2025",
  "appId": "app_lottery_v1",
  "appSettings": {
    "ticketCount": 100,
    "drawDate": "2025-12-31T23:00:00Z"
  }
}
```

**Platform Logic:**
```typescript
// Fetch app with current manifest version
const app = await prisma.app.findUnique({
  where: { appId: 'app_lottery_v1' },
  select: { manifest: true, manifestVersion: true },
});

// Validate appSettings against current manifest's JSON Schema
const settingsSchema = app.manifest.settings;
const isValid = validateJsonSchema(appSettings, settingsSchema);

if (!isValid) {
  throw new Error('Invalid appSettings for current manifest version');
}

// Create room locked to current manifest version
await prisma.room.create({
  data: {
    name: 'New Year Lottery 2025',
    appId: 'app_lottery_v1',
    appSettings: appSettings,
    appManifestVersion: app.manifestVersion, // Lock to "1.0.0"
    createdBy: userId,
  },
});
```

**Result:**
- Room created with `appManifestVersion: "1.0.0"`
- Room settings will always be validated against v1.0.0 schema
- Future manifest updates won't affect this room

---

### 3. Manifest Update (Non-Breaking)

**Request:**
```http
PATCH /api/apps/app_lottery_v1
Content-Type: application/json

{
  "manifest": {
    "meta": {
      "name": "Holiday Lottery",
      "version": "1.1.0" // Incremented minor version
    },
    "settings": {
      "type": "object",
      "properties": {
        "ticketCount": { "type": "integer" },
        "drawDate": { "type": "string", "format": "date-time" },
        "theme": { "type": "string", "enum": ["new-year", "christmas"] } // NEW OPTIONAL FIELD
      },
      "required": ["ticketCount", "drawDate"] // Same required fields
    }
  }
}
```

**Platform Logic:**
```typescript
const newManifest = requestBody.manifest;
const newVersion = newManifest.meta.version; // "1.1.0"

// Fetch current app state
const app = await prisma.app.findUnique({
  where: { appId: 'app_lottery_v1' },
});

const currentVersion = app.manifestVersion; // "1.0.0"

// Validate version increment
if (!isVersionGreater(newVersion, currentVersion)) {
  throw new Error('New version must be greater than current version');
}

// Detect breaking changes
const isBreaking = detectBreakingChanges(app.manifest, newManifest);

if (isBreaking && !isMajorVersionBump(currentVersion, newVersion)) {
  throw new Error('Breaking changes require major version bump');
}

// Archive current version to history
const historyEntry = {
  version: currentVersion,
  manifest: app.manifest,
  publishedAt: app.updatedAt.toISOString(),
  deprecatedAt: null, // Not deprecated yet
};

const updatedHistory = [...app.manifestHistory, historyEntry];

// Update app with new manifest
await prisma.app.update({
  where: { appId: 'app_lottery_v1' },
  data: {
    manifest: newManifest,
    manifestVersion: newVersion,
    manifestHistory: updatedHistory,
  },
});
```

**Result:**
- App now has `manifestVersion: "1.1.0"`
- manifestHistory contains v1.0.0
- **Old rooms still use v1.0.0** (not affected)
- **New rooms use v1.1.0** (can use theme field)

---

### 4. Room Validation (Against Locked Version)

**Scenario:** Platform needs to validate room settings

**Platform Logic:**
```typescript
// Fetch room with app data
const room = await prisma.room.findUnique({
  where: { id: roomId },
  include: { app: true },
});

// Get manifest version locked to this room
const lockedVersion = room.appManifestVersion; // "1.0.0"

// Find the specific manifest version
let manifestToUse;

if (room.app.manifestVersion === lockedVersion) {
  // Room uses current version
  manifestToUse = room.app.manifest;
} else {
  // Room uses historical version - fetch from history
  const historicalEntry = room.app.manifestHistory.find(
    (entry) => entry.version === lockedVersion
  );

  if (!historicalEntry) {
    throw new Error(`Manifest version ${lockedVersion} not found in history`);
  }

  manifestToUse = historicalEntry.manifest;
}

// Validate settings against correct schema
const settingsSchema = manifestToUse.settings;
const isValid = validateJsonSchema(room.appSettings, settingsSchema);

if (!isValid) {
  throw new Error('Room settings invalid for manifest version');
}
```

**Result:**
- Room settings validated against v1.0.0 schema
- Even though app is now at v1.1.0
- Backward compatibility guaranteed

---

### 5. Manual Manifest Upgrade (Opt-In)

**Scenario:** Organizer wants to upgrade room to new manifest version

**Request:**
```http
POST /api/rooms/room_123/upgrade-manifest
Content-Type: application/json

{
  "targetVersion": "1.1.0"
}
```

**Platform Logic:**
```typescript
const room = await prisma.room.findUnique({
  where: { id: 'room_123' },
  include: { app: true },
});

const currentVersion = room.appManifestVersion; // "1.0.0"
const targetVersion = requestBody.targetVersion; // "1.1.0"

// Get target manifest
let targetManifest;
if (room.app.manifestVersion === targetVersion) {
  targetManifest = room.app.manifest;
} else {
  const entry = room.app.manifestHistory.find((e) => e.version === targetVersion);
  if (!entry) {
    throw new Error('Target version not found');
  }
  targetManifest = entry.manifest;
}

// Validate current settings against new schema
const settingsSchema = targetManifest.settings;
const isValid = validateJsonSchema(room.appSettings, settingsSchema);

if (!isValid) {
  // Settings need migration
  return {
    success: false,
    error: 'MIGRATION_REQUIRED',
    missingFields: getMissingFields(room.appSettings, settingsSchema),
    instructions: 'Please provide missing fields to complete upgrade',
  };
}

// Settings are compatible - upgrade room
await prisma.room.update({
  where: { id: 'room_123' },
  data: {
    appManifestVersion: targetVersion,
  },
});

return { success: true, newVersion: targetVersion };
```

**Result:**
- Room upgraded from v1.0.0 to v1.1.0
- Can now use new optional fields
- Upgrade was safe (no data loss)

---

### 6. Manifest Deprecation

**Scenario:** App wants to deprecate old version

**Request:**
```http
POST /api/apps/app_lottery_v1/deprecate-version
Content-Type: application/json

{
  "version": "1.0.0",
  "reason": "Security vulnerability fixed in v1.1.0"
}
```

**Platform Logic:**
```typescript
const app = await prisma.app.findUnique({
  where: { appId: 'app_lottery_v1' },
});

// Update history entry
const updatedHistory = app.manifestHistory.map((entry) => {
  if (entry.version === '1.0.0') {
    return {
      ...entry,
      deprecatedAt: new Date().toISOString(),
      deprecationReason: 'Security vulnerability fixed in v1.1.0',
    };
  }
  return entry;
});

await prisma.app.update({
  where: { appId: 'app_lottery_v1' },
  data: {
    manifestHistory: updatedHistory,
  },
});

// Notify organizers of affected rooms
const affectedRooms = await prisma.room.findMany({
  where: {
    appId: 'app_lottery_v1',
    appManifestVersion: '1.0.0',
    status: { in: ['DRAFT', 'ACTIVE'] },
  },
  include: { organizer: true },
});

for (const room of affectedRooms) {
  await notifyOrganizer(room.organizer, {
    type: 'MANIFEST_DEPRECATED',
    message: `Manifest v1.0.0 deprecated. Please upgrade room to v1.1.0.`,
    roomId: room.id,
  });
}
```

**Result:**
- v1.0.0 marked as deprecated
- Organizers notified
- **Rooms continue working** (not broken)
- Organizers encouraged to upgrade

---

## Migration Strategies

### Strategy 1: Automatic Migration (Minor Updates)

**Use Case:** Adding optional fields

**Example:**
```typescript
// v1.0.0 → v1.1.0 (added optional "theme" field)

async function autoMigrateToV1_1_0(roomId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });

  // Current settings already valid for v1.1.0 (theme is optional)
  // Just update version
  await prisma.room.update({
    where: { id: roomId },
    data: { appManifestVersion: '1.1.0' },
  });
}
```

**Characteristics:**
- No user intervention needed
- Settings already compatible
- Can be done in bulk

---

### Strategy 2: Assisted Migration (Interactive)

**Use Case:** Adding required fields with sensible defaults

**Example:**
```typescript
// v1.1.0 → v2.0.0 (added required "drawType" field)

async function assistedMigrateToV2_0_0(roomId: string, newFields: object) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });

  // Merge current settings with new required fields
  const migratedSettings = {
    ...room.appSettings,
    ...newFields, // { drawType: "random" }
  };

  // Validate against v2.0.0 schema
  const targetManifest = getManifestVersion('2.0.0');
  const isValid = validateJsonSchema(migratedSettings, targetManifest.settings);

  if (!isValid) {
    throw new Error('Migration failed validation');
  }

  // Update room with migrated settings
  await prisma.room.update({
    where: { id: roomId },
    data: {
      appSettings: migratedSettings,
      appManifestVersion: '2.0.0',
    },
  });
}
```

**Characteristics:**
- User provides missing fields
- Platform validates before upgrade
- Manual per-room or bulk with UI

---

### Strategy 3: Manual Migration (Breaking Changes)

**Use Case:** Field type changes, renamed fields

**Example:**
```typescript
// v2.0.0 → v3.0.0 (renamed "ticketCount" to "maxTickets")

async function manualMigrateToV3_0_0(roomId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });

  // Transform settings structure
  const oldSettings = room.appSettings;
  const newSettings = {
    maxTickets: oldSettings.ticketCount, // Rename field
    drawDate: oldSettings.drawDate,
    theme: oldSettings.theme,
  };

  // Validate
  const targetManifest = getManifestVersion('3.0.0');
  const isValid = validateJsonSchema(newSettings, targetManifest.settings);

  if (!isValid) {
    throw new Error('Migration transformation failed');
  }

  await prisma.room.update({
    where: { id: roomId },
    data: {
      appSettings: newSettings,
      appManifestVersion: '3.0.0',
    },
  });
}
```

**Characteristics:**
- Custom migration logic
- App developer provides migration script
- Potentially lossy (requires review)

---

## Validation System

### Runtime Validation Flow

```typescript
/**
 * Validate room settings against locked manifest version
 */
async function validateRoomSettings(roomId: string): Promise<ValidationResult> {
  // 1. Fetch room with app data
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { app: true },
  });

  // 2. Get manifest for room's locked version
  const manifest = await getManifestForVersion(
    room.app,
    room.appManifestVersion
  );

  // 3. Validate settings against schema
  const settingsSchema = manifest.settings;
  const result = validateJsonSchema(room.appSettings, settingsSchema);

  return {
    valid: result.valid,
    errors: result.errors,
    manifestVersion: room.appManifestVersion,
  };
}

/**
 * Get manifest for specific version
 */
function getManifestForVersion(app: App, version: string): Manifest {
  // Check if it's the current version
  if (app.manifestVersion === version) {
    return app.manifest;
  }

  // Search in history
  const entry = app.manifestHistory.find((e) => e.version === version);

  if (!entry) {
    throw new Error(`Manifest version ${version} not found`);
  }

  return entry.manifest;
}
```

### Validation on Room Create/Update

```typescript
/**
 * Validate settings before creating room
 */
async function createRoom(data: CreateRoomInput): Promise<Room> {
  // Fetch app with current manifest
  const app = await prisma.app.findUnique({
    where: { appId: data.appId },
  });

  // Validate against current manifest
  const isValid = validateJsonSchema(data.appSettings, app.manifest.settings);

  if (!isValid) {
    throw new ValidationError('Invalid appSettings for current manifest');
  }

  // Create room locked to current version
  return prisma.room.create({
    data: {
      ...data,
      appManifestVersion: app.manifestVersion, // Lock to current version
    },
  });
}
```

---

## Best Practices

### For Platform Developers

1. **Always validate against locked version**
   - Never assume current manifest version
   - Fetch correct version from history if needed

2. **Index manifest version fields**
   - Fast queries for rooms by version
   - Efficient bulk operations

3. **Store complete manifests in history**
   - Don't store diffs
   - Each entry is self-contained

4. **Provide migration tools**
   - UI for organizers to upgrade rooms
   - Bulk migration scripts for admins

5. **Monitor deprecated versions**
   - Track active rooms on old versions
   - Notify organizers proactively

### For App Developers

1. **Follow semantic versioning**
   - MAJOR for breaking changes
   - MINOR for new features
   - PATCH for bug fixes

2. **Provide migration paths**
   - Document how to migrate from old versions
   - Supply transformation scripts if needed

3. **Minimize breaking changes**
   - Add optional fields when possible
   - Deprecate before removing

4. **Test backward compatibility**
   - Ensure old rooms still work
   - Validate migration scripts

5. **Communicate changes**
   - Clear changelog
   - Migration guides
   - Deprecation notices

---

## Database Queries

### Find Rooms by Manifest Version

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
const versionCounts = await prisma.room.groupBy({
  by: ['appManifestVersion'],
  where: {
    appId: 'app_lottery_v1',
    deletedAt: null,
  },
  _count: {
    id: true,
  },
});

// Result: [
//   { appManifestVersion: '1.0.0', _count: { id: 42 } },
//   { appManifestVersion: '1.1.0', _count: { id: 18 } },
// ]
```

### Get App with Specific Version

```typescript
// Get v1.0.0 manifest from history
const app = await prisma.app.findUnique({
  where: { appId: 'app_lottery_v1' },
});

const v1_0_0_entry = app.manifestHistory.find((e) => e.version === '1.0.0');
const manifest = v1_0_0_entry.manifest;
```

### Find Rooms Needing Upgrade

```typescript
// Find rooms on deprecated versions
const roomsNeedingUpgrade = await prisma.$queryRaw`
  SELECT r.id, r.name, r."appManifestVersion"
  FROM rooms r
  JOIN apps a ON r."appId" = a."appId"
  WHERE r."appId" = 'app_lottery_v1'
    AND r."appManifestVersion" != a."manifestVersion"
    AND r."deletedAt" IS NULL
    AND r.status IN ('DRAFT', 'ACTIVE')
  ORDER BY r."createdAt" DESC
`;
```

---

## Security Considerations

1. **Prevent version rollback**
   - Don't allow downgrading manifest version
   - Would break rooms using newer features

2. **Validate version in history**
   - Ensure history entries are immutable
   - Detect tampering attempts

3. **Permission checks on upgrades**
   - Only room organizer can upgrade
   - Admin override for bulk operations

4. **Audit trail**
   - Log all manifest updates
   - Track room version upgrades

---

## Performance Optimization

### Caching Strategy

```typescript
// Cache manifests by version
const manifestCache = new Map<string, Manifest>();

function getCachedManifest(appId: string, version: string): Manifest {
  const cacheKey = `${appId}:${version}`;

  if (manifestCache.has(cacheKey)) {
    return manifestCache.get(cacheKey);
  }

  // Fetch from database
  const manifest = fetchManifestFromDB(appId, version);
  manifestCache.set(cacheKey, manifest);

  return manifest;
}
```

### Indexing

```sql
-- Efficient queries for version-specific rooms
CREATE INDEX idx_rooms_app_version ON rooms(appId, appManifestVersion);

-- Find rooms needing upgrades
CREATE INDEX idx_rooms_version ON rooms(appManifestVersion);
```

---

## Testing Checklist

- [ ] Create app with initial manifest version
- [ ] Create room locked to version
- [ ] Update manifest to new version
- [ ] Verify old room still validates against old version
- [ ] Create new room with new version
- [ ] Verify new room uses new version
- [ ] Attempt breaking change without major version bump (should fail)
- [ ] Upgrade room to new version (compatible settings)
- [ ] Attempt upgrade with incompatible settings (should fail)
- [ ] Deprecate old version
- [ ] Query rooms by version
- [ ] Fetch manifest from history
- [ ] Test migration scripts

---

## Conclusion

Manifest versioning ensures:
- **Backward compatibility** - Old rooms never break
- **Forward compatibility** - New features available immediately
- **Controlled migration** - Organizers upgrade when ready
- **Audit trail** - Complete history of manifest changes
- **Flexibility** - Apps can evolve without breaking existing rooms

This system addresses the audit concern completely and provides a robust foundation for long-term platform evolution.
