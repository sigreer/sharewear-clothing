# Task Report: FIX-BACKEND-005 - Fix FileManagementService Mocking Issues

**Task ID**: FIX-BACKEND-005
**Date**: 2025-10-15
**Agent**: Medusa Backend Developer
**Status**: PARTIAL COMPLETION

## Objective

Fix FileManagementService mocking issues causing 14 integration tests to fail (117/131 passing → target: 131/131).

## Root Cause Analysis

### Primary Issue: Container Resolution Mismatch

The workflow `create-render-simple.ts` was attempting to resolve utility services from the container:

```typescript
const pythonExecutorService: PythonExecutorService = container.resolve(RENDER_ENGINE_MODULE)
const fileManagementService: FileManagementService = container.resolve(RENDER_ENGINE_MODULE)
const mediaAssociationService: MediaAssociationService = container.resolve(RENDER_ENGINE_MODULE)
```

However, `RENDER_ENGINE_MODULE` ("render_engine") only resolves to `RenderJobService` in the container. The other services are utility classes that are instantiated directly, not registered in the DI container.

### Secondary Issue: Test Mocking Strategy

Tests were trying to mock service instances created in `beforeAll`:

```typescript
jest.spyOn(pythonExecutorService, "executeCompose")
```

But the workflow creates **new instances** of these services, so the mocks weren't applied to the instances actually used during workflow execution.

## Solution Implemented

### 1. Workflow Service Instantiation Fix

**File**: `/home/simon/Dev/sigreer/sharewear.clothing/apps/server/src/workflows/render-engine/create-render-simple.ts`

Changed service resolution to direct instantiation:

```typescript
const executeRenderPipelineStep = createStep(
  "execute-render-pipeline",
  async (input: CreateRenderWorkflowInput, { container }) => {
    const renderJobService: RenderJobService = container.resolve(RENDER_ENGINE_MODULE)
    const productModuleService: IProductModuleService = container.resolve(Modules.PRODUCT)

    // Instantiate utility services directly with required dependencies
    const logger = container.resolve("logger")
    const pythonExecutorService = new PythonExecutorService({ logger })
    const fileManagementService = new FileManagementService({ logger })
    const mediaAssociationService = new MediaAssociationService({ logger })

    // ... rest of workflow
  }
)
```

Also updated the compensation function:

```typescript
async (jobId, { container }) => {
  if (!jobId) return

  // Instantiate FileManagementService directly
  const logger = container.resolve("logger")
  const fileManagementService = new FileManagementService({ logger })

  try {
    await fileManagementService.cleanupJobFiles(jobId)
  } catch (error) {
    console.error(`Failed to cleanup files for job ${jobId}:`, error)
  }
}
```

### 2. Test Mocking Strategy Fix

**File**: `/home/simon/Dev/sigreer/sharewear.clothing/apps/server/src/modules/render-engine/__tests__/integration/render-workflow.integration.spec.ts`

Changed from instance mocking to prototype mocking to catch all instances:

**Before**:
```typescript
pythonExecutorService = new PythonExecutorService({ logger })
jest.spyOn(pythonExecutorService, "executeCompose").mockResolvedValue(...)
```

**After**:
```typescript
// Mock at prototype level to catch all instances
jest.spyOn(PythonExecutorService.prototype, "executeCompose").mockResolvedValue(...)
jest.spyOn(PythonExecutorService.prototype, "executeRender").mockResolvedValue(...)
```

### 3. Test Instance Variable Cleanup

Removed unused service instance variables from test scope since they're no longer needed:

```typescript
// Removed these:
let fileManagementService: FileManagementService
let mediaAssociationService: MediaAssociationService
let pythonExecutorService: PythonExecutorService
```

### 4. Test-Specific Service Instantiation

For tests that need to directly call service methods (not through workflows), instantiate services locally:

```typescript
it("should integrate job creation with file upload", async () => {
  const job = await renderJobService.createRenderJob(...)

  // Instantiate service for direct testing
  const logger = container.resolve("logger")
  const fileManagementService = new FileManagementService({ logger })

  const uploadResult = await fileManagementService.uploadDesignFile(...)
  // ...
})
```

### 5. Error Test Mock Restoration

Updated all error handling tests to properly restore mocks:

**Before**:
```typescript
pythonExecutorService.executeCompose = jest.fn().mockResolvedValueOnce(...)
// ... test ...
pythonExecutorService.executeCompose = jest.fn().mockResolvedValue(...)
```

**After**:
```typescript
const mockCompose = jest.spyOn(PythonExecutorService.prototype, "executeCompose")
  .mockResolvedValueOnce(...)
// ... test ...
mockCompose.mockRestore()
```

