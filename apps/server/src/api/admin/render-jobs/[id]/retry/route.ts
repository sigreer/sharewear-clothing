import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { IProductModuleService } from "@medusajs/framework/types"
import { createRenderSimpleWorkflow } from "../../../../../workflows/render-engine"
import { RENDER_ENGINE_MODULE } from "../../../../../modules/render-engine/types"
import RenderJobService from "../../../../../modules/render-engine/services/render-job-service"
import { retryRenderJobSchema, isValidColor } from "../../validators"
import path from "path"
import fs from "fs/promises"

/**
 * POST /admin/render-jobs/:id/retry
 *
 * Retry a failed render job by creating a new job with the same (or optionally updated) configuration.
 *
 * @route POST /admin/render-jobs/:id/retry
 * @access Admin
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const jobId = req.params.id

    if (!jobId || typeof jobId !== "string" || !jobId.trim()) {
      return res.status(400).json({
        type: "invalid_data",
        message: "Job ID is required",
        code: "MISSING_JOB_ID"
      })
    }

    // Get render job service
    const renderJobService: RenderJobService = req.scope.resolve(RENDER_ENGINE_MODULE)

    // Retrieve the original job
    const originalJob = await renderJobService.getRenderJob(jobId)

    if (!originalJob) {
      return res.status(404).json({
        type: "not_found",
        message: `Render job with ID ${jobId} not found`,
        code: "JOB_NOT_FOUND"
      })
    }

    // Verify job is in failed state
    if (originalJob.status !== "failed") {
      return res.status(400).json({
        type: "invalid_data",
        message: `Cannot retry job ${jobId}: job status is '${originalJob.status}', must be 'failed'`,
        code: "JOB_NOT_FAILED"
      })
    }

    // Parse and validate optional override parameters
    let overrides = {}
    if (req.body && Object.keys(req.body).length > 0) {
      const validation = retryRenderJobSchema.safeParse(req.body)
      if (!validation.success) {
        const errorMessage = validation.error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", ")

        return res.status(400).json({
          type: "invalid_data",
          message: errorMessage,
          code: "VALIDATION_ERROR"
        })
      }

      overrides = validation.data

      // Validate colors if provided
      if ((overrides as any).fabric_color && !isValidColor((overrides as any).fabric_color)) {
        return res.status(400).json({
          type: "invalid_data",
          message: `Invalid fabric_color: ${(overrides as any).fabric_color}. Use hex format (#RRGGBB) or named color`,
          code: "INVALID_COLOR"
        })
      }

      if ((overrides as any).background_color && !isValidColor((overrides as any).background_color)) {
        return res.status(400).json({
          type: "invalid_data",
          message: `Invalid background_color: ${(overrides as any).background_color}. Use hex format (#RRGGBB), named color, or 'transparent'`,
          code: "INVALID_COLOR"
        })
      }
    }

    // Extract original workflow configuration from metadata
    const originalMetadata = (originalJob.metadata as Record<string, any>) || {}
    const originalWorkflowInput = originalMetadata.workflow_input || {}

    // Download the original design file
    const designFileUrl = originalJob.design_file_url
    if (!designFileUrl || designFileUrl === "pending") {
      return res.status(400).json({
        type: "invalid_data",
        message: "Cannot retry job: original design file URL is not available",
        code: "MISSING_DESIGN_FILE"
      })
    }

    // Read the design file from the file system
    // The design_file_url should be a path like /static/renders/job-xxx/design.png
    let designBuffer: Buffer
    let designFilename: string
    let designMimetype: string

    try {
      // Extract file path from URL
      // Assuming URL format: http://sharewear.local:9000/static/renders/job-xxx/design.png
      const urlPath = new URL(designFileUrl).pathname
      const filePath = path.join(process.cwd(), urlPath.replace(/^\//, ""))

      designBuffer = await fs.readFile(filePath)
      designFilename = path.basename(filePath)

      // Determine MIME type from file extension
      const ext = path.extname(filePath).toLowerCase()
      designMimetype = ext === ".png" ? "image/png" : "image/jpeg"

    } catch (error) {
      console.error("[Retry Render Job] Failed to read design file:", error)
      return res.status(500).json({
        type: "internal_error",
        message: "Failed to read original design file for retry",
        code: "FILE_READ_ERROR"
      })
    }

    // Verify product still exists
    const productModuleService: IProductModuleService = req.scope.resolve(Modules.PRODUCT)
    const product = await productModuleService.retrieveProduct(originalJob.product_id).catch(() => null)

    if (!product) {
      return res.status(404).json({
        type: "not_found",
        message: `Product with ID ${originalJob.product_id} not found`,
        code: "PRODUCT_NOT_FOUND"
      })
    }

    // Merge original config with overrides
    const preset = (overrides as any).preset || originalJob.preset
    const fabricColor = (overrides as any).fabric_color || originalWorkflowInput.fabricColor
    const backgroundColor = (overrides as any).background_color || originalWorkflowInput.backgroundColor
    const samples = (overrides as any).samples || originalWorkflowInput.samples

    // Get template and blend file paths (same as original)
    const templatePath = originalWorkflowInput.templatePath || path.join(process.cwd(), "render-assets", "templates", "white-tshirt.png")
    const blendFile = originalWorkflowInput.blendFile || path.join(process.cwd(), "render-assets", "models", "tshirt-model.blend")

    // Trigger the render workflow for the retry
    const { result } = await createRenderSimpleWorkflow(req.scope).run({
      input: {
        productId: originalJob.product_id,
        designFile: designBuffer,
        designFilename,
        designMimetype,
        preset,
        templatePath,
        blendFile,
        fabricColor,
        backgroundColor,
        renderMode: originalWorkflowInput.renderMode || "all",
        samples
      }
    })

    // Get the new job details
    const newJob = await renderJobService.getRenderJob((result as any).jobId)

    if (!newJob) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Failed to retrieve created retry job"
      )
    }

    return res.status(201).json({
      render_job: {
        id: newJob.id,
        status: newJob.status,
        product_id: newJob.product_id,
        preset: newJob.preset,
        metadata: {
          retried_from: originalJob.id,
          ...((newJob.metadata as Record<string, any>) || {})
        },
        created_at: newJob.created_at
      }
    })

  } catch (error) {
    console.error("[Retry Render Job] Error:", error)

    if (error instanceof MedusaError) {
      const statusCode = error.type === MedusaError.Types.NOT_FOUND ? 404 : 500
      return res.status(statusCode).json({
        type: error.type,
        message: error.message,
        code: "WORKFLOW_ERROR"
      })
    }

    return res.status(500).json({
      type: "internal_error",
      message: error instanceof Error ? error.message : "Failed to retry render job",
      code: "INTERNAL_ERROR"
    })
  }
}
