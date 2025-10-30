# Medusa v2 Migration Fixes - HTTP Integration Tests

**Date**: 2025-10-16
**Issue**: HTTP integration tests failing with `AwilixResolutionError: Could not resolve 'productModuleService'`
**Root Cause**: Tests using Medusa v1 service resolution patterns instead of Medusa v2 module resolution

## Problem

The HTTP integration tests were using Medusa v1 patterns for resolving services from the dependency injection container:

```typescript
// ❌ Medusa v1 pattern (incorrect)
const productModuleService = container.resolve("productModuleService")
const renderJobService = container.resolve("renderEngineModuleService")
```

In Medusa v2, services must be resolved using module identifier constants, not string names.

## Solution

Updated all three affected test files to use Medusa v2 module resolution patterns:

```typescript
// ✅ Medusa v2 pattern (correct)
import { Modules } from "@medusajs/framework/utils"
import { RENDER_ENGINE_MODULE } from "../../../src/modules/render-engine"

const productModuleService = container.resolve(Modules.PRODUCT)
const renderJobService = container.resolve(RENDER_ENGINE_MODULE)
```

## Files Modified

### 1. tests/integration/http/category-selector-api.spec.ts

**Changes**:
- Added import: `import { Modules } from "@medusajs/framework/utils"`
- Updated 5 instances of `container.resolve("productModuleService")` to `container.resolve(Modules.PRODUCT)`

**Locations**:
- Line 17: `beforeAll` hook for test setup
- Line 48: `afterAll` hook for test cleanup
- Line 401: Nested `beforeAll` for products test suite
- Line 420: Nested `afterAll` for products test suite

### 2. tests/integration/http/mega-menu-api.spec.ts

**Changes**:
- Added import: `import { Modules } from "@medusajs/framework/utils"`
- Updated 4 instances of `container.resolve("productModuleService")` to `container.resolve(Modules.PRODUCT)`

**Locations**:
- Line 16: Main `beforeAll` hook
- Line 41: Main `afterAll` hook
- Line 353: Nested `beforeAll` for products test suite
- Line 372: Nested `afterAll` for products test suite

### 3. tests/integration/http/render-jobs-api.spec.ts

**Changes**:
- Added imports:
  - `import { Modules } from "@medusajs/framework/utils"`
  - `import { RENDER_ENGINE_MODULE } from "../../../src/modules/render-engine"`
- Updated 2 instances of `container.resolve("productModuleService")` to `container.resolve(Modules.PRODUCT)`
- Updated 7 instances of `container.resolve("renderEngineModuleService")` to `container.resolve(RENDER_ENGINE_MODULE)`

**Locations**:
- Line 35: Product module in main `beforeAll`
- Line 49: Product module in main `afterAll`
- Line 59: Render engine module in cleanup
- Line 356: Render engine module in GET /admin/render-jobs/[id] test
- Line 425: Render engine module in DELETE test
- Line 447: Render engine module in DELETE verification test
- Line 470: Render engine module in retry test setup
- Line 498: Render engine module in retry validation test
- Line 542: Render engine module in product render jobs list test

## Key Differences: Medusa v1 vs v2

| Aspect | Medusa v1 | Medusa v2 |
|--------|-----------|-----------|
| Built-in modules | `container.resolve("productModuleService")` | `container.resolve(Modules.PRODUCT)` |
| Custom modules | `container.resolve("customModuleService")` | `container.resolve(MODULE_CONSTANT)` |
| Import source | N/A | `@medusajs/framework/utils` for built-in modules |

## Module Constants Reference

### Built-in Medusa Modules
Available from `@medusajs/framework/utils`:

```typescript
import { Modules } from "@medusajs/framework/utils"

Modules.PRODUCT          // Product module
Modules.CART             // Cart module
Modules.ORDER            // Order module
Modules.CUSTOMER         // Customer module
Modules.PAYMENT          // Payment module
Modules.FULFILLMENT      // Fulfillment module
Modules.INVENTORY        // Inventory module
Modules.STOCK_LOCATION   // Stock location module
Modules.WORKFLOW_ENGINE  // Workflow engine module
// ... and more
```

### Custom Modules
Must export a module constant:

```typescript
// src/modules/render-engine/types.ts
export const RENDER_ENGINE_MODULE = "render_engine"

// src/modules/render-engine/index.ts
export default Module(RENDER_ENGINE_MODULE, {
  service: RenderEngineService,
  loaders: [renderQueueWorkerLoader]
})

// In tests
import { RENDER_ENGINE_MODULE } from "../../../src/modules/render-engine"
const renderJobService = container.resolve(RENDER_ENGINE_MODULE)
```

## Impact

This fix resolves the `AwilixResolutionError` that prevented HTTP integration tests from running. The tests now correctly resolve services using Medusa v2 patterns, allowing proper dependency injection during test execution.

## Related Documentation

- Medusa v2 Module Architecture: See `MEDUSA_DOCS.md` for complete module system documentation
- Custom Modules: See `src/modules/render-engine/` for example custom module implementation
- Testing Patterns: See `TEST_ORGANIZATION.md` for test structure guidelines
