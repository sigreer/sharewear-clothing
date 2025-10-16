/**
 * Render Engine Jobs
 *
 * Exports job queue infrastructure for processing render jobs asynchronously.
 *
 * Components:
 * - Queue Configuration: Bull queue setup with Redis connection
 * - Job Processor: Workflow integration and job processing logic
 * - Scheduled Jobs: Worker initialization and cleanup tasks
 *
 * Usage:
 * ```typescript
 * import { addRenderJob, getQueueMetrics } from './jobs/render-engine'
 *
 * // Add job to queue
 * await addRenderJob({
 *   jobId: renderJob.id,
 *   productId: 'prod_123',
 *   designFile: buffer,
 *   // ... other params
 * })
 *
 * // Check queue status
 * const metrics = await getQueueMetrics()
 * ```
 */

// Queue configuration and management
export {
  RENDER_QUEUE_NAME,
  DEFAULT_JOB_OPTIONS,
  QUEUE_OPTIONS,
  getRenderQueue,
  closeRenderQueue,
  addRenderJob,
  getQueueJobStatus,
  removeQueueJob,
  getQueueMetrics,
  pauseQueue,
  resumeQueue,
  cleanCompletedJobs,
  cleanFailedJobs
} from "./queue-config"

// Queue types
export type {
  RenderJobData,
  RenderJobResult
} from "./queue-config"

// Job processor functions
export {
  processRenderJob,
  onJobCompleted,
  onJobFailed,
  onJobProgress,
  onJobStalled
} from "./process-render-job"

// Scheduled jobs are automatically loaded by Medusa from src/jobs/
// They don't need to be explicitly exported, but we document them here:
//
// - render-queue-worker.ts: Initializes Bull worker on startup
// - cleanup-temp-files.ts: Daily cleanup of old files and jobs
