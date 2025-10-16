import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import type { InferEntityType, Logger } from "@medusajs/framework/types"
import RenderJob from "../models/render-job"
import { PresetType, RenderJobStatus } from "../types"

/**
 * Validated status transitions map
 * Defines which status transitions are allowed
 */
const VALID_STATUS_TRANSITIONS: Record<RenderJobStatus, RenderJobStatus[]> = {
  pending: ["compositing", "failed"],
  compositing: ["rendering", "failed"],
  rendering: ["completed", "failed"],
  completed: [], // Terminal state
  failed: [] // Terminal state
}

type RenderJobEntity = InferEntityType<typeof RenderJob>

type InjectedDependencies = {
  logger: Logger
}

/**
 * Input for creating a new render job
 */
export type CreateRenderJobInput = {
  product_id: string
  variant_id?: string | null
  design_file_url?: string | null
  preset: PresetType
  template_id?: string | null
  metadata?: Record<string, any> | null
}

/**
 * Filters for listing render jobs with pagination and sorting
 */
export type RenderJobFilters = {
  product_id?: string
  status?: RenderJobStatus | RenderJobStatus[]
  limit?: number
  offset?: number
  order?: 'ASC' | 'DESC'
}

/**
 * Result data for render job updates
 */
export type RenderJobResults = {
  composited_file_url?: string | null
  rendered_image_url?: string | null
  animation_url?: string | null
}

/**
 * Statistics for render jobs by product
 */
export type RenderJobStats = {
  total: number
  completed: number
  failed: number
  pending: number
  compositing: number
  rendering: number
}

/**
 * Input for updating render job status
 */
export type UpdateJobStatusInput = {
  composited_file_url?: string | null
  rendered_image_url?: string | null
  animation_url?: string | null
  error_message?: string | null
  started_at?: Date | null
  completed_at?: Date | null
}

/**
 * Filters for listing render jobs
 */
export type ListRenderJobsFilters = {
  product_id?: string | string[]
  variant_id?: string | string[]
  status?: RenderJobStatus | RenderJobStatus[]
}

/**
 * Render Job Service
 *
 * Manages render jobs for t-shirt design rendering using Blender.
 * Provides CRUD operations, status management, and job queries.
 *
 * @service
 */
