import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { RENDER_ENGINE_MODULE } from "../../../modules/render-engine/types"
import RenderJobService from "../../../modules/render-engine/services/render-job-service"
import FileManagementService from "../../../modules/render-engine/services/file-management-service"
import {
  UploadDesignFileStepInput,
  UploadDesignFileStepOutput
} from "../types"

export const uploadDesignFileStepId = "upload-design-file-step"

/**
 * Step 2: Upload Design File
 *
 * Uploads the user's design file to storage and updates the job record
 * with the file URL and path. Also creates a temporary working directory.
 *
 * @param input - Upload parameters with file buffer
 * @returns File URL and local path
 */
export const uploadDesignFileStep = createStep(
  uploadDesignFileStepId,
  async (input: UploadDesignFileStepInput, { container }) => {
    const renderJobService: RenderJobService = container.resolve(RENDER_ENGINE_MODULE)
    const fileManagementService: FileManagementService = container.resolve(RENDER_ENGINE_MODULE)

    // Upload design file to storage
    const uploadResult = await fileManagementService.uploadDesignFile(
      {
        buffer: input.designFile,
        filename: input.filename,
        mimetype: input.mimetype
      },
      input.jobId
    )

    // Update job with design file URL
    await renderJobService.updateJobResults(input.jobId, {
      composited_file_url: null,
      rendered_image_url: null,
      animation_url: null
    })

    // Update the job record with the actual design URL
    const job = await renderJobService.getRenderJob(input.jobId)
    if (job) {
      await renderJobService.updateRenderJobs({
        id: input.jobId,
        design_file_url: uploadResult.url
      })
    }

    // Create temporary working directory for render processing
    await fileManagementService.createTempDirectory(input.jobId)

    return new StepResponse<UploadDesignFileStepOutput>(
      {
        designUrl: uploadResult.url,
        designPath: uploadResult.path
      },
      input.jobId // Compensation data
    )
  },
  async (jobId, { container }) => {
    if (!jobId) {
      return
    }

    // Compensation: Clean up uploaded files
    const fileManagementService: FileManagementService = container.resolve(RENDER_ENGINE_MODULE)

    try {
      await fileManagementService.cleanupJobFiles(jobId)
    } catch (error) {
      console.error(`Failed to cleanup files for job ${jobId} during compensation:`, error)
    }
  }
)
