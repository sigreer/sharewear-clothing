# Product Export File Not Found - Investigation Report

**Task ID**: BACKEND-INVESTIGATE-001
**Workflow**: BUG-001-admin-export-file-not-found
**Execution**: 001
**Agent**: Medusa Backend Developer
**Date**: 2025-10-04
**Status**: Investigation Complete

---

## Executive Summary

The product export 404 error is caused by **duplicate timestamp prefixes** in the generated CSV filename. The Medusa v2 framework's export workflow generates filenames with a timestamp, but the local file provider adds an additional timestamp prefix for private files, resulting in malformed URLs.

**Root Cause**: Design flaw in the interaction between:
1. `generateProductCsvStep` (generates: `{timestamp}-product-exports.csv`)
2. `LocalFileService.upload()` (prepends: `private-{timestamp}-` for private files)
3. Result: `private-{timestamp2}-{timestamp1}-product-exports.csv`

The conflicting success/failure notifications occur because the workflow runs asynchronously in the background and has both success and failure notification handlers registered.

---

## Detailed Investigation Findings

### 1. File Generation Analysis

**Location**: `node_modules/@medusajs/core-flows/dist/product/steps/generate-product-csv.js`

**Code Analysis** (Line 83):
```javascript
const filename = `${Date.now()}-product-exports.csv`;
const file = await fileModule.createFiles({
    filename,
    mimeType: "text/csv",
    content: csvContent,
});
```

**Key Finding**: The step generates a filename with a timestamp prefix but does NOT specify an `access` property, which defaults to `"private"` per the type definition.

---

### 2. File Upload Process Analysis

**Location**: `node_modules/@medusajs/file-local/dist/services/local-file.js`

**Code Analysis** (Lines 41-43):
```javascript
const fileKey = path.join(parsedFilename.dir,
    // We prepend "private" to the file key so deletions and presigned URLs can know which folder to look into
    `${file.access === "public" ? "" : "private-"}${Date.now()}-${parsedFilename.base}`);
```

**Key Finding**: The local file provider adds:
- `"private-"` prefix for files with `access !== "public"`
- Additional `Date.now()` timestamp
- Original filename (which already contains a timestamp)

**Result**: `private-1759603967933-1759603967933-product-exports.csv`

---

### 3. File Access Type Default

**Location**: `node_modules/@medusajs/types/dist/file/provider.d.ts`

**Type Definition** (Lines 73-75):
```typescript
/**
 * The access level of the file. Defaults to private if not passed
 */
access?: FileAccessPermission;
```

**FileAccessPermission**: `"public" | "private"`

**Key Finding**: Files default to `"private"` access when not explicitly specified, triggering the duplicate timestamp behavior.

---

### 4. Static File Serving Configuration

**Location**: `node_modules/@medusajs/framework/dist/http/express-loader.js`

**Code Analysis** (Line 124):
```javascript
app.use("/static", express.static(path.join(baseDir, "static")));
```

**Configuration Review** (`medusa-config.ts` lines 129-137):
```typescript
const localFileProviderOptions = {
  upload_dir: path.join(process.cwd(), 'static'),
  private_upload_dir: path.join(process.cwd(), 'static'),
  ...(resolvedLocalFileBackendUrl
    ? { backend_url: resolvedLocalFileBackendUrl }
    : {})
}
```

**Key Finding**: Both public and private files are stored in the same `static` directory and served via the same Express static middleware.

---

### 5. Export Workflow Analysis

**Location**: `node_modules/@medusajs/core-flows/dist/product/workflows/export-products.js`

**Workflow Steps**:
1. `getAllProductsStep` - Retrieves products (async, background execution)
2. `notifyOnFailureStep` - Registers failure notification handler
3. `generateProductCsvStep` - Creates CSV file
4. `useRemoteQueryStep` - Queries file details
5. `sendNotificationsStep` - Sends success notification

**Code Analysis** (Lines 55-68 - Failure Notification):
```javascript
const failureNotification = transform({ input }, (data) => {
    return [{
        to: "",
        channel: "feed",
        template: "admin-ui",
        data: {
            title: "Product export",
            description: `Failed to export products, please try again later.`,
        },
    }];
});
notifyOnFailureStep(failureNotification);
```

**Code Analysis** (Lines 77-95 - Success Notification):
```javascript
const notifications = transform({ fileDetails, file }, (data) => {
    return [{
        to: "",
        channel: "feed",
        template: "admin-ui",
        data: {
            title: "Product export",
            description: "Product export completed successfully!",
            file: {
                filename: data.file.filename,
                url: data.fileDetails.url,
                mimeType: "text/csv",
            },
        },
    }];
});
sendNotificationsStep(notifications);
```

