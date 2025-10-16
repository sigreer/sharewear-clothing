/**
 * Render Job Processor
 *
 * Bull queue processor that executes render jobs using the createRenderSimpleWorkflow.
 * Handles job processing with proper error handling and status updates.
 */

import { Job } from "bull"
import { MedusaContainer } from "@medusajs/framework/types"
import { createRenderSimpleWorkflow } from "../../../workflows/render-engine"
import { RenderJobData, RenderJobResult } from "./queue-config"
import { RENDER_ENGINE_MODULE } from "../types"
import RenderJobService from "../services/render-job-service"

/**
 * Process a render job from the queue
 *
 * This function is called by Bull for each job in the queue.
 * It executes the render workflow and updates the job status accordingly.
 *
 * @param job - Bull job instance containing render job data
 * @param container - Medusa container for resolving services
 * @returns Render job result
 */
export async function processRenderJob(
  job: Job<RenderJobData>,
  container: MedusaContainer
): Promise<RenderJobResult> {
  const logger = container.resolve("logger")
  const renderJobService: RenderJobService = container.resolve(RENDER_ENGINE_MODULE)

  const {
    jobId,
    productId,
    designFile,
    designFilename,
    designMimetype,
    preset,
    templatePath,
    blendFile,
    fabricColor,
    backgroundColor,
    renderMode,
    samples,
    metadata
  } = job.data

  logger.info(
    `[RenderProcessor] Processing render job ${jobId} for product ${productId}`
  )

  try {
    // Update job progress
    await job.progress(10)

    // Verify job still exists in database
    const existingJob = await renderJobService.getRenderJob(jobId)
    if (!existingJob) {
      throw new Error(`Render job ${jobId} not found in database`)
    }

    // Check if job is already completed or failed
    if (existingJob.status === "completed") {
      logger.warn(`[RenderProcessor] Job ${jobId} already completed, skipping`)
      return {
        jobId,
        status: "completed",
        mediaIds: ((existingJob.metadata as Record<string, any>)?.media_ids as string[]) || [],
        renderedImageUrls: existingJob.rendered_image_url ? [existingJob.rendered_image_url] : []
      }
    }

    if (existingJob.status === "failed") {
      logger.warn(`[RenderProcessor] Job ${jobId} already failed, retrying`)
    }

    await job.progress(20)

    // Execute the render workflow
    logger.info(`[RenderProcessor] Executing workflow for job ${jobId}`)

    const { result } = await createRenderSimpleWorkflow(container).run({
      input: {
        productId,
        designFile,
        designFilename,
        designMimetype,
        preset,
        templatePath,
        blendFile,
        fabricColor,
        backgroundColor,
        renderMode,
        samples
      }
    })

    await job.progress(100)

    logger.info(
      `[RenderProcessor] Workflow completed successfully for job ${jobId}`
    )

    return {
      jobId: (result as any).jobId,
      status: "completed",
      mediaIds: (result as any).mediaIds,
      renderedImageUrls: (result as any).renderedImageUrls,
      animationUrl: (result as any).animationUrl
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    logger.error(
      `[RenderProcessor] Job ${jobId} failed:`,
      error
    )

    // Update job status to failed in database
    try {
      await renderJobService.updateJobStatus(jobId, "failed", {
        error_message: errorMessage,
        completed_at: new Date()
      })
    } catch (updateError) {
      logger.error(
        `[RenderProcessor] Failed to update job status:`,
        updateError
      )
    }

    return {
      jobId,
      status: "failed",
      error: errorMessage
    }
  }
}

/**
 * Handle job completion
 *
 * @param job - Bull job instance
 * @param result - Job result
 * @param container - Medusa container
 */
export async function onJobCompleted(
  job: Job<RenderJobData>,
  result: RenderJobResult,
  container: MedusaContainer
): Promise<void> {
  const logger = container.resolve("logger")

  logger.info(
    `[RenderProcessor] Job ${job.id} completed successfully`
  )
}

/**
 * Handle job failure
 *
 * @param job - Bull job instance
 * @param error - Error that caused the failure
 * @param container - Medusa container
 */
export async function onJobFailed(
  job: Job<RenderJobData>,
  error: Error,
  container: MedusaContainer
): Promise<void> {
  const logger = container.resolve("logger")
  const renderJobService: RenderJobService = container.resolve(RENDER_ENGINE_MODULE)

  logger.error(
    `[RenderProcessor] Job ${job.id} failed after ${job.attemptsMade} attempts`,
    error
  )

  // If this was the last attempt, ensure job is marked as failed
  if (job.attemptsMade >= (job.opts.attempts || 3)) {
    try {
      await renderJobService.updateJobStatus(job.data.jobId, "failed", {
        error_message: `Job failed after ${job.attemptsMade} attempts: ${error.message}`,
        completed_at: new Date()
      })

      logger.warn(
        `[RenderProcessor] Job ${job.data.jobId} marked as permanently failed`
      )
    } catch (updateError) {
      logger.error(
        `[RenderProcessor] Failed to update job status:`,
        updateError
      )
    }
  }
}

/**
 * Handle job progress updates
 *
 * @param job - Bull job instance
 * @param progress - Progress percentage (0-100)
 * @param container - Medusa container
 */
export async function onJobProgress(
  job: Job<RenderJobData>,
  progress: number,
  container: MedusaContainer
): Promise<void> {
  const logger = container.resolve("logger")

  logger.debug(
    `[RenderProcessor] Job ${job.id} progress: ${progress}%`
  )
}

/**
 * Handle job stalled event
 *
 * @param job - Bull job instance
 * @param container - Medusa container
 */
export async function onJobStalled(
  job: Job<RenderJobData>,
  container: MedusaContainer
): Promise<void> {
  const logger = container.resolve("logger")
  const renderJobService: RenderJobService = container.resolve(RENDER_ENGINE_MODULE)

  logger.warn(
    `[RenderProcessor] Job ${job.id} stalled - may have crashed`
  )

  // Mark job as failed due to stall
  try {
    await renderJobService.updateJobStatus(job.data.jobId, "failed", {
      error_message: "Job stalled - worker may have crashed",
      completed_at: new Date()
    })
  } catch (updateError) {
    logger.error(
      `[RenderProcessor] Failed to update stalled job status:`,
      updateError
    )
  }
}
