import { createWorkflow, WorkflowResponse, createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules, MedusaError } from "@medusajs/framework/utils"
import { IProductModuleService } from "@medusajs/framework/types"
import { RENDER_ENGINE_MODULE } from "../../modules/render-engine/types"
import RenderJobService from "../../modules/render-engine/services/render-job-service"
import PythonExecutorService from "../../modules/render-engine/services/python-executor-service"
import FileManagementService from "../../modules/render-engine/services/file-management-service"
import MediaAssociationService from "../../modules/render-engine/services/media-association-service"
import {
  CreateRenderWorkflowInput,
  CreateRenderWorkflowOutput
} from "./types"

export const createRenderSimpleWorkflowId = "create-render-simple"

/**
 * Single-step render execution
 *
 * This is a simplified approach that runs the entire render pipeline in a single step.
 * While less granular than a multi-step workflow, it's more straightforward and easier
 * to maintain. Error handling and compensation are handled within the step.
 */
const executeRenderPipelineStep = createStep(
  "execute-render-pipeline",
  async (input: CreateRenderWorkflowInput, { container }) => {
    const renderJobService: RenderJobService = container.resolve(RENDER_ENGINE_MODULE)
    const productModuleService: IProductModuleService = container.resolve(Modules.PRODUCT)

    // Instantiate utility services directly with required dependencies
    const logger = container.resolve("logger")
    const pythonExecutorService = new PythonExecutorService({ logger })
    const fileManagementService = new FileManagementService({ logger })
    const mediaAssociationService = new MediaAssociationService({ logger })

    let jobId: string | null = null

    try {
      // Handle Buffer deserialization (workflow serializes Buffers as {type: 'Buffer', data: [...]})
      let designFileBuffer: Buffer
      if (Buffer.isBuffer(input.designFile)) {
        designFileBuffer = input.designFile
      } else if (
        input.designFile &&
        typeof input.designFile === 'object' &&
        'type' in input.designFile &&
        input.designFile.type === 'Buffer' &&
        'data' in input.designFile &&
        Array.isArray(input.designFile.data)
      ) {
        // Restore Buffer from serialized form
        designFileBuffer = Buffer.from(input.designFile.data)
      } else {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          'designFile must be a Buffer or serialized Buffer object'
        )
      }

      // Step 1: Create job
      const job = await renderJobService.createRenderJob({
        product_id: input.productId,
        design_file_url: null, // Will be set after file upload completes
        preset: input.preset,
        metadata: {
          workflow_started_at: new Date().toISOString(),
          workflow_input: {
            templatePath: input.templatePath,
            blendFile: input.blendFile,
            fabricColor: input.fabricColor,
            backgroundColor: input.backgroundColor,
            renderMode: input.renderMode,
            samples: input.samples
          }
        }
      })

      jobId = job.id

      // Step 2: Upload design
      const uploadResult = await fileManagementService.uploadDesignFile(
        {
          buffer: designFileBuffer,
          filename: input.designFilename,
          mimetype: input.designMimetype
        },
        jobId
      )

      await renderJobService.updateRenderJobs({
        id: jobId,
        design_file_url: uploadResult.url
      })

      await fileManagementService.createTempDirectory(jobId)

      // Step 3: Composite design
      await renderJobService.updateJobStatus(jobId, "compositing")

      const compositedPath = await fileManagementService.getTempFilePath(jobId, "composited.png")

      const composeResult = await pythonExecutorService.executeCompose({
        templatePath: input.templatePath,
        designPath: uploadResult.path,
        preset: input.preset,
        outputPath: compositedPath,
        fabricColor: input.fabricColor
      })

      if (!composeResult.success) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Composition failed: ${composeResult.error}`
        )
      }

      const compositedStoreResult = await fileManagementService.storeRenderOutput(
        compositedPath,
        jobId,
        "composited"
      )

      await renderJobService.updateJobResults(jobId, {
        composited_file_url: compositedStoreResult.url
      })

      // Step 4: Render 3D
      await renderJobService.updateJobStatus(jobId, "rendering")

      const renderOutputDir = await fileManagementService.getTempFilePath(jobId, "renders")

      const renderResult = await pythonExecutorService.executeRender({
        blendFile: input.blendFile,
        texturePath: compositedPath,
        outputDir: renderOutputDir,
        samples: input.samples ?? 128,
        renderMode: input.renderMode ?? "all",
        backgroundColor: input.backgroundColor
      })

      if (!renderResult.success || !renderResult.renderedImages || renderResult.renderedImages.length === 0) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Rendering failed: ${renderResult.error || "No images generated"}`
        )
      }

      // Step 5: Store outputs
      const renderedImageUrls: string[] = []

      for (const imagePath of renderResult.renderedImages) {
        const storeResult = await fileManagementService.storeRenderOutput(
          imagePath,
          jobId,
          "rendered"
        )
        renderedImageUrls.push(storeResult.url)
      }

      let animationUrl: string | undefined

      if (renderResult.animation) {
        const animationStoreResult = await fileManagementService.storeRenderOutput(
          renderResult.animation,
          jobId,
          "animation"
        )
        animationUrl = animationStoreResult.url
      }

      await renderJobService.updateJobResults(jobId, {
        rendered_image_url: renderedImageUrls[0] || null,
        animation_url: animationUrl || null
      })

      // Step 6: Associate media
      const mediaIds = await mediaAssociationService.associateRenderOutputs(
        jobId,
        input.productId,
        {
          renderedImages: renderResult.renderedImages,
          renderedImageUrls,
          animation: renderResult.animation,
          animationUrl
        },
        input.preset,
        { productModuleService }
      )

      // Step 7: Complete job
      const updatedMetadata = {
        ...((job.metadata as Record<string, any>) || {}),
        media_ids: mediaIds,
        workflow_completed_at: new Date().toISOString()
      }

      await renderJobService.updateJobStatus(jobId, "completed", {
        completed_at: new Date()
      })

      await renderJobService.updateRenderJobs({
        id: jobId,
        metadata: updatedMetadata
      })

      // Cleanup temp files
      await fileManagementService.cleanupJobFiles(jobId)

      return new StepResponse(
        {
          jobId,
          status: "completed",
          mediaIds,
          renderedImageUrls,
          animationUrl
        },
        jobId
      )

    } catch (error) {
      // Error handling: mark job as failed
      if (jobId) {
        try {
          await renderJobService.updateJobStatus(jobId, "failed", {
            error_message: error instanceof Error ? error.message : String(error),
            completed_at: new Date()
          })
        } catch (updateError) {
          console.error(`Failed to update job status:`, updateError)
        }
      }

      throw error
    }
  },
  async (jobId, { container }) => {
    // Compensation: cleanup on failure
    if (!jobId) {
      return
    }

    // Instantiate FileManagementService directly
    const logger = container.resolve("logger")
    const fileManagementService = new FileManagementService({ logger })

    try {
      await fileManagementService.cleanupJobFiles(jobId)
    } catch (error) {
      console.error(`Failed to cleanup files for job ${jobId}:`, error)
    }
  }
)

/**
 * Create Render Workflow (Simplified Single-Step Version)
 *
 * Executes the entire render pipeline as a single atomic step:
 * 1. Create render job record
 * 2. Upload design file
 * 3. Composite design onto template
 * 4. Render 3D with Blender
 * 5. Store all outputs
 * 6. Associate product media
 * 7. Complete job and cleanup
 *
 * Error Handling:
 * - Marks job as failed on any error
 * - Cleans up temporary files in compensation
 *
 * @example
 * ```typescript
 * const { result } = await createRenderSimpleWorkflow(container).run({
 *   input: {
 *     productId: "prod_123",
 *     designFile: buffer,
 *     designFilename: "design.png",
 *     designMimetype: "image/png",
 *     preset: "chest-medium",
 *     templatePath: "/path/to/template.png",
 *     blendFile: "/path/to/tshirt.blend"
 *   }
 * })
 * ```
 */
export const createRenderSimpleWorkflow = createWorkflow(
  createRenderSimpleWorkflowId,
  function (input) {
    return executeRenderPipelineStep(input)
  }
)
