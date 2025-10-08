# T-Shirt Render Engine - Task Breakdown

## Execution Sequence

### Phase 1: Foundation (Week 1)
1. INTEGRATION-001: Configure Python Environment
2. BACKEND-001 through BACKEND-004: Module setup and models
3. BACKEND-005, BACKEND-006, BACKEND-007: Core services

### Phase 2: Backend Implementation (Week 2)
1. BACKEND-008, BACKEND-009: Workflows and queues
2. BACKEND-010 through BACKEND-013: API routes
3. INTEGRATION-002, INTEGRATION-003: Integration utilities

### Phase 3: Frontend Implementation (Week 2-3)
1. FRONTEND-001, FRONTEND-002: Modal and upload
2. FRONTEND-003, FRONTEND-004: Configuration and progress
3. FRONTEND-005, FRONTEND-006, FRONTEND-007: History and integration

### Phase 4: Testing & Refinement (Week 3-4)
1. QA-001, QA-002: Unit and integration tests
2. QA-003: E2E tests
3. QA-004, QA-005: Performance and security

---

## Backend Tasks (medusa-backend-developer)

### Database & Models

#### BACKEND-001: Create Render Engine Module Structure
- **Requirements**: FR-007, CON-001
- **Description**: Create the base module structure in `apps/server/src/modules/render-engine/`
  - Create directory structure: models/, services/, types/, migrations/
  - Create index.ts with module definition
  - Add module to medusa-config.ts
- **Acceptance Criteria**:
  - Module loads without errors
  - Follows Medusa v2 module patterns
- **Dependencies**: None
- **Complexity**: Low
- **Files**:
  - CREATE: apps/server/src/modules/render-engine/index.ts
  - CREATE: apps/server/src/modules/render-engine/types.ts
  - MODIFY: apps/server/medusa-config.ts

#### BACKEND-002: Create RenderJob Model
- **Requirements**: FR-007, FR-010, FR-015
- **Description**: Implement the RenderJob model with all required fields
  - Define TypeScript interface
  - Set up entity relationships with Product
  - Add validation decorators
  - Include status enum and timestamps
- **Acceptance Criteria**:
  - Model compiles without TypeScript errors
  - Proper relations with Product entity
- **Dependencies**: BACKEND-001
- **Complexity**: Medium
- **Files**:
  - CREATE: apps/server/src/modules/render-engine/models/render-job.ts

#### BACKEND-003: Create RenderConfig and RenderTemplate Models
- **Requirements**: FR-004, FR-008
- **Description**: Implement supporting models for configuration
  - RenderConfig for job-specific settings
  - RenderTemplate for template management
  - Define relationships between models
- **Acceptance Criteria**:
  - Models compile successfully
  - Proper foreign key relationships
- **Dependencies**: BACKEND-001
- **Complexity**: Low
- **Files**:
  - CREATE: apps/server/src/modules/render-engine/models/render-config.ts
  - CREATE: apps/server/src/modules/render-engine/models/render-template.ts

#### BACKEND-004: Generate Database Migrations
- **Requirements**: FR-007, CON-002
- **Description**: Generate and review migrations for all render engine tables
  - Run: `bunx medusa db:generate render-engine`
  - Add indexes for product_id, status, created_at
  - Review foreign key constraints
- **Acceptance Criteria**:
  - Migration runs successfully
  - Tables created with correct schema
  - Indexes improve query performance
- **Dependencies**: BACKEND-002, BACKEND-003
- **Complexity**: Low
- **Files**:
  - CREATE: apps/server/src/modules/render-engine/migrations/Migration{timestamp}.ts

### Services

#### BACKEND-005: Implement RenderJobService
- **Requirements**: FR-007, FR-010, FR-011, FR-015
- **Description**: Create service for render job management
  - CRUD operations for render jobs
  - Status update methods
  - Query methods for product association
  - Job cleanup methods
- **Acceptance Criteria**:
  - All service methods work correctly
  - Proper error handling
  - Transaction support for updates
- **Dependencies**: BACKEND-002, BACKEND-004
- **Complexity**: High
- **Files**:
  - CREATE: apps/server/src/modules/render-engine/services/render-job-service.ts

#### BACKEND-006: Implement PythonExecutorService
- **Requirements**: FR-008, FR-009, NFR-006, NFR-007
- **Description**: Create service for Python script execution
  - Implement sandboxed execution with child_process
  - Add timeout handling (5 minutes)
  - Capture stdout/stderr for debugging
  - Implement file path validation and sanitization
- **Acceptance Criteria**:
  - Scripts execute successfully
  - Timeouts kill process tree
  - Errors are captured and returned
  - No path traversal vulnerabilities
- **Dependencies**: BACKEND-001
- **Complexity**: High
- **Files**:
  - CREATE: apps/server/src/modules/render-engine/services/python-executor-service.ts

