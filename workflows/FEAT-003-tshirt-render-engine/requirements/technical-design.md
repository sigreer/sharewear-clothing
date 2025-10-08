# T-Shirt Render Engine - Technical Design Document

This document contains the complete technical design for the automated T-shirt design rendering system.

## Architecture Overview

```
┌─────────────────┐      ┌──────────────┐      ┌─────────────────┐
│   Admin UI      │──────│   API Layer  │──────│  Backend Module │
│  (React Modal)  │      │  (REST APIs) │      │  (render-engine)│
└─────────────────┘      └──────────────┘      └─────────────────┘
         │                        │                      │
         │                        │                      ▼
         │                        │             ┌─────────────────┐
         │                        │             │   Workflows     │
         │                        │             │  (Orchestrator) │
         │                        │             └─────────────────┘
         │                        │                      │
         ▼                        ▼                      ▼
┌─────────────────┐      ┌──────────────┐      ┌─────────────────┐
│  File Storage   │      │   Database   │      │   Job Queue     │
│ (sharewear.local)│      │ (PostgreSQL) │      │  (Bull/Redis)   │
└─────────────────┘      └──────────────┘      └─────────────────┘
                                                         │
                                                         ▼
                                                ┌─────────────────┐
                                                │  Python Scripts │
                                                │  - compose      │
                                                │  - render       │
                                                └─────────────────┘
```

## Component Design

### Backend Module: `render-engine`

**Location**: `apps/server/src/modules/render-engine/`

#### Models

```typescript
// models/render-job.ts
interface RenderJob {
  id: string
  product_id: string
  status: 'pending' | 'compositing' | 'rendering' | 'completed' | 'failed'
  config: RenderConfig
  design_file_url: string
  composited_file_url?: string
  rendered_image_url?: string
  animation_url?: string
  error_message?: string
  started_at?: Date
  completed_at?: Date
  created_at: Date
  updated_at: Date
}

// models/render-config.ts
interface RenderConfig {
  id: string
  preset: 'chest-large' | 'dead-center-medium' | 'back-small'
  template_path: string
  blend_file_path: string
  render_samples: number
  generate_animation: boolean
}

// models/render-template.ts
interface RenderTemplate {
  id: string
  name: string
  template_image_path: string
  blend_file_path: string
  available_presets: string[]
  is_active: boolean
}
```

#### Services

```typescript
// services/render-job-service.ts
class RenderJobService extends MedusaService {
  async createRenderJob(productId, designFile, config)
  async updateJobStatus(jobId, status, data?)
  async getJobById(jobId)
  async getJobsByProduct(productId)
  async processComposition(job)
  async processRendering(job)
  async cleanupTempFiles(job)
}

// services/python-executor-service.ts
class PythonExecutorService {
  async executeCompose(templatePath, designPath, preset, outputPath)
  async executeRender(blendFile, texturePath, outputDir, samples)
  validatePythonEnvironment()
  sandboxExecution(command, args, timeout)
}
```

### API Routes

**Admin APIs**:
- `POST /admin/render-jobs` - Create new render job
- `GET /admin/render-jobs/:id` - Get job status
- `GET /admin/products/:id/render-jobs` - List product render jobs
- `POST /admin/render-jobs/:id/retry` - Retry failed job
- `DELETE /admin/render-jobs/:id` - Cancel/delete job

**Request/Response Formats**:
```typescript
// POST /admin/render-jobs
interface CreateRenderJobRequest {
  product_id: string
  design_file: File // multipart upload
  preset: 'chest-large' | 'dead-center-medium' | 'back-small'
  template_id?: string // optional, uses default if not provided
}

interface RenderJobResponse {
  id: string
  status: string
  progress_percentage: number
  estimated_time_remaining?: number
  result_urls?: {
    rendered_image?: string
    animation?: string
  }
  error?: {
    message: string
    code: string
  }
}
```

### Workflow Design

**Main Workflow**: `create-render-workflow`

