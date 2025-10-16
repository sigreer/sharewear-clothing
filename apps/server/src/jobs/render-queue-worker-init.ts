/**
 * Render Queue Worker - Scheduled Job
 *
 * This scheduled job runs continuously to process render jobs from the Bull queue.
 * It enforces concurrency limits (max 2 concurrent renders) and integrates with
 * the render workflow.
 *
 * The worker is implemented as a scheduled job that initializes the Bull processor
 * on application startup and keeps it running throughout the application lifecycle.
 */

import { MedusaContainer } from "@medusajs/framework/types"
import { getRenderQueue } from "../modules/render-engine/jobs/queue-config"
import {
  processRenderJob,
  onJobCompleted,
  onJobFailed,
  onJobProgress,
  onJobStalled
} from "../modules/render-engine/jobs/process-render-job"

/**
 * Maximum number of concurrent render jobs
 * This prevents server overload from multiple resource-intensive renders
 */
const MAX_CONCURRENT_RENDERS = 2

/**
 * Flag to track if worker is already initialized
 * Prevents duplicate worker initialization
 */
let workerInitialized = false

/**
 * Render Queue Worker Job
 *
 * Initializes the Bull queue processor to handle render jobs.
 * This runs once on application startup and keeps the worker active.
 *
 * @param container - Medusa container for resolving services
 */
export default async function renderQueueWorker(
  container: MedusaContainer
): Promise<void> {
  const logger = container.resolve("logger")

  // Prevent duplicate initialization
  if (workerInitialized) {
    logger.debug("[RenderQueueWorker] Worker already initialized, skipping")
    return
  }

  try {
    logger.info("[RenderQueueWorker] Initializing render queue worker...")

    const queue = getRenderQueue()

    // Setup the processor with concurrency limit
    queue.process(MAX_CONCURRENT_RENDERS, async (job) => {
      return processRenderJob(job, container)
    })

    // Register event handlers
    queue.on("completed", (job, result) => {
      onJobCompleted(job, result, container).catch(err =>
        logger.error("Error in completed handler:", err)
      )
    })

    queue.on("failed", (job, error) => {
      if (job) {
        onJobFailed(job, error, container).catch(err =>
          logger.error("Error in failed handler:", err)
        )
      }
    })

    queue.on("progress", (job, progress) => {
      onJobProgress(job, progress, container).catch(err =>
        logger.error("Error in progress handler:", err)
      )
    })

    queue.on("stalled", (job) => {
      onJobStalled(job, container).catch(err =>
        logger.error("Error in stalled handler:", err)
      )
    })

    workerInitialized = true

    logger.info(
      `[RenderQueueWorker] Worker initialized successfully (max ${MAX_CONCURRENT_RENDERS} concurrent jobs)`
    )

    // Log queue metrics
    const metrics = await queue.getJobCounts()
    logger.info("[RenderQueueWorker] Current queue status:" + JSON.stringify(metrics))

  } catch (error) {
    logger.error(
      "[RenderQueueWorker] Failed to initialize worker:",
      error
    )
    throw error
  }
}

/**
 * Job configuration
 *
 * This job runs only once on application startup to initialize the worker.
 * The worker then continues processing jobs throughout the application lifecycle.
 */
export const config = {
  name: "render-queue-worker",
  // Run once on startup (special cron pattern that never repeats)
  // We use a far-future date to ensure it only runs on application start
  schedule: "0 0 1 1 *", // January 1st at midnight (effectively once per year)
  numberOfExecutions: 1 // Execute only once during application runtime
}