#### BACKEND-007: Implement FileManagementService
- **Requirements**: FR-014, NFR-008, CON-002
- **Description**: Create service for file operations
  - Upload handling with validation
  - Temporary file management
  - Integration with Medusa file provider
  - Cleanup scheduling
- **Acceptance Criteria**:
  - Files upload to correct paths
  - Temporary files are cleaned up
  - sharewear.local URLs generated correctly
- **Dependencies**: BACKEND-001
- **Complexity**: Medium
- **Files**:
  - CREATE: apps/server/src/modules/render-engine/services/file-management-service.ts

### Workflows

#### BACKEND-008: Create Main Render Workflow
- **Requirements**: FR-007, FR-008, FR-009, FR-012, CON-001
- **Description**: Implement the create-render-workflow
  - Define all workflow steps
  - Add error compensation steps
  - Implement progress tracking
  - Integrate with services
- **Acceptance Criteria**:
  - Workflow executes end-to-end
  - Errors trigger compensation
  - Progress updates are emitted
- **Dependencies**: BACKEND-005, BACKEND-006, BACKEND-007
- **Complexity**: High
- **Files**:
  - CREATE: apps/server/src/workflows/render-engine/create-render-workflow.ts

#### BACKEND-009: Create Job Queue Configuration
- **Requirements**: NFR-002, NFR-004, FR-019
- **Description**: Set up Bull queue for render jobs
  - Configure Redis connection
  - Set up queue workers (max 2 concurrent)
  - Implement job processors
  - Add retry logic with exponential backoff
- **Acceptance Criteria**:
  - Queue processes jobs in FIFO order
  - Max 2 concurrent renders
  - Failed jobs retry up to 3 times
  - Jobs timeout after 5 minutes
- **Dependencies**: BACKEND-008
- **Complexity**: Medium
- **Files**:
  - CREATE: apps/server/src/jobs/render-engine/process-render-job.ts
  - CREATE: apps/server/src/jobs/render-engine/cleanup-temp-files.ts

### API Routes

#### BACKEND-010: Create Render Job Creation API
- **Requirements**: FR-002, FR-005, FR-007
- **Description**: Implement POST /admin/render-jobs endpoint
  - Handle multipart file upload
  - Validate file format and size (max 10MB)
  - Trigger workflow execution
  - Return job ID and initial status
- **Acceptance Criteria**:
  - Endpoint accepts file uploads
  - Validation rejects invalid files
  - Workflow is triggered successfully
  - Proper error responses
- **Dependencies**: BACKEND-008
- **Complexity**: Medium
- **Files**:
  - CREATE: apps/server/src/api/admin/render-jobs/route.ts

#### BACKEND-011: Create Job Status API
- **Requirements**: FR-011, FR-010
- **Description**: Implement GET /admin/render-jobs/:id endpoint
  - Fetch job status and progress
  - Include result URLs when complete
  - Return error details if failed
- **Acceptance Criteria**:
  - Returns accurate job status
  - Progress percentage is calculated
  - Includes all relevant job data
- **Dependencies**: BACKEND-005
- **Complexity**: Low
- **Files**:
  - CREATE: apps/server/src/api/admin/render-jobs/[id]/route.ts

#### BACKEND-012: Create Product Render History API
- **Requirements**: FR-015
- **Description**: Implement GET /admin/products/:id/render-jobs endpoint
  - List all render jobs for a product
  - Support pagination
  - Include filtering by status
- **Acceptance Criteria**:
  - Returns paginated job list
  - Filters work correctly
  - Sorted by creation date (newest first)
- **Dependencies**: BACKEND-005
- **Complexity**: Low
- **Files**:
  - CREATE: apps/server/src/api/admin/products/[id]/render-jobs/route.ts

#### BACKEND-013: Create Job Retry API
- **Requirements**: FR-018
- **Description**: Implement POST /admin/render-jobs/:id/retry endpoint
  - Only allow retry for failed jobs
  - Reset job status and re-queue
  - Preserve original configuration
- **Acceptance Criteria**:
  - Failed jobs can be retried
  - Cannot retry completed/in-progress jobs
  - New job attempt is tracked
- **Dependencies**: BACKEND-005, BACKEND-008
- **Complexity**: Medium
- **Files**:
  - CREATE: apps/server/src/api/admin/render-jobs/[id]/retry/route.ts

---

## Admin UI Tasks (medusa-frontend-developer)

#### FRONTEND-001: Create Render Wizard Modal Component
- **Requirements**: FR-001, FR-002, NFR-009
- **Description**: Implement main modal container and wizard flow
  - Multi-step wizard navigation
  - Step validation before proceeding
  - Keyboard navigation support (Tab, Escape)
  - ARIA attributes for accessibility
