# Application Manifest Specification

## Overview

The application manifest is a JSON document that declares an application's metadata, capabilities, permissions, and settings schema. It serves as the contract between the platform and the application.

## Purpose

- **Declare capabilities** - What platform functions the app can override
- **Request permissions** - What API operations the app needs
- **Define settings** - User-configurable settings with validation
- **Enable discovery** - Metadata for marketplace/directory
- **Security** - Explicit permission model prevents unauthorized access

---

## Manifest Structure

```json
{
  "meta": {
    "name": "string (required)",
    "version": "string (required, semver)",
    "description": "string (required)",
    "author": "string (optional)",
    "homepage": "string (optional, URL)",
    "icon": "string (optional, URL)"
  },
  "baseUrl": "string (required, URL)",
  "capabilities": ["string", "..."],
  "permissions": ["string", "..."],
  "webhooks": {
    "capability_name": "/path/to/endpoint"
  },
  "settings": {
    "type": "object",
    "properties": { /* JSON Schema */ }
  }
}
```

---

## Field Specifications

### `meta` (required)

Application metadata for display and discovery.

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Display name (max 100 chars) |
| `version` | string | Yes | Semantic version (e.g., "1.2.3") |
| `description` | string | Yes | Short description (max 500 chars) |
| `author` | string | No | Author/organization name |
| `homepage` | string (URL) | No | Application website |
| `icon` | string (URL) | No | Icon image (PNG/SVG, 256x256px) |

**Example:**
```json
{
  "meta": {
    "name": "Holiday Lottery",
    "version": "1.0.0",
    "description": "Application for conducting lotteries with themed decorations",
    "author": "Platform Team",
    "homepage": "https://lottery.example.com",
    "icon": "https://lottery.example.com/icon.png"
  }
}
```

---

### `baseUrl` (required)

Base URL of the application's backend service. Platform uses this for webhook callbacks.

**Format:** Valid HTTPS URL (HTTP allowed for localhost development)

**Example:**
```json
{
  "baseUrl": "https://lottery.example.com"
}
```

**Usage:**
Platform constructs webhook URLs by appending webhook paths:
```
{baseUrl}{webhooks[capability]}
```

Example: `https://lottery.example.com/api/platform/winner-selection`

---

### `capabilities` (optional)

List of platform functions the application can override (delegate).

**Available Capabilities:**

| Capability | Description | Webhook Required |
|------------|-------------|------------------|
| `prizeFund` | Override prize fund management UI | No |
| `participantRegistration` | Custom participant registration flow | Yes |
| `winnerSelection` | Custom winner selection algorithm | Yes |
| `notifications` | Custom notification system | Yes |
| `roomSettings` | Custom room settings UI | No |

**Example:**
```json
{
  "capabilities": ["winnerSelection", "participantRegistration"]
}
```

**Notes:**
- Empty array means no delegation
- Capabilities require corresponding permissions
- Platform validates capability support before delegating

---

### `permissions` (required)

List of API permissions the application needs.

**Available Permissions:**

| Permission | Scope | Description |
|-----------|-------|-------------|
| `users:read` | GET | Read user profiles |
| `rooms:read` | GET | Read room data |
| `rooms:write` | POST/PATCH/DELETE | Create/modify/delete rooms |
| `participants:read` | GET | Read participant lists |
| `participants:write` | POST/PATCH/DELETE | Add/modify/remove participants |
| `prizes:read` | GET | Read prize data |
| `prizes:write` | POST/PATCH/DELETE | Create/modify/delete prizes |
| `winners:read` | GET | Read winner data |
| `winners:write` | POST/DELETE | Select/remove winners |
| `realtime:subscribe` | WebSocket | Subscribe to room events |
| `realtime:publish` | WebSocket | Publish custom events |

**Example:**
```json
{
  "permissions": [
    "users:read",
    "rooms:read",
    "rooms:write",
    "participants:read",
    "participants:write",
    "prizes:read",
    "prizes:write",
    "winners:write",
    "realtime:subscribe",
    "realtime:publish"
  ]
}
```

**Permission Validation:**
- Platform checks permissions before allowing API calls
- Apps with app tokens can only perform allowed operations
- Insufficient permissions return `403 APP_PERMISSION_DENIED`

---

### `webhooks` (optional)

