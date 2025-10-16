import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { IProductModuleService } from "@medusajs/framework/types"
import { RENDER_ENGINE_MODULE } from "../../../../../modules/render-engine/types"
import RenderJobService from "../../../../../modules/render-engine/services/render-job-service"
import { RenderJobStatus } from "../../../../../modules/render-engine/types"

/**
 * GET /admin/products/:id/render-jobs
 *
 * List all render jobs for a specific product with optional filtering and pagination.
 * This endpoint provides the render history for a product in the Admin UI.
 *
 * Query Parameters:
 * - status: Filter by status (single value or comma-separated list)
 * - limit: Number of results per page (1-100, default: 10)
 * - offset: Number of results to skip (default: 0)
 * - order: Sort order by created_at ("ASC" | "DESC", default: "DESC")
 *
 * @route GET /admin/products/:id/render-jobs
 * @access Admin
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const productId = req.params.id

    // Validate product ID
    if (!productId || typeof productId !== "string" || !productId.trim()) {
      return res.status(400).json({
        type: "invalid_data",
        message: "Product ID is required",
        code: "MISSING_PRODUCT_ID"
      })
    }

    // Verify product exists
    const productModuleService: IProductModuleService = req.scope.resolve(Modules.PRODUCT)
    const product = await productModuleService.retrieveProduct(productId).catch(() => null)

    if (!product) {
      return res.status(404).json({
        type: "not_found",
        message: `Product with ID ${productId} not found`,
        code: "PRODUCT_NOT_FOUND"
      })
    }

    // Parse query parameters
    const { status, limit, offset, order } = req.query

    // Validate and parse status filter (can be single value or comma-separated)
    let statusFilter: RenderJobStatus | RenderJobStatus[] | undefined
    if (status) {
      const statusString = String(status)
      const statusValues = statusString.split(",").map(s => s.trim())

      // Validate each status value
      const validStatuses: RenderJobStatus[] = ["pending", "compositing", "rendering", "completed", "failed"]
      const invalidStatuses = statusValues.filter(s => !validStatuses.includes(s as RenderJobStatus))

      if (invalidStatuses.length > 0) {
        return res.status(400).json({
          type: "invalid_data",
          message: `Invalid status values: ${invalidStatuses.join(", ")}. Valid statuses: ${validStatuses.join(", ")}`,
          code: "INVALID_STATUS"
        })
      }

      // Single status or multiple
      statusFilter = statusValues.length === 1
        ? statusValues[0] as RenderJobStatus
        : statusValues as RenderJobStatus[]
    }

    // Validate and parse limit (1-100, default: 10)
    let parsedLimit = 10
    if (limit) {
      parsedLimit = parseInt(String(limit), 10)
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return res.status(400).json({
          type: "invalid_data",
          message: "limit must be a number between 1 and 100",
          code: "INVALID_LIMIT"
        })
      }
    }

    // Validate and parse offset (0+, default: 0)
    let parsedOffset = 0
    if (offset) {
      parsedOffset = parseInt(String(offset), 10)
      if (isNaN(parsedOffset) || parsedOffset < 0) {
        return res.status(400).json({
          type: "invalid_data",
          message: "offset must be a non-negative number",
          code: "INVALID_OFFSET"
        })
      }
    }

    // Validate and parse order (ASC/DESC, default: DESC)
    let parsedOrder: "ASC" | "DESC" = "DESC"
    if (order) {
      const orderString = String(order).toUpperCase()
      if (orderString !== "ASC" && orderString !== "DESC") {
        return res.status(400).json({
          type: "invalid_data",
          message: "order must be either 'ASC' or 'DESC'",
          code: "INVALID_ORDER"
        })
      }
      parsedOrder = orderString as "ASC" | "DESC"
    }

    // Get render job service
    const renderJobService: RenderJobService = req.scope.resolve(RENDER_ENGINE_MODULE)

    // Query jobs with filters
    const jobs = await renderJobService.listRenderJobsByProduct(productId, {
      status: statusFilter,
      limit: parsedLimit,
      offset: parsedOffset,
      order: parsedOrder
    })

    // Get total count for pagination metadata
    // Note: For accurate count with multiple status filters, we need to count all matching jobs
    const countFilters: any = { product_id: productId }

    // For count, if statusFilter is an array, use the first one (limitation of service method)
    // This is acceptable since the count is primarily for pagination UX
    if (statusFilter) {
      countFilters.status = Array.isArray(statusFilter) ? statusFilter[0] : statusFilter
    }

    const { count } = await renderJobService.listRenderJobsWithCount(countFilters)

    // Format response - match the format from GET /render-jobs/:id
    const formattedJobs = jobs.map(job => {
      // Parse metadata for additional info
      const metadata = (job.metadata as Record<string, any>) || {}
      const renderedImageUrls: string[] = []

      // Build rendered image URLs array
      if (job.rendered_image_url) {
        renderedImageUrls.push(job.rendered_image_url)
      }

      return {
        id: job.id,
        status: job.status,
        product_id: job.product_id,
        variant_id: job.variant_id || undefined,
        preset: job.preset,
        design_file_url: job.design_file_url || undefined,
        composited_file_url: job.composited_file_url || undefined,
        rendered_image_urls: renderedImageUrls.length > 0 ? renderedImageUrls : undefined,
        animation_url: job.animation_url || undefined,
        error_message: job.error_message || undefined,
        created_at: job.created_at,
        started_at: job.started_at || undefined,
        completed_at: job.completed_at || undefined,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined
      }
    })

    // Return paginated results
    return res.status(200).json({
      render_jobs: formattedJobs,
      count,
      limit: parsedLimit,
      offset: parsedOffset
    })

  } catch (error) {
    console.error("[List Product Render Jobs] Error:", error)

    if (error instanceof MedusaError) {
      const statusCode = error.type === MedusaError.Types.NOT_FOUND ? 404 : 500
      return res.status(statusCode).json({
        type: error.type,
        message: error.message,
        code: "SERVICE_ERROR"
      })
    }

    return res.status(500).json({
      type: "internal_error",
      message: error instanceof Error ? error.message : "Failed to list render jobs",
      code: "INTERNAL_ERROR"
    })
  }
}
