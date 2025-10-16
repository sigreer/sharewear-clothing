import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// Extend MedusaRequest to include file property from multer
interface MedusaRequestWithFile extends MedusaRequest {
  file?: {
    fieldname: string
    originalname: string
    encoding: string
    mimetype: string
    size: number
    buffer: Buffer
  }
}
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { IProductModuleService } from "@medusajs/framework/types"
import multer from "multer"
import { createRenderSimpleWorkflow } from "../../../workflows/render-engine"
import { RENDER_ENGINE_MODULE } from "../../../modules/render-engine/types"
import RenderJobService from "../../../modules/render-engine/services/render-job-service"
import {
  createRenderJobSchema,
  validateFileType,
  validateFileSize,
  isValidColor
} from "./validators"
import path from "path"

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
})

/**
 * POST /admin/render-jobs
 *
 * Create a new render job and trigger workflow execution.
 *
 * @route POST /admin/render-jobs
 * @access Admin
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  return new Promise<void>((resolve, reject) => {
    const reqWithFile = req as unknown as MedusaRequestWithFile
    // Use multer middleware to handle file upload
    upload.single("design_file")(req as any, res as any, async (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
              type: "invalid_data",
              message: "File size exceeds maximum allowed size of 10MB",
              code: "FILE_TOO_LARGE"
            })
          }
        }
        return res.status(400).json({
          type: "invalid_data",
          message: err.message || "File upload failed",
          code: "FILE_UPLOAD_ERROR"
        })
      }

      try {
        // Validate file was uploaded
        if (!reqWithFile.file) {
          return res.status(400).json({
            type: "invalid_data",
            message: "design_file is required",
            code: "MISSING_FILE"
          })
        }

        // Validate file size
        const sizeValidation = validateFileSize(reqWithFile.file.size)
        if (!sizeValidation.valid) {
          return res.status(400).json({
            type: "invalid_data",
            message: sizeValidation.error,
            code: "FILE_TOO_LARGE"
          })
        }

        // Validate file type using MIME and magic bytes
        const typeValidation = validateFileType(reqWithFile.file.buffer, reqWithFile.file.mimetype)
        if (!typeValidation.valid) {
          return res.status(400).json({
            type: "invalid_data",
            message: typeValidation.error,
            code: "INVALID_FILE_TYPE"
          })
        }

        // Parse and validate request body
        const bodyValidation = createRenderJobSchema.safeParse(req.body)
        if (!bodyValidation.success) {
          const errorMessage = bodyValidation.error.errors
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join(", ")

          return res.status(400).json({
            type: "invalid_data",
            message: errorMessage,
            code: "VALIDATION_ERROR"
          })
        }

        const validatedData = bodyValidation.data

        // Validate colors if provided
        if (validatedData.fabric_color && !isValidColor(validatedData.fabric_color)) {
          return res.status(400).json({
            type: "invalid_data",
            message: `Invalid fabric_color: ${validatedData.fabric_color}. Use hex format (#RRGGBB) or named color`,
            code: "INVALID_COLOR"
          })
        }

        if (validatedData.background_color && !isValidColor(validatedData.background_color)) {
          return res.status(400).json({
            type: "invalid_data",
            message: `Invalid background_color: ${validatedData.background_color}. Use hex format (#RRGGBB), named color, or 'transparent'`,
            code: "INVALID_COLOR"
          })
        }

        // Verify product exists
        const productModuleService: IProductModuleService = req.scope.resolve(Modules.PRODUCT)
        const product = await productModuleService.retrieveProduct(validatedData.product_id).catch(() => null)

        if (!product) {
          return res.status(404).json({
            type: "not_found",
            message: `Product with ID ${validatedData.product_id} not found`,
            code: "PRODUCT_NOT_FOUND"
          })
        }

        // TODO: Get template and blend file paths from configuration or database
        // For now, using placeholder paths - these should be replaced with actual template selection logic
        const templatePath = path.join(process.cwd(), "render-assets", "templates", "white-tshirt.png")
        const blendFile = path.join(process.cwd(), "render-assets", "models", "tshirt-model.blend")

        // Trigger the render workflow
        const { result } = await createRenderSimpleWorkflow(req.scope).run({
          input: {
            productId: validatedData.product_id,
            designFile: reqWithFile.file.buffer,
            designFilename: reqWithFile.file.originalname,
            designMimetype: reqWithFile.file.mimetype,
            preset: validatedData.preset,
            templatePath,
            blendFile,
            fabricColor: validatedData.fabric_color,
            backgroundColor: validatedData.background_color,
            renderMode: validatedData.render_mode,
            samples: validatedData.samples
          }
        })

        // Get the created job details
        const renderJobService: RenderJobService = req.scope.resolve(RENDER_ENGINE_MODULE)
        const job = await renderJobService.getRenderJob((result as any).jobId)

        if (!job) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            "Failed to retrieve created render job"
          )
        }

        return res.status(201).json({
          render_job: {
            id: job.id,
            status: job.status,
            product_id: job.product_id,
            preset: job.preset,
            progress: 0, // Initial progress
            created_at: job.created_at
          }
        })

      } catch (error) {
        console.error("[Create Render Job] Error:", error)

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
          message: error instanceof Error ? error.message : "Failed to create render job",
          code: "INTERNAL_ERROR"
        })
      }
    })
  })
}
