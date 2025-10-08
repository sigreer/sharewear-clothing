# Product Export Workflow Fix

## Issue
Product export downloads were failing with 404 errors due to duplicate timestamp prefixes in filenames.

## Root Cause
The default Medusa `generateProductCsvStep` in `@medusajs/core-flows` does not specify an `access` level when creating export files. This causes `LocalFileService` to add a `private-{timestamp}-` prefix to the already timestamped filename (e.g., `{timestamp}-product-exports.csv`), resulting in:
- Actual file: `private-{timestamp1}-{timestamp2}-product-exports.csv`
- Expected URL: `{timestamp2}-product-exports.csv`
- Result: 404 error when downloading

## Solution
This directory contains a custom implementation of the product export workflow that fixes the issue:

### Files
- **`steps/generate-product-csv.ts`**: Custom step that sets `access: "public"` when creating CSV files
- **`export-products.ts`**: Custom workflow with unique ID (`custom-export-products`)
- **`index.ts`**: Exports for the custom workflow

### Key Change
```typescript
const file = await fileModule.createFiles({
  filename,
  mimeType: "text/csv",
  content: csvContent,
  access: "public", // Prevents duplicate timestamp prefix
})
```

## Custom Workflow ID
**Important**: This workflow uses ID `custom-export-products` (NOT `export-products`) to avoid conflicts with the core Medusa workflow. Medusa v2 does not support workflow replacement via same-ID registration - attempting to use the same ID causes a duplicate workflow error on server startup.

## Usage

### Option 1: Custom API Endpoint (Recommended)
Use the custom API endpoint that calls the fixed workflow:

```bash
POST /admin/products/export
Content-Type: application/json
Authorization: Bearer YOUR_ADMIN_TOKEN

{
  "filters": {
    "collection_id": "pcol_123",  // Optional
    "status": ["published"]         // Optional
  },
  "select": ["*"]  // Optional field selection
}
```

**Response** (202 Accepted):
```json
{
  "message": "Product export started successfully",
  "workflow_id": "wf_123abc"
}
```

The workflow executes asynchronously and sends an admin notification with the download link when complete.

### Option 2: Programmatic Usage
Call the workflow directly from code:

```typescript
import { exportProductsWorkflow } from "./workflows/product/export-products"

const { result } = await exportProductsWorkflow(container).run({
  input: {
    select: ["*"],
    filters: {
      collection_id: "pcol_123"
    }
  }
})
```

### Option 3: Admin UI Export Button (NOT Fixed)
The standard Admin UI export button still calls the core `export-products` workflow, which has the duplicate timestamp issue. For reliable exports, use Option 1 (custom API endpoint).

**Future Enhancement**: Create an Admin UI extension to override the export button and call the custom endpoint.

## Testing the Fix
To verify the custom endpoint works:

```bash
# 1. Start the backend server
cd apps/server
bun run dev

# 2. Get admin authentication token (login via Admin UI first)
# Then use the token in the request:

# 3. Call the custom export endpoint
curl -X POST http://localhost:9000/admin/products/export \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"filters": {}, "select": ["*"]}'

# 4. Check admin notifications for download link
# 5. Verify filename has no duplicate timestamp prefix
# 6. Confirm file downloads without 404 error
```

## Implementation Notes
- This fix copies the entire workflow implementation from `@medusajs/core-flows` to ensure compatibility
- Helper functions (`normalizeForExport`, `convertJsonToCsv`) are included since they're not exported from the core package
- The workflow maintains the same functionality as the original, only adding the `access: "public"` parameter
- Export files are meant for authenticated admin users, so public access level is appropriate
- Custom API endpoint provides a clean integration point without modifying core Medusa code

## Future Considerations
1. **Admin UI Extension**: Create a custom export button widget that calls the custom endpoint
2. **Core Workflow Monitoring**: Watch for Medusa updates that might fix the core workflow
3. **Compatibility**: Update custom workflow if core implementation changes significantly
4. **Testing**: Add integration tests for the custom export endpoint