export default class RenderJobService extends MedusaService({
  RenderJob
}) {
  protected readonly logger_: Logger

  constructor(dependencies: InjectedDependencies) {
    super(dependencies)
    this.logger_ = dependencies.logger
  }

  /**
   * Create a new render job
   *
   * @param data - Render job creation data
   * @returns Created render job
   * @throws {MedusaError} If validation fails
   */
  async createRenderJob(data: CreateRenderJobInput): Promise<RenderJobEntity> {
    // Validate required fields
    this.validateCreateInput(data)

    // Create the job with default status 'pending'
    const job = await this.createRenderJobs({
      product_id: data.product_id,
      variant_id: data.variant_id ?? null,
      design_file_url: data.design_file_url ?? null,
      preset: data.preset,
      template_id: data.template_id ?? null,
      status: "pending",
      composited_file_url: null,
      rendered_image_url: null,
      animation_url: null,
      error_message: null,
      started_at: null,
      completed_at: null,
      metadata: data.metadata ?? null
    })

    this.logger_.info(`Created render job ${job.id} for product ${data.product_id}`)

    return job
  }

  /**
   * Get a render job by ID
   *
   * @param id - Render job ID
   * @returns Render job or null if not found
   */
  async getRenderJob(id: string): Promise<RenderJobEntity | null> {
    if (!id || typeof id !== "string" || !id.trim()) {
      return null
    }

    const [job] = await this.listRenderJobs(
      { id } as any,
      { take: 1 }
    )

    return job || null
  }

  /**
   * List render jobs with optional filters
   *
   * @param filters - Query filters
   * @returns Object with jobs array and total count
   */
  async listRenderJobsWithCount(filters?: {
    product_id?: string
    variant_id?: string
    status?: RenderJobStatus
    limit?: number
    offset?: number
  }): Promise<{ jobs: RenderJobEntity[]; count: number }> {
    const limit = filters?.limit ?? 50
    const offset = filters?.offset ?? 0

    // Build query filters
    const queryFilters: ListRenderJobsFilters = {}

    if (filters?.product_id) {
      queryFilters.product_id = filters.product_id
    }

    if (filters?.variant_id) {
      queryFilters.variant_id = filters.variant_id
    }

    if (filters?.status) {
      queryFilters.status = filters.status
    }

    // Execute query with pagination
    const [jobs, count] = await this.listAndCountRenderJobs(
      queryFilters,
      {
        take: limit,
        skip: offset,
        order: { created_at: "DESC" }
      }
    )

    return { jobs, count }
  }

  /**
   * Delete a render job by ID
   *
   * @param id - Render job ID to delete
   * @throws {MedusaError} If job not found
   */
  async deleteRenderJob(id: string): Promise<void> {
    if (!id || typeof id !== "string" || !id.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Render job ID is required for deletion"
      )
    }

    // Check if job exists
    const job = await this.getRenderJob(id)

    if (!job) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Render job with ID ${id} not found`
      )
    }

    await this.deleteRenderJobs(id)

    this.logger_.info(`Deleted render job ${id}`)
  }

  /**
   * Update render job status with optional additional data
   *
   * @param jobId - Render job ID
   * @param status - New status
   * @param data - Optional additional data to update
   * @returns Updated render job
   * @throws {MedusaError} If validation fails or invalid status transition
   */
  async updateJobStatus(
    jobId: string,
    status: RenderJobStatus,
    data?: UpdateJobStatusInput
  ): Promise<RenderJobEntity> {
    // Get existing job
    const job = await this.getRenderJob(jobId)

    if (!job) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Render job with ID ${jobId} not found`
      )
    }

    // Validate status transition
    this.validateStatusTransition(job.status, status)

    // Prepare update data
    const updateData: Partial<RenderJobEntity> = {
      id: jobId,
      status
    }

    // Add optional fields if provided
    if (data?.composited_file_url !== undefined) {
      updateData.composited_file_url = data.composited_file_url
    }
    if (data?.rendered_image_url !== undefined) {
      updateData.rendered_image_url = data.rendered_image_url
    }
    if (data?.animation_url !== undefined) {
      updateData.animation_url = data.animation_url
    }
    if (data?.error_message !== undefined) {
      updateData.error_message = data.error_message
    }

    // Handle automatic timestamp updates based on status
    if (status === "compositing" && job.status === "pending" && !job.started_at) {
      updateData.started_at = data?.started_at ?? new Date()
    }

    if ((status === "completed" || status === "failed") && !job.completed_at) {
      updateData.completed_at = data?.completed_at ?? new Date()
    }

    // Allow manual timestamp overrides
    if (data?.started_at !== undefined) {
      updateData.started_at = data.started_at
    }
    if (data?.completed_at !== undefined) {
      updateData.completed_at = data.completed_at
    }

    // Perform update
    const updated = await this.updateRenderJobs(updateData)

    this.logger_.info(
      `Updated render job ${jobId} status from ${job.status} to ${status}`
    )

    return updated
  }

  /**
   * Get all render jobs for a specific product
   *
   * @param productId - Product ID
   * @returns Array of render jobs
   */
  async getJobsByProduct(productId: string): Promise<RenderJobEntity[]> {
    if (!productId || typeof productId !== "string" || !productId.trim()) {
      return []
    }

    return this.listRenderJobs({
      product_id: productId
    }, {
      order: { created_at: "DESC" }
    })
  }

  /**
   * Get all render jobs with a specific status
   *
   * @param status - Render job status
   * @returns Array of render jobs
   */
  async getJobsByStatus(status: RenderJobStatus): Promise<RenderJobEntity[]> {
    return this.listRenderJobs({
      status
    }, {
      order: { created_at: "ASC" }
    })
  }

  /**
   * Get all active jobs (pending, compositing, or rendering)
   *
   * @returns Array of active render jobs
   */
  async getActiveJobs(): Promise<RenderJobEntity[]> {
    return this.listRenderJobs({
      status: ["pending", "compositing", "rendering"]
    }, {
      order: { created_at: "ASC" }
    })
  }

  /**
   * Update render job with render results (output files)
   *
   * @param id - Render job ID
   * @param results - Render output URLs
   * @returns Updated render job
   * @throws {MedusaError} If job not found
   */
  async updateJobResults(
    id: string,
    results: RenderJobResults
  ): Promise<RenderJobEntity> {
    const job = await this.getRenderJob(id)

    if (!job) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Render job with ID ${id} not found`
      )
    }

    const updateData: Partial<RenderJobEntity> = {
      id
    }

    if (results.composited_file_url !== undefined) {
      updateData.composited_file_url = results.composited_file_url
    }

    if (results.rendered_image_url !== undefined) {
      updateData.rendered_image_url = results.rendered_image_url
    }

    if (results.animation_url !== undefined) {
      updateData.animation_url = results.animation_url
    }

    const updated = await this.updateRenderJobs(updateData)

    this.logger_.info(`Updated render job ${id} with results`)

    return updated
  }

  /**
   * Get statistics for render jobs by product
   *
   * @param productId - Product ID
   * @returns Statistics object with counts by status
   */
  async getProductRenderStats(productId: string): Promise<RenderJobStats> {
    if (!productId || typeof productId !== "string" || !productId.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "product_id is required"
      )
    }

    const jobs = await this.getJobsByProduct(productId)

    const stats: RenderJobStats = {
      total: jobs.length,
      completed: 0,
      failed: 0,
      pending: 0,
      compositing: 0,
      rendering: 0
    }

    for (const job of jobs) {
      switch (job.status) {
        case "completed":
          stats.completed++
          break
        case "failed":
          stats.failed++
          break
        case "pending":
          stats.pending++
          break
        case "compositing":
          stats.compositing++
          break
        case "rendering":
          stats.rendering++
          break
      }
    }

    return stats
  }

  /**
   * Get recent render jobs (created within last N hours)
   *
   * @param hours - Number of hours to look back (default: 24)
   * @param limit - Maximum number of jobs to return (default: 50)
   * @returns Array of recent render jobs
   */
  async getRecentRenderJobs(
    hours: number = 24,
    limit: number = 50
  ): Promise<RenderJobEntity[]> {
    if (hours <= 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "hours must be greater than 0"
      )
    }

    const cutoffDate = new Date()
    cutoffDate.setHours(cutoffDate.getHours() - hours)

    // Use the base listRenderJobs method with filters
    const jobs = await this.listRenderJobs(
      {} as ListRenderJobsFilters,
      {
        take: limit,
        order: { created_at: "DESC" }
      }
    )

    // Filter by date in memory (MikroORM date filtering)
    return jobs.filter(job => {
      const createdAt = new Date(job.created_at)
      return createdAt >= cutoffDate
    })
  }

  /**
   * Check if a product has any active render jobs
   *
   * @param productId - Product ID
   * @returns True if product has any pending, compositing, or rendering jobs
   */
  async hasActiveRenders(productId: string): Promise<boolean> {
    if (!productId || typeof productId !== "string" || !productId.trim()) {
      return false
    }

    const activeJobs = await this.listRenderJobs({
      product_id: productId,
      status: ["pending", "compositing", "rendering"]
    }, {
      take: 1
    })

    return activeJobs.length > 0
  }

  /**
   * Clean up old failed jobs
   *
   * @param olderThanDays - Delete jobs older than this many days
   * @returns Number of jobs deleted
   */
  async cleanupOldJobs(olderThanDays: number): Promise<number> {
    if (olderThanDays <= 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "olderThanDays must be greater than 0"
      )
    }

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    // Get all failed jobs
    const failedJobs = await this.getJobsByStatus("failed")

    // Filter to only old jobs
    const oldJobs = failedJobs.filter(job => {
      const completedAt = job.completed_at ? new Date(job.completed_at) : null
      return completedAt && completedAt < cutoffDate
    })

    // Delete each old job
    for (const job of oldJobs) {
      await this.deleteRenderJobs(job.id)
    }

    this.logger_.info(
      `Cleaned up ${oldJobs.length} failed render jobs older than ${olderThanDays} days`
    )

    return oldJobs.length
  }

  /**
   * Retry a failed render job by creating a new job with same configuration
   *
   * @param id - ID of the failed job to retry
   * @returns New render job created from the failed job
   * @throws {MedusaError} If original job not found or not in failed state
   */
  async retryRenderJob(id: string): Promise<RenderJobEntity> {
    const originalJob = await this.getRenderJob(id)

    if (!originalJob) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Render job with ID ${id} not found`
      )
    }

    if (originalJob.status !== "failed") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cannot retry job ${id}: job status is '${originalJob.status}', must be 'failed'`
      )
    }

    // Create new job with same configuration
    const newJob = await this.createRenderJob({
      product_id: originalJob.product_id,
      variant_id: originalJob.variant_id,
      design_file_url: originalJob.design_file_url,
      preset: originalJob.preset,
      template_id: originalJob.template_id,
      metadata: {
        ...((originalJob.metadata as Record<string, any>) || {}),
        retried_from: originalJob.id,
        retry_count: (((originalJob.metadata as Record<string, any>)?.retry_count as number) || 0) + 1
      }
    })

    this.logger_.info(`Created retry job ${newJob.id} from failed job ${id}`)

    return newJob
  }

  /**
   * List render jobs for a specific product with filters
   *
   * @param productId - Product ID
   * @param filters - Optional filters
   * @returns Array of render jobs
   */
  async listRenderJobsByProduct(
    productId: string,
    filters?: Omit<RenderJobFilters, 'product_id'>
  ): Promise<RenderJobEntity[]> {
    if (!productId || typeof productId !== "string" || !productId.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "product_id is required"
      )
    }

    const limit = filters?.limit ?? 50
    const offset = filters?.offset ?? 0
    const order = filters?.order ?? 'DESC'

    const queryFilters: ListRenderJobsFilters = {
      product_id: productId
    }

    if (filters?.status) {
      queryFilters.status = filters.status
    }

    return this.listRenderJobs(queryFilters, {
      take: limit,
      skip: offset,
      order: { created_at: order }
    })
  }

  /**
   * Validate render job creation input
   *
   * @param data - Input data to validate
   * @throws {MedusaError} If validation fails
   */
  protected validateCreateInput(data: CreateRenderJobInput): void {
    if (!data.product_id || typeof data.product_id !== "string" || !data.product_id.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "product_id is required and must be a non-empty string"
      )
    }

    // design_file_url is optional during creation (will be set after upload)
    // But if provided, it must be a valid URL
    if (data.design_file_url !== null && data.design_file_url !== undefined) {
      if (typeof data.design_file_url !== "string" || !data.design_file_url.trim()) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "design_file_url must be a non-empty string when provided"
        )
      }

      // Validate URL format
      try {
        new URL(data.design_file_url)
      } catch (error) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `design_file_url must be a valid URL: ${data.design_file_url}`
        )
      }
    }

    if (!data.preset || typeof data.preset !== "string") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "preset is required and must be a valid preset type"
      )
    }

    // Validate preset is one of the allowed types (all 9 presets)
    const validPresets: PresetType[] = [
      "chest-small",
      "chest-medium",
      "chest-large",
      "back-small",
      "back-medium",
      "back-large",
      "back-bottom-small",
      "back-bottom-medium",
      "back-bottom-large"
    ]
    if (!validPresets.includes(data.preset)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `preset must be one of: ${validPresets.join(", ")}`
      )
    }
  }

  /**
   * Validate status transition
   *
   * @param currentStatus - Current job status
   * @param newStatus - Desired new status
   * @throws {MedusaError} If transition is invalid
   */
  protected validateStatusTransition(
    currentStatus: RenderJobStatus,
    newStatus: RenderJobStatus
  ): void {
    // Allow staying in same status (idempotent updates)
    if (currentStatus === newStatus) {
      return
    }

    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || []

    if (!allowedTransitions.includes(newStatus)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid status transition: cannot change from '${currentStatus}' to '${newStatus}'. ` +
        `Allowed transitions: ${allowedTransitions.length ? allowedTransitions.join(", ") : "none (terminal state)"}`
      )
    }
  }
}