```typescript
// workflows/create-render-workflow.ts
workflow("create-render-workflow", [
  step("validateInput", async (input) => {
    // Validate product exists
    // Validate file format and size
    // Check render queue capacity
  }),

  step("createRenderJob", async (input) => {
    // Create job record in database
    // Upload design file to storage
    // Return job ID
  }),

  step("queueRenderJob", async (jobId) => {
    // Add job to Bull queue
    // Set job priority based on queue length
  }),

  step("processComposition", async (jobId) => {
    // Update status to 'compositing'
    // Execute compose_design.py
    // Store composited file
    // Update job with composited_file_url
  }),

  step("processRendering", async (jobId) => {
    // Update status to 'rendering'
    // Execute render_design.py
    // Store rendered files
    // Update job with result URLs
  }),

  step("createProductMedia", async (jobId) => {
    // Create media entries for rendered images
    // Associate with product/variants
    // Update status to 'completed'
  }),

  compensateStep("cleanupOnFailure", async (jobId) => {
    // Delete temporary files
    // Update status to 'failed'
    // Log error details
  })
])
```

### Admin UI Components

**Component Structure**:
```
src/admin/routes/products/[id]/render-wizard/
├── page.tsx                    # Main wizard container
├── components/
│   ├── render-wizard-modal.tsx # Modal wrapper
│   ├── upload-step.tsx         # Design upload step
│   ├── preset-selector.tsx     # Position preset selection
│   ├── render-progress.tsx     # Progress tracking
│   └── render-history.tsx      # Previous renders list
├── hooks/
│   ├── use-render-job.ts       # Job status polling
│   └── use-file-upload.ts      # Upload handling
└── utils/
    └── validation.ts            # File validation helpers
```

**State Management**:
```typescript
interface RenderWizardState {
  currentStep: 'upload' | 'configure' | 'processing' | 'complete'
  uploadedFile: File | null
  selectedPreset: string | null
  selectedTemplate: string | null
  currentJob: RenderJob | null
  pollingInterval: NodeJS.Timeout | null
  error: Error | null
}
```

## Technical Decisions

### File Storage Strategy
- **Uploads**: Store in `/uploads/render-jobs/{job-id}/` with UUID filenames
- **Templates**: Store in `/templates/render/` (pre-configured)
- **Outputs**: Store in `/media/products/{product-id}/renders/`
- **Cleanup**: Temporary files deleted after 24 hours via scheduled job

### Python Script Execution
- Use Node.js `child_process.spawn()` with timeout handling
- Set resource limits (CPU, memory) via `ulimit`
- Run in isolated working directory per job
- Capture stdout/stderr for debugging
- Kill process tree on timeout

### Job Queue Configuration
- Use Bull queue with Redis for job management
- Configure 2 concurrent workers for render jobs
- Implement exponential backoff for retries (max 3)
- Set job timeout to 5 minutes
- Priority queue based on job age

### Error Handling Strategy
- Categorize errors: validation, script, timeout, system
- Store detailed error logs in database
- Provide user-friendly messages in UI
- Auto-retry for transient failures (network, file I/O)
- Manual retry for permanent failures

## Integration Strategy

### With Existing Product Module
- Extend product admin routes with render wizard
- Add render job relation to product model
- Integrate with existing media management UI

### With File Provider
- Use existing file service for uploads/downloads
- Ensure sharewear.local:9000 URLs are generated correctly
- Implement streaming for large file uploads

### Migration Path
- No breaking changes to existing functionality
- Feature flag: `ENABLE_RENDER_ENGINE` for gradual rollout
- Backward compatible with existing media management

## Security Considerations

1. **File Upload Security**:
   - Validate file types using magic numbers, not just extensions
   - Sanitize filenames to prevent path traversal
   - Limit file sizes (max 10MB)
   - Scan uploads for malware signatures

2. **Script Execution Security**:
   - Run Python scripts with limited privileges
   - Use sandboxing/containerization
   - Timeout enforcement (5 minutes)
   - Resource limits (CPU, memory, disk I/O)

3. **API Security**:
   - Require admin authentication
   - Rate limit render job creation
   - Validate all input parameters
   - Prevent CSRF attacks

## Performance Optimization

1. **Queue Management**:
   - Max 2 concurrent renders to prevent server overload
   - Priority queue for important products
   - Job deduplication to prevent duplicate renders

2. **Caching**:
   - Cache template files in memory
   - Reuse Blender process if possible
   - Cache rendered outputs (CDN)

3. **Monitoring**:
   - Track render success/failure rates
   - Monitor queue depth and processing times
   - Alert on repeated failures or long queue times