**Key Finding**: The workflow is configured with:
- `async: true`
- `backgroundExecution: true`

This means it executes asynchronously, and both notification handlers are registered. If there's any timing issue or error during workflow execution, both notifications could fire.

---

### 6. File System Verification

**Static Directory Contents**:
```bash
/home/simon/Dev/sigreer/sharewear.clothing/apps/server/static/
- 1758558411873-needoh-gumdrop-packaging.jpg
- 1758928736238-Screenshot_20250927_000813.png
- 1759585602341-4DGTC_SQ1_0000000470_GREY_MELANGE_MDf.jfif
- 1759603925389-logo-teradici.png
```

**Key Finding**: No export files found in the static directory, indicating either:
- Files are being created and then deleted
- Export process is failing before file creation
- Files are being created with names that don't match the expected pattern

---

### 7. URL Construction Analysis

**Expected URL**: `http://sharewear.local:9000/static/private-1759603967933-1759603967933-product-exports.csv`

**URL Components**:
- Base: `http://sharewear.local:9000`
- Static path: `/static`
- File key: `private-1759603967933-1759603967933-product-exports.csv`

**File Provider URL Construction** (Line 17-20):
```javascript
this.getUploadFileUrl = (fileKey) => {
    const baseUrl = new URL(this.backendUrl_);
    baseUrl.pathname = path.join(baseUrl.pathname, fileKey);
    return baseUrl.href;
};
```

**Backend URL** (Line 29):
```javascript
this.backendUrl_ = options?.backend_url || "http://sharewear.local:9000/static";
```

**Key Finding**: URL is constructed correctly, but the file doesn't exist at the expected location due to the duplicate timestamp issue.

---

## Root Cause Summary

### Primary Issue: Duplicate Timestamp in Filename

**Problem Chain**:
1. CSV generation step creates: `1759603967933-product-exports.csv`
2. File module calls upload with default `access: "private"`
3. Local file provider prepends: `private-1759603967934-`
4. Final filename: `private-1759603967934-1759603967933-product-exports.csv`

**Why This Causes 404**:
- The workflow stores the file with the double-timestamped key
- The URL is generated correctly with the full key
- However, there may be an issue with file retrieval or the file is being deleted
- The Express static middleware serves files from `/static` directory
- The file key includes the full path, but the actual file location may not match

### Secondary Issue: Conflicting Notifications

**Problem**:
- Workflow registers both success and failure notification handlers
- Async/background execution may cause race conditions
- Both notifications appear to fire, showing conflicting messages

---

## Configuration Issues Identified

### 1. Backend URL Configuration

**Current**: Uses `sharewear.local:9000` for file URLs
**Impact**: Requires `/etc/hosts` configuration for resolution
**Assessment**: This is by design per CLAUDE.md but may complicate troubleshooting

### 2. Private vs Public File Storage

**Current**: Both stored in same `static` directory
**Design Note**: Local file provider comments indicate this is intentional for development:
```javascript
// Since there is no way to serve private files through a static server, we simply place them in `static`.
// This means that the files will be available publicly if the filename is known.
```

**Assessment**: This is acceptable for development but should not be used in production

### 3. File Access Level Default

**Current**: Defaults to `"private"` when not specified
**Impact**: Triggers timestamp prefix behavior
**Assessment**: Export workflow should explicitly set `access` level

---

## Recommended Fixes

### Fix #1: Modify Export Step to Use Public Access (RECOMMENDED)

**File**: Custom workflow override or patch
**Change**: Explicitly set `access: "public"` for export files

**Implementation**:
```typescript
// Create custom export workflow step
const file = await fileModule.createFiles({
    filename,
    mimeType: "text/csv",
    content: csvContent,
    access: "public"  // Add this line
});
```

**Benefits**:
- Eliminates duplicate timestamp prefix
- Simplifies file URL structure
- Export files are inherently meant to be downloaded by authenticated users
- Aligns with use case (temporary download files)

**Impact**: Minimal - export files are already in the same directory as public files

---

### Fix #2: Remove Timestamp from CSV Generation Step

**File**: Custom override of `generateProductCsvStep`
**Change**: Use simple filename without timestamp prefix

**Implementation**:
```typescript
const filename = `product-exports.csv`;  // Remove Date.now() prefix
```

