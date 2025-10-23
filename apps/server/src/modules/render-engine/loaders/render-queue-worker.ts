/**
 * Render Queue Worker Loader
 *
 * This loader initializes the Bull queue processor on application startup.
 * It enforces concurrency limits (max 2 concurrent renders) and integrates with
 * the render workflow.
 *
 * Loaders run once during application startup, making them ideal for
 * initialization tasks like setting up queue workers.
 */

import { MedusaContainer } from "@medusajs/framework/types"
import { getRenderQueue } from "../jobs/queue-config"
import {
  processRenderJob,
  onJobCompleted,
  onJobFailed,
  onJobProgress,
  onJobStalled
} from "../jobs/process-render-job"

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
 * Render Queue Worker Loader
 *
 * Initializes the Bull queue processor to handle render jobs.
 * This runs once on application startup.
 *
 * @param param0 - Container and logger from Medusa
 */
export default async function renderQueueWorkerLoader({
  container,
  logger
}: {
  container: MedusaContainer
  logger: any
}): Promise<void> {
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
        logger.error("[RenderQueueWorker] Error in completed handler:", err)
      )
    })

    queue.on("failed", (job, error) => {
      if (job) {
        onJobFailed(job, error, container).catch(err =>
          logger.error("[RenderQueueWorker] Error in failed handler:", err)
        )
      }
    })

    queue.on("progress", (job, progress) => {
      onJobProgress(job, progress, container).catch(err =>
        logger.error("[RenderQueueWorker] Error in progress handler:", err)
      )
    })

    queue.on("stalled", (job) => {
      onJobStalled(job, container).catch(err =>
        logger.error("[RenderQueueWorker] Error in stalled handler:", err)
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