Map of capability names to webhook endpoint configurations.

**Format (Simple):**
```json
{
  "webhooks": {
    "capability_name": "/path/to/endpoint"
  }
}
```

**Format (Advanced with Timeout & Retry):**
```json
{
  "webhooks": {
    "capability_name": {
      "path": "/path/to/endpoint",
      "timeout": 5000,
      "async": false,
      "retry": {
        "enabled": false,
        "maxAttempts": 1
      }
    }
  }
}
```

**Example (Mixed):**
```json
{
  "webhooks": {
    "winnerSelection": {
      "path": "/api/platform/winner-selection",
      "timeout": 5000,
      "async": false,
      "retry": {
        "enabled": false
      }
    },
    "participantRegistration": {
      "path": "/api/platform/participant-registration",
      "timeout": 3000,
      "async": false
    },
    "analytics": {
      "path": "/api/platform/analytics",
      "timeout": 30000,
      "async": true,
      "retry": {
        "enabled": true,
        "maxAttempts": 3,
        "backoff": "exponential"
      }
    }
  }
}
```

**Webhook Configuration:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `path` | string | Yes | - | Webhook endpoint path |
| `timeout` | integer | No | 10000 | Maximum response time in milliseconds |
| `async` | boolean | No | false | If true, platform queues job and doesn't wait for response |
| `retry.enabled` | boolean | No | false | Enable automatic retries on failure |
| `retry.maxAttempts` | integer | No | 3 | Maximum retry attempts (async only) |
| `retry.backoff` | string | No | "exponential" | Backoff strategy: "exponential" or "linear" |

**Recommended Timeouts by Capability:**

| Capability | Timeout | Rationale |
|------------|---------|-----------|
| `winnerSelection` (sync) | 5000ms | Live draw ceremony can tolerate brief delay |
| `participantRegistration` | 3000ms | Standard web form submission expectation |
| `notifications` (async) | 30000ms | Can process in background |
| `analytics` (async) | 30000ms | Non-critical, background processing |

**Webhook Security:**
Platform includes HMAC signature in `X-Platform-Signature` header:
```
HMAC-SHA256(body, appSecret)
```

Applications must verify signature before processing.

**Resilience:** See [Webhook Resilience Documentation](./webhook-resilience.md) for details on:
- Timeout handling
- Circuit breaker patterns
- Fallback strategies
- Retry logic
- Dead letter queues

---

### `settings` (optional)

JSON Schema defining user-configurable settings for rooms using this application.

**Purpose:**
- Platform generates settings UI automatically
- Validates settings on room creation/update
- Passes validated settings to app in `room.appSettings`

**Example:**
```json
{
  "settings": {
    "type": "object",
    "properties": {
      "ticketCount": {
        "type": "integer",
        "title": "Number of Tickets",
        "description": "Total tickets available for the lottery",
        "minimum": 1,
        "maximum": 10000,
        "default": 100
      },
      "drawDate": {
        "type": "string",
        "format": "date-time",
        "title": "Draw Date",
        "description": "When the lottery draw will take place"
      },
      "theme": {
        "type": "string",
        "title": "Theme",
        "enum": ["new-year", "christmas", "birthday", "generic"],
        "default": "generic"
      },
      "autoNotify": {
        "type": "boolean",
        "title": "Auto-notify Winners",
        "description": "Automatically send notifications to winners",
        "default": true
      }
    },
    "required": ["ticketCount", "drawDate"]
  }
}
```

**Supported JSON Schema Features:**
- **Types:** string, number, integer, boolean, object, array
- **Formats:** date-time, email, uri, etc.
- **Validation:** minimum, maximum, minLength, maxLength, pattern, enum
- **Metadata:** title, description, default
- **Required fields:** `required` array

**Platform generates UI based on schema:**
- Text inputs for strings
- Number inputs for integers/numbers
- Checkboxes for booleans
- Date pickers for date-time format
- Dropdowns for enums
- Nested forms for objects

---

## Complete Examples

### Lottery Application