- **Acceptance Criteria**:
  - Modal opens/closes correctly
  - Steps navigate forward/backward
  - Keyboard navigation works
  - Screen reader compatible
- **Dependencies**: None
- **Complexity**: High
- **Files**:
  - CREATE: apps/server/src/admin/routes/products/[id]/render-wizard/page.tsx
  - CREATE: apps/server/src/admin/routes/products/[id]/render-wizard/components/render-wizard-modal.tsx

#### FRONTEND-002: Create File Upload Component
- **Requirements**: FR-003, FR-005, FR-006, NFR-001
- **Description**: Implement design file upload step
  - Drag-and-drop zone with file picker fallback
  - Client-side validation (format, size)
  - Upload progress indicator
  - Error message display
  - File preview after selection
- **Acceptance Criteria**:
  - Accepts PNG/JPG files only
  - Rejects files over 10MB
  - Shows upload progress
  - Displays preview of selected image
- **Dependencies**: FRONTEND-001
- **Complexity**: Medium
- **Files**:
  - CREATE: apps/server/src/admin/routes/products/[id]/render-wizard/components/upload-step.tsx
  - CREATE: apps/server/src/admin/routes/products/[id]/render-wizard/hooks/use-file-upload.ts

#### FRONTEND-003: Create Preset Selection Component
- **Requirements**: FR-004
- **Description**: Implement preset position selector
  - Visual preview of each preset option
  - Radio button group with images
  - Responsive grid layout
  - Clear labeling of positions
- **Acceptance Criteria**:
  - All presets are selectable
  - Visual preview helps user understand positioning
  - Selection state is maintained
- **Dependencies**: FRONTEND-001
- **Complexity**: Low
- **Files**:
  - CREATE: apps/server/src/admin/routes/products/[id]/render-wizard/components/preset-selector.tsx

#### FRONTEND-004: Create Progress Tracking Component
- **Requirements**: FR-011, NFR-003, NFR-011
- **Description**: Implement real-time progress display
  - Progress bar with percentage
  - Current status message
  - Estimated time remaining
  - Polling mechanism (every 2 seconds)
  - Cancel button for pending jobs
- **Acceptance Criteria**:
  - Updates every 2 seconds
  - Shows accurate progress
  - Displays meaningful status messages
  - Can cancel pending jobs
- **Dependencies**: FRONTEND-001, BACKEND-011
- **Complexity**: High
- **Files**:
  - CREATE: apps/server/src/admin/routes/products/[id]/render-wizard/components/render-progress.tsx
  - CREATE: apps/server/src/admin/routes/products/[id]/render-wizard/hooks/use-render-job.ts

#### FRONTEND-005: Create Render History Component
- **Requirements**: FR-015, FR-018
- **Description**: Display list of previous render jobs
  - Table with job status, date, preview
  - Retry button for failed jobs
  - View/download links for completed renders
  - Pagination for large lists
- **Acceptance Criteria**:
  - Shows all historical jobs
  - Failed jobs have retry option
  - Completed renders are viewable
  - Pagination works correctly
- **Dependencies**: BACKEND-012, BACKEND-013
- **Complexity**: Medium
- **Files**:
  - CREATE: apps/server/src/admin/routes/products/[id]/render-wizard/components/render-history.tsx

#### FRONTEND-006: Create Error Handling Component
- **Requirements**: FR-006, FR-016, FR-017, FR-018, NFR-010
- **Description**: Implement error display and recovery
  - Error boundary for React errors
  - User-friendly error messages
  - Retry options where applicable
  - Detailed error info in collapsible section
- **Acceptance Criteria**:
  - Catches and displays all error types
  - Messages are actionable
  - Retry mechanism works
  - Doesn't crash the UI
- **Dependencies**: FRONTEND-001
- **Complexity**: Medium
- **Files**:
  - CREATE: apps/server/src/admin/routes/products/[id]/render-wizard/components/error-display.tsx

#### FRONTEND-007: Integrate Render Wizard with Product Media Page
- **Requirements**: FR-001, FR-013
- **Description**: Add entry point to existing product media UI
  - Add "Generate Render" button
  - Pass product context to wizard
  - Refresh media list after successful render
  - Maintain consistent UI styling
- **Acceptance Criteria**:
  - Button appears in correct location
  - Wizard receives product ID
  - Media list updates after render
  - UI style matches admin theme
- **Dependencies**: FRONTEND-001
- **Complexity**: Low
- **Files**:
  - MODIFY: apps/server/src/admin/routes/products/[id]/media/page.tsx

---

## Integration Tasks

#### INTEGRATION-001: Configure Python Environment
- **Requirements**: CON-003, CON-004
- **Description**: Set up Python script execution environment
  - Verify Python 3.x is installed
  - Install required Python packages (Pillow, etc.)
  - Place compose_design.py and render_design.py in correct location
  - Verify Blender installation and configuration
  - Set up template files (.blend, .png)
