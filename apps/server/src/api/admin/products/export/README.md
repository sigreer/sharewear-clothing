# Custom Product Export API

## Overview

This custom product export endpoint provides a working alternative to the default Medusa product export functionality. It addresses file naming and workflow execution issues while providing a synchronous export experience.

## Endpoint

```
POST /admin/products/export
```

**Authentication:** Required (Admin Bearer Token)

### Request Body

```json
{
  "filters": {},
  "select": ["*"]
}
```

- `filters`: Object containing product filters (optional, defaults to `{}`)
- `select`: Array of fields to include in export (optional, defaults to `["*"]`)

### Response (200 OK)

```json
{
  "message": "Product export completed successfully",
  "file": {
    "id": "1759607927313-product-exports.csv",
    "filename": "product-exports.csv",
    "url": "http://sharewear.local:9000/static/1759607927313-product-exports.csv",
    "mimeType": "text/csv"
  },
  "transaction_id": "auto-01K6RCWCG42CC90V27QMH7C88E"
}
```

## Implementation Details

### Custom Workflow (`custom-export-products`)

The custom workflow is located at `apps/server/src/workflows/product/export-products.ts` and includes:

1. **Product Retrieval**: Uses `getAllProductsStep` to fetch products matching filters
2. **CSV Generation**: Custom `generateProductCsvStep` that sets `access: "public"` to prevent file naming issues
3. **File Details**: Fetches file metadata including download URL
4. **No Notifications**: Unlike the default Medusa workflow, this does not use admin UI notifications (which require a feed channel provider)

### Key Fixes Applied

#### 1. Notification Provider Issue

**Problem:** The default Medusa export workflow uses `sendNotificationsStep` with `channel: "feed"`, but no notification provider is configured for the "feed" channel, causing workflow failures.

**Solution:** Removed all notification steps from the workflow. The API endpoint returns file information directly in the response instead.

#### 2. Filename Duplication

**Problem:** The file module automatically adds a timestamp prefix to filenames. If the workflow also adds a timestamp, you get duplicates like `1759607827196-1759607827196-product-exports.csv`.

**Solution:** Removed manual timestamp from filename in `generateProductCsvStep`. Let the file module handle timestamping automatically, resulting in clean filenames like `1759607927313-product-exports.csv`.

**File:** `apps/server/src/workflows/product/steps/generate-product-csv.ts`
```typescript
// Don't add timestamp to filename - the file module will add it automatically
const filename = "product-exports.csv"

const file = await fileModule.createFiles({
  filename,
  mimeType: "text/csv",
  content: csvContent,
  access: "public", // Prevents "private-" prefix
})
```

#### 3. Synchronous Execution

**Problem:** The default workflow uses `backgroundExecution: true`, but no background worker is configured, so the workflow never executes.

**Solution:** Remove async/background execution configuration. The workflow now runs synchronously, which is appropriate for small to medium product catalogs.

**File:** `apps/server/src/workflows/product/export-products.ts`
```typescript
// Synchronous execution - no .config({ async: true, backgroundExecution: true })
const products = getAllProductsStep(input)
```

## Usage Examples

### Basic Export (All Products)

```bash
curl -X POST 'http://sharewear.local:9000/admin/products/export' \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"filters":{},"select":["*"]}'
```

### Filtered Export (Published Products Only)

```bash
curl -X POST 'http://sharewear.local:9000/admin/products/export' \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"filters":{"status":["published"]},"select":["*"]}'
```

### Export Specific Fields

```bash
curl -X POST 'http://sharewear.local:9000/admin/products/export' \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"filters":{},"select":["id","title","status","variants"]}'
```

## File Storage

- **Directory:** `apps/server/static/`
- **Format:** `{timestamp}-product-exports.csv`
- **Access:** Public (no authentication required for download)
- **URL Pattern:** `http://sharewear.local:9000/static/{timestamp}-product-exports.csv`

## Testing

A test script is available at `apps/server/test-workflow-execution.mjs`:

```bash
cd apps/server
node test-workflow-execution.mjs
```

This script:
1. Authenticates as admin user
2. Triggers product export
3. Verifies CSV file generation
4. Checks workflow execution records
5. Tests file accessibility

## Comparison with Default Medusa Export

| Feature | Default Medusa Export | Custom Export |
|---------|----------------------|---------------|
| **Endpoint** | `/admin/products/export` | `/admin/products/export` (same) |
| **Workflow ID** | `export-products` | `custom-export-products` |
| **Execution** | Background (requires worker) | Synchronous |
| **Response** | 202 Accepted | 200 OK with file data |
| **Notifications** | Admin UI feed notifications | No notifications (file returned in response) |
| **File Naming** | Correct with proper setup | Correct (fixed) |
| **Background Worker** | Required | Not required |

## Limitations

1. **Synchronous Only**: Large product catalogs may cause request timeouts. For very large exports, consider implementing background execution with a proper worker.
2. **No Admin UI Notifications**: Users must check the API response for the download link instead of receiving in-app notifications.
3. **No Progress Tracking**: Since execution is synchronous, there's no way to track progress for long-running exports.

## Future Improvements

1. **Hybrid Approach**: Detect catalog size and use synchronous for small exports, background for large ones
2. **Notification Provider**: Configure a feed channel notification provider to enable admin UI notifications
3. **Progress API**: Add a separate endpoint to check export status for background executions
4. **Cleanup Job**: Implement automatic cleanup of old export files after a certain period

## Related Files

- **API Endpoint:** `apps/server/src/api/admin/products/export/route.ts`
- **Workflow:** `apps/server/src/workflows/product/export-products.ts`
- **CSV Generation Step:** `apps/server/src/workflows/product/steps/generate-product-csv.ts`
- **Test Script:** `apps/server/test-workflow-execution.mjs`

## Troubleshooting

### "Workflow does not execute"
- Check server logs for errors
- Verify authentication token is valid
- Ensure database connection is working

### "File not found (404)"
- Verify the file URL matches the response
- Check that static files are being served correctly
- Confirm the file exists in `apps/server/static/`

### "Duplicate timestamp in filename"
- This was fixed by removing manual timestamp in the workflow
- If you still see it, verify you're using the latest code

### "Request timeout"
- Reduce the number of products being exported
- Consider implementing background execution for large catalogs
- Increase server timeout settings

## QA Test Results

✅ **Workflow Execution**: Passes - workflow executes synchronously
✅ **CSV Generation**: Passes - file created with correct naming
✅ **File Accessibility**: Passes - file downloadable via URL
✅ **Data Integrity**: Passes - CSV contains valid product data
✅ **API Response**: Passes - returns file information correctly
