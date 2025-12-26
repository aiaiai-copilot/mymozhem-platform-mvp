---
description: Validate application manifest structure. Ensures app manifests conform to schema.
---

# Manifest Validation

Validate application manifest JSON against schema.

## Usage

```bash
# Validate single manifest
pnpm run validate:manifest apps/lottery/manifest.json

# Validate all apps
pnpm run validate:manifests

# Check manifest in code
node scripts/validate-manifest.js <path-to-manifest.json>
```

## Manifest Schema

Location: `packages/sdk/schemas/manifest.schema.json`

Required fields:
- `meta` — name, version, description
- `baseUrl` — application URL
- `capabilities` — delegatable functions
- `permissions` — required API permissions
- `settings` — JSON Schema for app config

## Validation Rules

### Meta
- [ ] `name` is non-empty string
- [ ] `version` follows semver (e.g., "1.0.0")
- [ ] `description` under 200 characters

### Base URL
- [ ] Valid HTTPS URL (or HTTP for localhost)
- [ ] Responds to health check

### Capabilities
- [ ] Only known capabilities: `prizeFund`, `participantRegistration`, `winnerSelection`, `notifications`, `roomSettings`
- [ ] No duplicates

### Permissions
- [ ] Valid permission format: `resource:action`
- [ ] Supported permissions: `users:read`, `rooms:read`, `rooms:write`, `participants:read`, `participants:write`, `prizes:read`, `prizes:write`, `realtime:subscribe`
- [ ] Permissions match capabilities (e.g., `winnerSelection` needs `winners:write`)

### Settings
- [ ] Valid JSON Schema
- [ ] All properties have `type` and `description`
- [ ] No `additionalProperties` unless explicitly allowed

## Example Validation

```typescript
import { validateManifest } from '@platform/sdk';

const manifest = await fetch('https://app.example.com/manifest.json');
const result = validateManifest(manifest);

if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

## Registration

After validation:
```bash
# Register app in platform
pnpm run app:register apps/lottery/manifest.json
```
