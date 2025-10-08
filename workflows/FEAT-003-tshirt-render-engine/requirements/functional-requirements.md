# T-Shirt Render Engine - Requirements Document

## Functional Requirements (EARS Notation)

### Upload & Configuration Requirements

- **FR-001**: The system shall provide a "Generate Render" button on the product media management page in the admin panel.
- **FR-002**: WHEN the "Generate Render" button is clicked, the system shall display a modal wizard interface.
- **FR-003**: The wizard shall allow admins to upload a design image file (PNG or JPG format).
- **FR-004**: The wizard shall provide preset position options: chest-large, dead-center-medium, back-small.
- **FR-005**: The system shall validate uploaded files for format (PNG/JPG) and size (max 10MB).
- **FR-006**: IF an invalid file is uploaded, THEN the system shall display an error message explaining the issue.

### Workflow Execution Requirements

- **FR-007**: WHEN the admin confirms render settings, the system shall create a render job record with status "pending".
- **FR-008**: The system shall execute compose_design.py with the uploaded design and selected preset.
- **FR-009**: IF composition succeeds, THEN the system shall execute render_design.py with the composited texture.
- **FR-010**: The system shall track render job progress through states: pending, compositing, rendering, completed, failed.
- **FR-011**: WHILE a render job is processing, the system shall display real-time progress updates in the admin UI.

### Media Management Requirements

- **FR-012**: WHEN rendering completes successfully, the system shall create product media entries for generated images.
- **FR-013**: The system shall automatically associate generated media with the source product.
- **FR-014**: Generated media shall be stored using the configured Medusa file provider (sharewear.local:9000).
- **FR-015**: The system shall retain render job history for audit purposes.

### Error Handling Requirements

- **FR-016**: IF compose_design.py fails, THEN the system shall mark the job as failed and store the error message.
- **FR-017**: IF render_design.py fails, THEN the system shall mark the job as failed and store the error message.
- **FR-018**: IF a render job fails, THEN the system shall display a user-friendly error message with retry option.
- **FR-019**: The system shall implement a timeout of 5 minutes for render jobs to prevent hanging processes.

## Non-Functional Requirements

### Performance Requirements

- **NFR-001**: The file upload shall complete within 5 seconds for files up to 10MB.
- **NFR-002**: The system shall queue render jobs to process maximum 2 concurrent renders.
- **NFR-003**: The admin UI shall poll for job status updates every 2 seconds while a job is active.
- **NFR-004**: WHERE multiple render jobs are queued, the system shall process them in FIFO order.

### Security Requirements

- **NFR-005**: The system shall sanitize uploaded filenames to prevent path traversal attacks.
- **NFR-006**: The system shall execute Python scripts in a sandboxed environment with limited permissions.
- **NFR-007**: The system shall validate that uploaded images do not contain malicious payloads.
- **NFR-008**: Temporary files shall be cleaned up after job completion or failure.

### Usability Requirements

- **NFR-009**: The wizard interface shall be keyboard navigable and screen-reader accessible (WCAG 2.1 AA).
- **NFR-010**: Error messages shall provide actionable guidance for resolution.
- **NFR-011**: The progress indicator shall show estimated time remaining when possible.

## Constraints

- **CON-001**: The implementation shall use the existing Medusa v2 workflow system for orchestration.
- **CON-002**: The implementation shall integrate with the existing Medusa file provider configuration.
- **CON-003**: Python scripts (compose_design.py, render_design.py) shall not be modified.
- **CON-004**: Blender must be installed on the server with the required .blend template files.

## User Stories

### US-001: Admin Uploads Design
**As a** Medusa admin user
**I want to** upload a T-shirt design and select positioning
**So that** I can generate professional product renders automatically

**Acceptance Criteria**:
- Can access render wizard from product media page
- Can upload PNG/JPG files up to 10MB
- Can select from preset positioning options
- Receive immediate feedback on invalid uploads

### US-002: Admin Tracks Render Progress
**As a** Medusa admin user
**I want to** see real-time progress of my render job
**So that** I know when my product images will be ready

**Acceptance Criteria**:
- See current status (compositing, rendering, etc.)
- See progress percentage
- See estimated time remaining
- Can cancel pending jobs

### US-003: Admin Retries Failed Renders
**As a** Medusa admin user
**I want to** retry failed render jobs
**So that** I can recover from temporary failures

**Acceptance Criteria**:
- See clear error messages when renders fail
- Can retry failed jobs with one click
- Original configuration is preserved on retry

### US-004: Admin Views Render History
**As a** Medusa admin user
**I want to** see all previous render attempts for a product
**So that** I can track changes and access previous renders

**Acceptance Criteria**:
- See list of all render jobs for product
- See status, date, and preview for each job
- Can download previous renders
- Can view render configuration details

## Assumptions

1. Blender and Python 3.x are pre-installed on the server
2. Redis is available for Bull queue management
3. Server has sufficient disk space for render outputs
4. Template files (.blend, .png) are provided and stored in known locations
5. Admins have appropriate permissions to manage product media
6. Internet connection is available for file uploads/downloads

## Dependencies

- Medusa v2 backend framework
- PostgreSQL database
- Redis for job queuing
- Python 3.x with Pillow library
- Blender (headless mode)
- Node.js child_process for script execution
- Existing Medusa file provider
