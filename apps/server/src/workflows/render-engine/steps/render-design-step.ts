import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { RENDER_ENGINE_MODULE } from "../../../modules/render-engine/types"
import RenderJobService from "../../../modules/render-engine/services/render-job-service"
import PythonExecutorService from "../../../modules/render-engine/services/python-executor-service"
import FileManagementService from "../../../modules/render-engine/services/file-management-service"
import {
  RenderDesignStepInput,
  RenderDesignStepOutput
} from "../types"

export const renderDesignStepId = "render-design-step"

/**
 * Step 4: Render 3D Design
 *
 * Executes the render_design.py Blender script to render the t-shirt with
 * the composited design from multiple camera angles (6 images) and optionally
 * an animation.
 *
 * Updates job status to "rendering" and progress to 95% on completion.
 *
 * @param input - Render parameters
 * @returns Array of rendered image paths and optional animation path
 */
export const renderDesignStep = createStep(
  renderDesignStepId,
  async (input: RenderDesignStepInput, { container }) => {
    const renderJobService: RenderJobService = container.resolve(RENDER_ENGINE_MODULE)
    const pythonExecutorService: PythonExecutorService = container.resolve(RENDER_ENGINE_MODULE)
    const fileManagementService: FileManagementService = container.resolve(RENDER_ENGINE_MODULE)

    // Update job status to "rendering"
    await renderJobService.updateJobStatus(input.jobId, "rendering")

    // Get temporary output directory for renders
    const outputDir = await fileManagementService.getTempFilePath(input.jobId, "renders")

    // Execute Blender render script
    const renderResult = await pythonExecutorService.executeRender({
      blendFile: input.blendFile,
      texturePath: input.texturePath,
      outputDir,
      samples: input.samples ?? 128,
      renderMode: input.renderMode ?? "all",
      backgroundColor: input.backgroundColor
    })

    // Check if rendering succeeded
    if (!renderResult.success) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `3D rendering failed: ${renderResult.error || "Unknown error"}`
      )
    }

    // Validate render outputs
    if (!renderResult.renderedImages || renderResult.renderedImages.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Rendering completed but no output images were generated"
      )
    }

    return new StepResponse<RenderDesignStepOutput>(
      {
        renderedImages: renderResult.renderedImages,
        animation: renderResult.animation
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

    const { jobId } = compensationData
    const renderJobService: RenderJobService = container.resolve(RENDER_ENGINE_MODULE)

    try {
      // Update job status to failed on compensation
      await renderJobService.updateJobStatus(jobId, "failed", {
        error_message: "Workflow failed during or after rendering step"
      })
    } catch (error) {
      console.error(`Failed to update job ${jobId} status during compensation:`, error)
    }
  }
)