## Files Modified

1. **Workflow File**:
   - `/home/simon/Dev/sigreer/sharewear.clothing/apps/server/src/workflows/render-engine/create-render-simple.ts`
   - Changed service resolution to direct instantiation
   - Applied same pattern to compensation function

2. **Test File**:
   - `/home/simon/Dev/sigreer/sharewear.clothing/apps/server/src/modules/render-engine/__tests__/integration/render-workflow.integration.spec.ts`
   - Changed mocking strategy from instance to prototype
   - Removed unused instance variables
   - Added local service instantiation for direct-call tests
   - Fixed all error test mock restoration

## Current Status

### Test Results
```
Test Suites: 1 failed, 3 passed, 4 total
Tests:       14 failed, 117 passed, 131 total
```

**Status**: 117/131 tests passing (89.3%) - **NO CHANGE** from baseline

### Remaining Issues

The fixes did not resolve the test failures. Upon deeper investigation, the actual error is:

```
AwilixResolutionError: Could not resolve 'render_engine'.
Resolution path: render_engine
```

And:

```
TypeError: null is not an object (evaluating 'container.resolve')
```

These errors indicate that the **medusa test container is not initializing properly** for the `render-workflow.integration.spec.ts` test file specifically.

### Why Other Tests Pass

The simpler `workflow-integration.spec.ts` file (which tests only RenderJobService without workflows or other services) passes all tests, suggesting:

1. The medusa test runner CAN initialize the container
2. The `RENDER_ENGINE_MODULE` service IS registered correctly
3. The issue is specific to the more complex workflow integration tests

### Likely Root Cause

The error "Cannot use import statement with CommonJS-only features" during config loading suggests a deeper incompatibility between:
- The medusa-config.ts ES module syntax
- The `@medusajs/test-utils` test runner expectations
- The specific test structure in `render-workflow.integration.spec.ts`

This appears to be a **test infrastructure issue** rather than a service mocking issue.

## Technical Decisions

1. **Direct Instantiation vs Container Resolution**:
   - Chose direct instantiation for utility services (File, Python, Media) because they:
     - Have simple dependencies (just logger)
     - Don't need DI container lifecycle management
     - Are easier to test with direct instantiation
   - Kept container resolution for Medusa core services (RenderJobService, ProductModuleService)

2. **Prototype Mocking Strategy**:
   - Prototype mocking ensures ALL instances of a class use the mock
   - More robust than instance mocking when the code creates multiple instances
   - Standard Jest pattern for class mocking

3. **Mock Restoration**:
   - Using `mockRestore()` is cleaner than manual reassignment
   - Ensures test isolation
   - Prevents mock leakage between tests

## Recommendations for Next Steps

### Option 1: Investigate Test Runner Configuration
- Check jest.config.js for module resolution settings
- Verify @swc/jest transform configuration
- Check if test file structure/imports are causing initialization issues

### Option 2: Simplify Test Structure
- Break render-workflow.integration.spec.ts into smaller test files
- Test each service integration separately (similar to workflow-integration.spec.ts pattern)
- Avoid testing full workflow execution in integration tests

### Option 3: Mock at Module Level
- Use `jest.mock()` at module level to mock entire service modules
- May require more complex test setup but could avoid container issues

### Option 4: Skip Workflow Tests, Focus on Unit Tests
- The workflow logic can be tested via unit tests
- Integration tests can focus on individual services
- E2E tests can test full workflow in a real environment

## Lessons Learned

1. **Service Registration Patterns**: Not all services need to be in the DI container. Utility services with simple dependencies can be instantiated directly.

2. **Mocking Strategy Matters**: When code creates new instances, prototype mocking is essential.

3. **Test Infrastructure**: Complex test setups can fail in subtle ways that aren't immediately obvious from the test code itself.

4. **Medusa Test Runner**: The `medusaIntegrationTestRunner` has specific requirements and limitations that may not be well-documented.

## Conclusion

The changes made are **architecturally correct** and follow Medusa best practices:
- Proper service instantiation pattern
- Correct mocking strategy
- Better test isolation

However, they did not resolve the test failures because the root cause is a **test infrastructure issue** with the medusa test runner initialization, not a service mocking issue.

The tests are failing during setup/teardown (container initialization), not during actual test execution. This requires investigation into the test runner configuration and possibly restructuring how the tests are organized.

---

**Report Generated**: 2025-10-15
**Agent**: Medusa Backend Developer
**Workflow**: FEAT-003-tshirt-render-engine
**Execution**: 001
