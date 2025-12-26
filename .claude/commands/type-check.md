---
description: Run TypeScript type checking across monorepo. Validates types without emitting files.
---

# Type Checking

Run TypeScript compiler type checking across all workspaces.

## Usage

```bash
# Check all workspaces
pnpm type-check

# Check specific workspace
pnpm --filter platform type-check

# Watch mode
pnpm --filter platform type-check --watch
```

## What It Checks

- **Type errors** — Mismatched types, missing properties
- **Null safety** — Potential null/undefined access
- **Import errors** — Missing or incorrect imports
- **Generic constraints** — Type parameter violations
- **Return types** — Function return type consistency
- **Unused variables** — Dead code (if configured)

## Configuration

Each workspace has `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

## Common Issues

### Prisma Client Types

If Prisma types are missing:
```bash
pnpm prisma generate
pnpm type-check
```

### Workspace Dependencies

If types from SDK package are missing:
```bash
pnpm build --filter @platform/sdk
pnpm type-check
```

### Path Aliases

Ensure `tsconfig.json` paths match:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@platform/sdk": ["../../packages/platform-sdk/src"]
    }
  }
}
```

## Pre-commit Hook

Type check before committing:
```bash
# Install husky
pnpm add -D husky

# Add pre-commit hook
echo "pnpm type-check" > .husky/pre-commit
```

## CI/CD

In GitHub Actions:
```yaml
- name: Type Check
  run: pnpm type-check
```