```json
{
  "meta": {
    "name": "Holiday Lottery",
    "version": "1.0.0",
    "description": "Application for conducting lotteries with themed decorations and prizes",
    "author": "Platform Team",
    "homepage": "https://lottery.example.com",
    "icon": "https://lottery.example.com/icon.png"
  },
  "baseUrl": "https://lottery.example.com",
  "capabilities": [
    "winnerSelection"
  ],
  "permissions": [
    "users:read",
    "rooms:read",
    "rooms:write",
    "participants:read",
    "participants:write",
    "prizes:read",
    "prizes:write",
    "winners:write",
    "realtime:subscribe",
    "realtime:publish"
  ],
  "webhooks": {
    "winnerSelection": "/api/platform/winner-selection"
  },
  "settings": {
    "type": "object",
    "properties": {
      "ticketCount": {
        "type": "integer",
        "title": "Number of Tickets",
        "description": "Total tickets available",
        "minimum": 1,
        "maximum": 10000,
        "default": 100
      },
      "drawDate": {
        "type": "string",
        "format": "date-time",
        "title": "Draw Date",
        "description": "When the draw will take place"
      },
      "theme": {
        "type": "string",
        "title": "Theme",
        "enum": ["new-year", "christmas", "birthday", "generic"],
        "default": "generic"
      },
      "allowMultipleWins": {
        "type": "boolean",
        "title": "Allow Multiple Wins",
        "description": "Can a participant win multiple prizes?",
        "default": false
      }
    },
    "required": ["ticketCount", "drawDate"]
  }
}
```

### Quiz Application

```json
{
  "meta": {
    "name": "Quiz: Who's First?",
    "version": "1.0.0",
    "description": "Real-time quiz game where speed matters",
    "author": "Platform Team",
    "homepage": "https://quiz.example.com",
    "icon": "https://quiz.example.com/icon.png"
  },
  "baseUrl": "https://quiz.example.com",
  "capabilities": [
    "winnerSelection",
    "roomSettings"
  ],
  "permissions": [
    "users:read",
    "rooms:read",
    "rooms:write",
    "participants:read",
    "participants:write",
    "prizes:read",
    "winners:write",
    "realtime:subscribe",
    "realtime:publish"
  ],
  "webhooks": {
    "winnerSelection": "/api/platform/winner-selection"
  },
  "settings": {
    "type": "object",
    "properties": {
      "questionCount": {
        "type": "integer",
        "title": "Number of Questions",
        "minimum": 1,
        "maximum": 100,
        "default": 10
      },
      "timePerQuestion": {
        "type": "integer",
        "title": "Time per Question (seconds)",
        "minimum": 5,
        "maximum": 120,
        "default": 10
      },
      "difficulty": {
        "type": "string",
        "title": "Difficulty",
        "enum": ["easy", "medium", "hard"],
        "default": "medium"
      },
      "category": {
        "type": "string",
        "title": "Category",
        "enum": ["general", "science", "history", "sports", "entertainment"],
        "default": "general"
      },
      "showLeaderboard": {
        "type": "boolean",
        "title": "Show Live Leaderboard",
        "default": true
      }
    },
    "required": ["questionCount", "timePerQuestion"]
  }
}
```

### Simple Application (No Delegation)

```json
{
  "meta": {
    "name": "Prize Display Widget",
    "version": "1.0.0",
    "description": "Beautiful prize gallery widget for events"
  },
  "baseUrl": "https://prizes.example.com",
  "capabilities": [],
  "permissions": [
    "prizes:read",
    "realtime:subscribe"
  ],
  "settings": {
    "type": "object",
    "properties": {
      "layout": {
        "type": "string",
        "title": "Layout",
        "enum": ["grid", "carousel", "list"],
        "default": "grid"
      },
      "itemsPerRow": {
        "type": "integer",
        "title": "Items per Row",
        "minimum": 1,
        "maximum": 6,
        "default": 3
      }
    }
  }
}
```

---

## Validation Rules

### Platform Validation

When manifest is registered or updated:

1. **Structure validation**
   - All required fields present
   - Valid JSON structure
   - Valid JSON Schema for settings

2. **URL validation**
   - `baseUrl` is valid HTTPS (or HTTP for localhost)
   - Icon URL is accessible (if provided)
   - Homepage URL is valid (if provided)

3. **Version validation**
   - Follows semver format (e.g., "1.2.3")
   - New version > previous version (for updates)

4. **Capability validation**
   - All capabilities are supported
   - Webhooks defined for required capabilities

5. **Permission validation**
   - All permissions are valid
   - No duplicate permissions

