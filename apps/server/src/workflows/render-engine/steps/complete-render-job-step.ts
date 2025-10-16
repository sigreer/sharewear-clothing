import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { RENDER_ENGINE_MODULE } from "../../../modules/render-engine/types"
import RenderJobService from "../../../modules/render-engine/services/render-job-service"
import FileManagementService from "../../../modules/render-engine/services/file-management-service"
import {
  CompleteRenderJobStepInput,
  CompleteRenderJobStepOutput
} from "../types"

export const completeRenderJobStepId = "complete-render-job-step"

/**
 * Step 7: Complete Render Job
 *
 * Marks the render job as completed, stores media IDs in metadata,
 * and cleans up temporary files.
 *
 * Updates job status to "completed", progress to 100%, and sets completion timestamp.
 *
 * @param input - Job completion data
 * @returns Final job status
 */
export const completeRenderJobStep = createStep(
  completeRenderJobStepId,
  async (input: CompleteRenderJobStepInput, { container }) => {
    const renderJobService: RenderJobService = container.resolve(RENDER_ENGINE_MODULE)
    const fileManagementService: FileManagementService = container.resolve(RENDER_ENGINE_MODULE)

    // Get current job to preserve existing metadata
    const job = await renderJobService.getRenderJob(input.jobId)

    if (!job) {
      throw new Error(`Render job ${input.jobId} not found`)
    }

    // Update job status to completed with media IDs in metadata
    await renderJobService.updateJobStatus(input.jobId, "completed", {
      completed_at: new Date()
    })

    // Update metadata with media IDs
    const updatedMetadata = {
      ...(job.metadata as Record<string, any> || {}),
      media_ids: input.mediaIds,
      workflow_completed_at: new Date().toISOString()
    }

    await renderJobService.updateRenderJobs({
      id: input.jobId,
      metadata: updatedMetadata
    })

    // Clean up temporary files (non-blocking)
    await fileManagementService.cleanupJobFiles(input.jobId)

    return new StepResponse<CompleteRenderJobStepOutput>({
      jobId: input.jobId,
      status: "completed"
    })
  },
  async (_, { container }) => {
    // No compensation needed - job completion is terminal
    // If we reach this step, the workflow succeeded
  }
)
