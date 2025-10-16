import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { RENDER_ENGINE_MODULE } from "../../../modules/render-engine/types"
import RenderJobService from "../../../modules/render-engine/services/render-job-service"
import {
  CreateRenderJobStepInput,
  CreateRenderJobStepOutput
} from "../types"

export const createRenderJobStepId = "create-render-job-step"

/**
 * Step 1: Create Render Job
 *
 * Creates a new render job record in the database with status "pending".
 * This establishes the job tracking record for the entire rendering pipeline.
 *
 * @param input - Job creation parameters
 * @returns Created job ID and metadata
 */
export const createRenderJobStep = createStep(
  createRenderJobStepId,
  async (input: CreateRenderJobStepInput, { container }) => {
    const renderJobService: RenderJobService = container.resolve(RENDER_ENGINE_MODULE)

    // Create the job with null design URL (will be updated after upload)
    const job = await renderJobService.createRenderJob({
      product_id: input.productId,
      design_file_url: null, // Will be set after upload completes in next step
      preset: input.preset,
      metadata: {
        workflow_started_at: new Date().toISOString()
      }
    })

    return new StepResponse<CreateRenderJobStepOutput>(
      {
        jobId: job.id,
        productId: input.productId,
        preset: input.preset
      },
      job.id // Compensation data: job ID for cleanup
    )
  },
  async (jobId, { container }) => {
    if (!jobId) {
      return
    }

    // Compensation: Delete the job if workflow fails
    const renderJobService: RenderJobService = container.resolve(RENDER_ENGINE_MODULE)

    try {
      await renderJobService.deleteRenderJob(jobId)
    } catch (error) {
      // Log but don't throw - compensation is best effort
      console.error(`Failed to delete job ${jobId} during compensation:`, error)
    }
  }
)