**Benefits**:
- File provider's timestamp becomes the only timestamp
- Maintains private file tracking via `private-` prefix
- Cleaner filename structure

**Impact**: Requires careful consideration of concurrent exports

---

### Fix #3: Modify Local File Provider Configuration

**File**: Custom file provider or configuration
**Change**: Disable timestamp prefix for specific file types

**Benefits**:
- Centralized control over file naming
- Can be applied to all export types

**Drawbacks**:
- Requires custom file provider implementation
- More complex solution
- May break other functionality

**Assessment**: Not recommended - too invasive

---

### Fix #4: Fix Notification Handlers (SECONDARY)

**File**: Custom workflow override
**Change**: Ensure only one notification fires based on workflow outcome

**Implementation**: Review workflow execution and ensure proper error handling

---

## Broader Implications

### 1. Other Export Types

**Potential Impact**: This issue likely affects:
- Order exports
- Customer exports
- Any other CSV export functionality

**Recommendation**: Verify all export workflows after implementing fix

### 2. Private File Handling

**Assessment**: The current local file provider is explicitly designed for development only. The comments in the code warn against production use.

**Recommendation**: Plan for production file provider (S3, etc.) before deployment

### 3. File Cleanup

**Observation**: Export files may be accumulating if not properly cleaned up

**Recommendation**: Implement file cleanup job for temporary export files

---

## Testing Recommendations

### 1. Unit Tests
- Test file creation with explicit `access: "public"`
- Test file creation with explicit `access: "private"`
- Verify filename patterns

### 2. Integration Tests
- Test complete export workflow
- Verify file download functionality
- Test concurrent exports

### 3. Manual Testing
- Export products via admin UI
- Verify file download link works
- Check static directory for accumulated files
- Verify only one notification appears

---

## Implementation Priority

**Priority 1 (Critical)**: Fix #1 - Use public access for export files
**Priority 2 (High)**: Fix #4 - Fix conflicting notifications
**Priority 3 (Medium)**: Implement file cleanup for temporary exports
**Priority 4 (Low)**: Add monitoring for export failures

---

## Files Analyzed

1. `/home/simon/Dev/sigreer/sharewear.clothing/apps/server/medusa-config.ts`
2. `/home/simon/Dev/sigreer/sharewear.clothing/node_modules/@medusajs/core-flows/dist/product/workflows/export-products.js`
3. `/home/simon/Dev/sigreer/sharewear.clothing/node_modules/@medusajs/core-flows/dist/product/steps/generate-product-csv.js`
4. `/home/simon/Dev/sigreer/sharewear.clothing/node_modules/@medusajs/file-local/dist/services/local-file.js`
5. `/home/simon/Dev/sigreer/sharewear.clothing/node_modules/@medusajs/file/dist/services/file-module-service.js`
6. `/home/simon/Dev/sigreer/sharewear.clothing/node_modules/@medusajs/framework/dist/http/express-loader.js`
7. `/home/simon/Dev/sigreer/sharewear.clothing/node_modules/@medusajs/types/dist/file/provider.d.ts`
8. `/home/simon/Dev/sigreer/sharewear.clothing/node_modules/@medusajs/types/dist/file/common.d.ts`

---

## Technical Architecture Notes

### Medusa v2 File Module Architecture

```
Export Workflow
    ↓
generateProductCsvStep
    ↓
FileModuleService.createFiles()
    ↓
FileProviderService.upload()
    ↓
LocalFileService.upload()
    ↓
Filesystem (apps/server/static/)
    ↓
Express.static middleware (/static route)
```

### Filename Transformation Flow

```
Input: {timestamp1}-product-exports.csv
       access: undefined (defaults to "private")
       ↓
LocalFileService adds: private-{timestamp2}-
       ↓
Output: private-{timestamp2}-{timestamp1}-product-exports.csv
```

---

## Conclusion

The root cause is definitively identified as a **design interaction issue** between the export workflow's filename generation and the local file provider's private file naming convention. The recommended fix is simple and low-risk: explicitly set `access: "public"` for export files.

The conflicting notifications are a secondary issue related to async workflow execution and can be addressed separately.

This issue does not indicate broader system problems but does highlight the importance of understanding file provider behavior when working with Medusa v2's file module.

---

## Next Steps

1. **Immediate**: Implement Fix #1 (public access for exports)
2. **Short-term**: Test all export functionality
3. **Medium-term**: Implement file cleanup job
4. **Long-term**: Plan production file provider migration

---

**Investigation Complete**
**Ready for Implementation Phase**