6. **Settings schema validation**
   - Valid JSON Schema Draft 7
   - Reasonable constraints (no infinite nesting)

### Common Errors

**Invalid manifest:**
```json
{
  "error": {
    "code": "INVALID_MANIFEST",
    "message": "Manifest validation failed",
    "details": {
      "fields": {
        "meta.version": ["Invalid semver format"],
        "baseUrl": ["Must be HTTPS URL"],
        "permissions": ["Unknown permission: invalid:perm"]
      }
    }
  }
}
```

---

## Webhook Specifications

### Winner Selection Webhook

**Platform → App:**
```http
POST {baseUrl}{webhooks.winnerSelection.path}
Content-Type: application/json
X-Platform-Signature: sha256=abc123...
X-Request-ID: req_unique_123
X-Timeout-Ms: 5000
X-Retry-Attempt: 1
X-Max-Attempts: 1

{
  "roomId": "room_xyz789",
  "participants": [
    {
      "id": "part_123abc",
      "userId": "usr_abc123",
      "metadata": { /* ... */ }
    }
  ],
  "prizes": [
    {
      "id": "prize_def456",
      "name": "Grand Prize",
      "quantityRemaining": 1
    }
  ],
  "appSettings": { /* room.appSettings */ },
  "requestId": "req_unique_123"
}
```

**App → Platform (Success):**
```json
{
  "success": true,
  "data": {
    "winners": [
      {
        "participantId": "part_123abc",
        "prizeId": "prize_def456",
        "metadata": {
          "algorithm": "random",
          "drawNumber": 1
        }
      }
    ]
  },
  "processingTime": 1243
}
```

**App → Platform (Error):**
```json
{
  "success": false,
  "error": {
    "code": "PROCESSING_ERROR",
    "message": "Failed to select winners",
    "retryable": false
  }
}
```

**Platform validates:**
- All participants exist in room
- All prizes exist and have remaining quantity
- No duplicate participant-prize pairs
- Creates winner records and broadcasts events

**Timeout Handling:**
- If app doesn't respond within timeout (default 5000ms)
- Platform falls back to default random selection
- Organizer notified of fallback
- Incident logged for monitoring

---

## Manifest Versioning

### Version Requirements

**All manifests MUST include semantic version in `meta.version`:**
- Format: `MAJOR.MINOR.PATCH` (e.g., "1.2.3")
- **MAJOR** - Breaking changes (incompatible schema changes)
- **MINOR** - New features (backward-compatible additions)
- **PATCH** - Bug fixes (no schema changes)

**Platform behavior:**
- Extracts `meta.version` and stores in `App.manifestVersion`
- Archives previous versions in `App.manifestHistory`
- Locks rooms to `appManifestVersion` at creation time
- Validates room settings against locked version (not current version)

**Example:**
```json
{
  "meta": {
    "name": "Holiday Lottery",
    "version": "1.2.3",  // REQUIRED: Semantic version
    "description": "..."
  }
}
```

### Version Locking

**How it works:**

1. **App Registration (v1.0.0):**
   - Platform stores manifest with `manifestVersion: "1.0.0"`
   - `manifestHistory` is empty `[]`

2. **Room Creation:**
   - Room locked to current version: `appManifestVersion: "1.0.0"`
   - Settings validated against v1.0.0 schema
   - Room will **always** use v1.0.0 schema (even after app updates)

3. **Manifest Update (v1.1.0):**
   - Platform archives v1.0.0 to `manifestHistory`
   - Updates `manifestVersion: "1.1.0"`
   - **Old rooms still use v1.0.0** (not affected)
   - **New rooms use v1.1.0** (new features available)

4. **Validation:**
   - Platform fetches manifest for room's locked version
   - If locked version is in history, fetch from `manifestHistory`
   - Validate settings against correct schema version

**Benefits:**
- Old rooms never break when app updates
- New features available immediately for new rooms
- Organizers can upgrade rooms when ready (opt-in)
- Complete version history preserved

See `platform/prisma/MANIFEST_VERSIONING.md` for complete details.

---

## Manifest Updates

### Updating Existing App

```http
PATCH /api/apps/{appId}
Authorization: Bearer {adminToken}
Content-Type: application/json

{
  "manifest": {
    "meta": {
      "name": "Holiday Lottery",
      "version": "1.1.0",  // MUST increment from current version
      "description": "..."
    },
    // ... rest of updated manifest
  }
}
```

