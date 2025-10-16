import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { RENDER_ENGINE_MODULE } from "../../../modules/render-engine/types"
import RenderJobService from "../../../modules/render-engine/services/render-job-service"
import FileManagementService from "../../../modules/render-engine/services/file-management-service"
import {
  StoreRenderOutputsStepInput,
  StoreRenderOutputsStepOutput
} from "../types"

export const storeRenderOutputsStepId = "store-render-outputs-step"

/**
 * Step 5: Store Render Outputs
 *
 * Stores all rendered images and optional animation to permanent storage
 * and generates public URLs for each file.
 *
 * @param input - Render output file paths
 * @returns Public URLs for all outputs
 */
export const storeRenderOutputsStep = createStep(
  storeRenderOutputsStepId,
  async (input: StoreRenderOutputsStepInput, { container }) => {
    const renderJobService: RenderJobService = container.resolve(RENDER_ENGINE_MODULE)
    const fileManagementService: FileManagementService = container.resolve(RENDER_ENGINE_MODULE)

    const renderedImageUrls: string[] = []

    // Store each rendered image (6 camera angles)
    for (let i = 0; i < input.renderedImages.length; i++) {
      const imagePath = input.renderedImages[i]

      const storeResult = await fileManagementService.storeRenderOutput(
        imagePath,
        input.jobId,
        "rendered"
      )

      renderedImageUrls.push(storeResult.url)
    }

    // Store animation if present
    let animationUrl: string | undefined

    if (input.animation) {
      const animationResult = await fileManagementService.storeRenderOutput(
        input.animation,
        input.jobId,
        "animation"
      )

      animationUrl = animationResult.url
    }

    // Update job with all output URLs
    // Note: We'll store the first image as the main rendered_image_url for backwards compatibility
    await renderJobService.updateJobResults(input.jobId, {
      rendered_image_url: renderedImageUrls[0] || null,
      animation_url: animationUrl || null
    })

    return new StepResponse<StoreRenderOutputsStepOutput>(
      {
        renderedImageUrls,
        animationUrl
      },
      {
        jobId: input.jobId
      } // Compensation data
    )
  },
  async (compensationData, { container }) => {
    if (!compensationData) {
      return
    }

    // Compensation: Mark job as failed if storage fails
    const { jobId } = compensationData
    const renderJobService: RenderJobService = container.resolve(RENDER_ENGINE_MODULE)

    try {
      await renderJobService.updateJobStatus(jobId, "failed", {
        error_message: "Workflow failed during or after output storage"
      })
    } catch (error) {
      console.error(`Failed to update job ${jobId} status during compensation:`, error)
    }
  }
)