- **Acceptance Criteria**:
  - Python scripts execute manually
  - Blender renders test file
  - All dependencies are available
- **Dependencies**: None
- **Complexity**: Medium
- **Files**:
  - CREATE: apps/server/scripts/render-engine/README.md (setup documentation)

#### INTEGRATION-002: Create Template Management Scripts
- **Requirements**: FR-008, FR-009
- **Description**: Create utility scripts for template management
  - Script to validate template files exist
  - Script to test Python execution
  - Health check endpoint for render engine
- **Acceptance Criteria**:
  - Can verify all templates are present
  - Can test Python script execution
  - Health check reports status correctly
- **Dependencies**: INTEGRATION-001
- **Complexity**: Low
- **Files**:
  - CREATE: apps/server/scripts/render-engine/validate-templates.js
  - CREATE: apps/server/scripts/render-engine/test-python.js

#### INTEGRATION-003: Implement Media Association Logic
- **Requirements**: FR-012, FR-013
- **Description**: Create logic to associate renders with products
  - Create product media entries after render
  - Set appropriate media types (main, additional)
  - Handle variant-specific media if needed
  - Update product thumbnail if first image
- **Acceptance Criteria**:
  - Rendered images appear in product media
  - Media types are set correctly
  - Product thumbnail updates if needed
- **Dependencies**: BACKEND-008
- **Complexity**: Medium
- **Files**:
  - CREATE: apps/server/src/modules/render-engine/services/media-association-service.ts

---

## QA Tasks (qa-testing-specialist)

#### QA-001: Unit Tests - Python Executor Service
- **Requirements**: NFR-006, NFR-007
- **Description**: Create unit tests for Python script execution
  - Test successful execution
  - Test timeout handling
  - Test error capture
  - Test path sanitization
  - Test resource limits
- **Acceptance Criteria**:
  - All edge cases covered
  - Mocked child_process for testing
  - Security vulnerabilities tested
- **Dependencies**: BACKEND-006
- **Complexity**: High
- **Files**:
  - CREATE: apps/server/src/modules/render-engine/__tests__/python-executor-service.unit.spec.ts

#### QA-002: Integration Tests - Render Workflow
- **Requirements**: FR-007, FR-008, FR-009, FR-012
- **Description**: Create integration tests for complete workflow
  - Test successful render flow
  - Test failure compensation
  - Test job status updates
  - Test media creation
- **Acceptance Criteria**:
  - End-to-end flow works
  - Failures are handled gracefully
  - Database state is correct
- **Dependencies**: BACKEND-008
- **Complexity**: High
- **Files**:
  - CREATE: apps/server/integration-tests/render-engine/workflow.spec.ts

#### QA-003: E2E Tests - Admin UI Wizard
- **Requirements**: FR-001, FR-002, FR-003, FR-004, FR-011
- **Description**: Create Playwright tests for UI interaction
  - Test wizard navigation
  - Test file upload validation
  - Test preset selection
  - Test progress tracking
  - Test error scenarios
- **Acceptance Criteria**:
  - Tests pass on all browsers
  - Mobile and desktop viewports
  - Accessibility checks pass
- **Dependencies**: FRONTEND-001 through FRONTEND-007
- **Complexity**: High
- **Files**:
  - CREATE: apps/server/tests/render-wizard.spec.ts

#### QA-004: Performance Tests - Concurrent Renders
- **Requirements**: NFR-002, NFR-004, FR-019
- **Description**: Test system under load
  - Test queue with multiple jobs
  - Verify 2 concurrent render limit
  - Test timeout behavior
  - Measure render times
- **Acceptance Criteria**:
  - Queue handles 10+ jobs
  - Only 2 process concurrently
  - Timeouts work at 5 minutes
  - No memory leaks
- **Dependencies**: BACKEND-009
- **Complexity**: Medium
- **Files**:
  - CREATE: apps/server/integration-tests/render-engine/performance.spec.ts

#### QA-005: Security Tests - File Upload
- **Requirements**: NFR-005, NFR-006, NFR-007
- **Description**: Test security vulnerabilities
  - Test path traversal attempts
  - Test malicious file uploads
  - Test script injection
  - Test resource exhaustion
- **Acceptance Criteria**:
  - No path traversal possible
  - Malicious files rejected
  - Scripts sandboxed properly
  - Resource limits enforced
- **Dependencies**: BACKEND-006, BACKEND-007
- **Complexity**: High
- **Files**:
  - CREATE: apps/server/integration-tests/render-engine/security.spec.ts

---

## Task Summary

- **Total Tasks**: 31
- **Backend**: 13 tasks
- **Frontend**: 7 tasks
- **Integration**: 3 tasks
- **QA**: 5 tasks
- **Estimated Duration**: 3-4 weeks