**Platform Processing:**

1. **Extract new version:** `newVersion = manifest.meta.version` ("1.1.0")
2. **Validate version increment:** `newVersion > currentVersion`
3. **Archive current version:**
   ```json
   {
     "version": "1.0.0",
     "manifest": { /* complete v1.0.0 manifest */ },
     "publishedAt": "2025-01-15T10:00:00Z",
     "deprecatedAt": null
   }
   ```
4. **Update app:**
   - `manifest` = new manifest
   - `manifestVersion` = "1.1.0"
   - `manifestHistory` = [...history, archived v1.0.0]

**Update Rules:**
1. **Version must increment (semver)**
   - "1.0.0" → "1.1.0" ✓
   - "1.0.0" → "1.0.0" ✗ (no change)
   - "1.1.0" → "1.0.0" ✗ (downgrade not allowed)

2. **Cannot remove capabilities used by active rooms**
   - Check if any active rooms use removed capabilities
   - Return error with affected room count

3. **Cannot remove permissions used by active operations**
   - Apps may depend on these permissions
   - Deprecate first, remove later

4. **Settings schema changes:**
   - **Can add optional fields** (minor version bump)
   - **Can add required fields with defaults** (minor version bump, provide migration)
   - **Cannot remove required fields** (major version bump, breaking change)
   - **Cannot change field types** (major version bump, breaking change)

**Breaking Changes:**
If breaking changes needed:
1. **Increment major version** (1.x.x → 2.0.0)
2. **Document changes** (changelog, migration guide)
3. **Notify organizers** (email, in-app notification)
4. **Provide migration path** (upgrade script, manual steps)
5. **Set deprecation timeline** (e.g., 90 days)
6. **Deprecate old version** (mark in history)

---

## Best Practices

### Manifest Design

1. **Request minimal permissions**
   - Only request what you actually need
   - More permissions = more security review

2. **Version properly**
   - Follow semantic versioning
   - Major: breaking changes
   - Minor: new features
   - Patch: bug fixes

3. **Settings schema**
   - Provide sensible defaults
   - Add helpful descriptions
   - Use validation to prevent invalid configs
   - Keep it simple - don't overwhelm users

4. **Capability selection**
   - Only delegate what you can do better
   - Document delegation behavior clearly
   - Provide fallback for platform functions

### Security

1. **Verify webhook signatures**
   - Always validate `X-Platform-Signature`
   - Prevents unauthorized calls

2. **Validate all inputs**
   - Don't trust webhook data blindly
   - Check constraints and business logic

3. **HTTPS only**
   - Use HTTPS for production `baseUrl`
   - Secure transmission of sensitive data

4. **Secret management**
   - Store `appSecret` securely (env vars)
   - Never commit to version control
   - Rotate if compromised

### Testing

1. **Validate manifest**
   - Use `/manifest-validate` command
   - Test settings schema with UI generator

2. **Test webhooks**
   - Mock platform calls during development
   - Test signature verification
   - Handle errors gracefully

3. **Test permissions**
   - Verify API calls work with granted permissions
   - Test denial for missing permissions

---

## Manifest Validation Command

Use the platform command to validate manifest:

```bash
/manifest-validate path/to/manifest.json
```

**Output:**
```
✓ Manifest structure valid
✓ Version format: 1.0.0 (semver)
✓ Base URL: https://lottery.example.com (HTTPS)
✓ Capabilities: winnerSelection (webhook defined)
✓ Permissions: 9 permissions (all valid)
✓ Settings schema: valid JSON Schema Draft 7

Manifest is valid and ready for registration!
```

---

## Room Manifest Upgrade

### Upgrading Room to New Manifest Version

Organizers can upgrade rooms to newer manifest versions (opt-in).

**Request:**
```http
POST /api/rooms/{roomId}/upgrade-manifest
Authorization: Bearer {userToken}
Content-Type: application/json

{
  "targetVersion": "1.1.0"
}
```

**Platform Processing:**

1. **Permission check:** User must be room organizer
2. **Fetch target manifest:**
   - From current manifest if `targetVersion === app.manifestVersion`
   - From `manifestHistory` if older version
3. **Validate compatibility:**
   - Check if current settings valid against new schema
   - Identify missing required fields
