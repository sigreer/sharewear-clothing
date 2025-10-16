import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import { RENDER_ENGINE_MODULE } from "../../../modules/render-engine/types"
import RenderJobService from "../../../modules/render-engine/services/render-job-service"
import PythonExecutorService from "../../../modules/render-engine/services/python-executor-service"
import FileManagementService from "../../../modules/render-engine/services/file-management-service"
import {
  ComposeDesignStepInput,
  ComposeDesignStepOutput
} from "../types"

export const composeDesignStepId = "compose-design-step"

/**
 * Step 3: Compose Design
 *
 * Executes the compose_design.py Python script to composite the user's design
 * onto the t-shirt template using the specified preset placement.
 *
 * Updates job status to "compositing" and progress to 40% on completion.
 *
 * @param input - Composition parameters
 * @returns Composited texture path and URL
 */
export const composeDesignStep = createStep(
  composeDesignStepId,
  async (input: ComposeDesignStepInput, { container }) => {
    const renderJobService: RenderJobService = container.resolve(RENDER_ENGINE_MODULE)
    const pythonExecutorService: PythonExecutorService = container.resolve(RENDER_ENGINE_MODULE)
    const fileManagementService: FileManagementService = container.resolve(RENDER_ENGINE_MODULE)

    // Update job status to "compositing"
    await renderJobService.updateJobStatus(input.jobId, "compositing")

    // Get temporary file path for composited output
    const compositedPath = await fileManagementService.getTempFilePath(
      input.jobId,
      "composited.png"
    )

    // Execute composition script
    const composeResult = await pythonExecutorService.executeCompose({
      templatePath: input.templatePath,
      designPath: input.designPath,
      preset: input.preset,
      outputPath: compositedPath,
      fabricColor: input.fabricColor
    })

    // Check if composition succeeded
    if (!composeResult.success) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Design composition failed: ${composeResult.error || "Unknown error"}`
      )
    }

    // Store composited file to permanent storage
    const storeResult = await fileManagementService.storeRenderOutput(
      compositedPath,
      input.jobId,
      "composited"
    )

    // Update job with composited file URL
    await renderJobService.updateJobResults(input.jobId, {
      composited_file_url: storeResult.url
    })

    return new StepResponse<ComposeDesignStepOutput>(
      {
        compositedPath,
        compositedUrl: storeResult.url
      },
      {
        jobId: input.jobId,
        compositedPath
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
        error_message: "Workflow failed during or after composition step"
      })
    } catch (error) {
      console.error(`Failed to update job ${jobId} status during compensation:`, error)
    }
  }
)
