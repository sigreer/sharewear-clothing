import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RENDER_ENGINE_MODULE } from "../../../../modules/render-engine/types"
import RenderJobService from "../../../../modules/render-engine/services/render-job-service"

/**
 * GET /admin/render-jobs/:id
 *
 * Get render job status and progress.
 * This endpoint is designed to be polled every 2 seconds by the frontend.
 *
 * @route GET /admin/render-jobs/:id
 * @access Admin
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
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

    // Retrieve the job
    const job = await renderJobService.getRenderJob(jobId)

    if (!job) {
      return res.status(404).json({
        type: "not_found",
        message: `Render job with ID ${jobId} not found`,
        code: "JOB_NOT_FOUND"
      })
    }

    // Calculate progress based on status
    let progress = 0
    switch (job.status) {
      case "pending":
        progress = 0
        break
      case "compositing":
        progress = 25
        break
      case "rendering":
        progress = 50
        break
      case "completed":
        progress = 100
        break
      case "failed":
        progress = 0
        break
    }

    // Parse metadata to extract rendered image URLs if available
    const metadata = (job.metadata as Record<string, any>) || {}
    const renderedImageUrls: string[] = []

    // If job has rendered_image_url (single URL in DB), parse it as the first image
    // Note: The model schema currently has rendered_image_url as single text field
    // For multiple images, we rely on metadata.media_ids or other workflow outputs
    if (job.rendered_image_url) {
      renderedImageUrls.push(job.rendered_image_url)
    }

    // Construct response
    const response = {
      render_job: {
        id: job.id,
        status: job.status,
        progress,
        product_id: job.product_id,
        preset: job.preset,
        design_file_url: job.design_file_url || undefined,
        composited_file_url: job.composited_file_url || undefined,
        rendered_image_urls: renderedImageUrls.length > 0 ? renderedImageUrls : undefined,
        animation_file_url: job.animation_url || undefined,
        error_message: job.error_message || undefined,
        created_at: job.created_at,
        started_at: job.started_at || undefined,
        completed_at: job.completed_at || undefined
      }
    }

    return res.status(200).json(response)

  } catch (error) {
    console.error("[Get Render Job Status] Error:", error)

    return res.status(500).json({
      type: "internal_error",
      message: error instanceof Error ? error.message : "Failed to retrieve render job status",
      code: "INTERNAL_ERROR"
    })
  }
}