4. **Upgrade or request migration:**
   - If compatible: upgrade immediately
   - If incompatible: return migration requirements

**Response (Compatible):**
```json
{
  "success": true,
  "data": {
    "newVersion": "1.1.0",
    "previousVersion": "1.0.0",
    "upgradeDate": "2025-01-20T15:30:00Z"
  }
}
```

**Response (Incompatible - Migration Required):**
```json
{
  "success": false,
  "error": {
    "code": "MIGRATION_REQUIRED",
    "message": "Room settings incompatible with target version",
    "details": {
      "targetVersion": "2.0.0",
      "currentVersion": "1.0.0",
      "missingFields": [
        {
          "field": "drawType",
          "type": "string",
          "required": true,
          "description": "Type of draw algorithm"
        }
      ],
      "instructions": "Please provide missing fields to complete upgrade"
    }
  }
}
```

**With Migration Data:**
```http
POST /api/rooms/{roomId}/upgrade-manifest
Content-Type: application/json

{
  "targetVersion": "2.0.0",
  "migrationData": {
    "drawType": "random"  // Provide missing required field
  }
}
```

**Platform Processing:**
1. Merge `migrationData` with existing `appSettings`
2. Validate merged settings against target schema
3. Update room with new settings and version

---

## Migration Guide

### Updating from v1.0 to v2.0

If making breaking changes:

1. **Create new manifest version**
   ```json
   {
     "meta": { "version": "2.0.0" }
   }
   ```

2. **Document breaking changes**
   - List removed/changed capabilities
   - List removed/changed permissions
   - List settings schema changes

3. **Provide migration path**
   - Document required field additions
   - Provide migration script for apps
   - Supply default values when possible
   - Clear migration instructions for organizers

4. **Notify users**
   - Email organizers of affected rooms
   - In-app notification with upgrade link
   - Migration deadline (e.g., 90 days)
   - Link to migration guide

5. **Deprecate old version**
   ```http
   POST /api/apps/{appId}/deprecate-version
   Content-Type: application/json

   {
     "version": "1.0.0",
     "reason": "Security fixes in v2.0.0",
     "deadline": "2025-04-01T00:00:00Z"
   }
   ```

### Example Migration Scenario

**v1.0.0 Schema:**
```json
{
  "settings": {
    "properties": {
      "ticketCount": { "type": "integer", "minimum": 1 }
    },
    "required": ["ticketCount"]
  }
}
```

**v2.0.0 Schema (Breaking Change):**
```json
{
  "settings": {
    "properties": {
      "ticketCount": { "type": "integer", "minimum": 1 },
      "drawType": { "type": "string", "enum": ["random", "sequential"] }
    },
    "required": ["ticketCount", "drawType"]  // Added required field
  }
}
```

**Migration Steps:**

1. **App developer updates manifest to v2.0.0**
2. **Platform archives v1.0.0** to manifestHistory
3. **Old rooms remain on v1.0.0** (continue working)
4. **New rooms created with v2.0.0** (must provide drawType)
5. **Organizers notified** about upgrade availability
6. **Organizers upgrade rooms:**
   - View upgrade UI
   - Provide drawType value
   - Platform validates and upgrades
7. **After deadline:** Platform may auto-upgrade with defaults or restrict old version features

---

## Appendix: JSON Schema Reference

For settings validation, platform supports JSON Schema Draft 7.

**Common patterns:**

**Text input:**
```json
{
  "type": "string",
  "minLength": 1,
  "maxLength": 255
}
```

**Number range:**
```json
{
  "type": "integer",
  "minimum": 1,
  "maximum": 100
}
```

**Dropdown:**
```json
{
  "type": "string",
  "enum": ["option1", "option2", "option3"]
}
```

**Date picker:**
```json
{
  "type": "string",
  "format": "date-time"
}
```

**Checkbox:**
```json
{
  "type": "boolean"
}
```

**Nested object:**
```json
{
  "type": "object",
  "properties": {
    "field1": { "type": "string" },
    "field2": { "type": "integer" }
  }
}
```

**Array:**
```json
{
  "type": "array",
  "items": { "type": "string" },
  "minItems": 1,
  "maxItems": 10
}
```

See [JSON Schema documentation](https://json-schema.org/) for complete reference.
