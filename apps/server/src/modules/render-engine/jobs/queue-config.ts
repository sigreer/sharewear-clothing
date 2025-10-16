/**
 * Bull Queue Configuration for Render Engine
 *
 * Configures the Bull queue for processing render jobs with:
 * - Redis connection
 * - Retry logic with exponential backoff
 * - Concurrency limits (max 2 concurrent renders)
 * - Job timeout (5 minutes)
 */

import Bull, { Queue, QueueOptions, JobOptions } from "bull"

/**
 * Queue name constant
 */
export const RENDER_QUEUE_NAME = "render-engine"

/**
 * Default job options for render queue
 */
export const DEFAULT_JOB_OPTIONS: JobOptions = {
  attempts: 3, // Retry up to 3 times
  backoff: {
    type: "exponential",
    delay: 2000 // Start with 2 second delay, doubles each retry
  },
  timeout: 5 * 60 * 1000, // 5 minutes timeout
  removeOnComplete: {
    age: 24 * 60 * 60, // Keep completed jobs for 24 hours
    count: 100 // Keep max 100 completed jobs
  },
  removeOnFail: {
    age: 7 * 24 * 60 * 60 // Keep failed jobs for 7 days
  }
}

/**
 * Queue options for Bull
 */
export const QUEUE_OPTIONS: QueueOptions = {
  redis: {
    host: process.env.REDIS_HOST || "sharewear.local",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || "0"),
    // Connection retry strategy
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000)
      return delay
    },
    // Enable offline queue
    enableOfflineQueue: true,
    // Connection timeout
    connectTimeout: 10000
  },
  prefix: "bull", // Queue key prefix in Redis
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
  // Enable queue settings
  settings: {
    // Stale check interval (check for stalled jobs every 30 seconds)
    stalledInterval: 30000,
    // Max stalled count before job is considered failed
    maxStalledCount: 1,
    // Guard interval (prevent duplicate job processing)
    guardInterval: 5000,
    // Retry process delay on failure
    retryProcessDelay: 5000
  }
}

/**
 * Render job data structure
 */
export interface RenderJobData {
  jobId: string
  productId: string
  designFile: Buffer
  designFilename: string
  designMimetype: string
  preset: string
  templatePath: string
  blendFile: string
  fabricColor?: string
  backgroundColor?: string
  renderMode?: string
  samples?: number
  metadata?: Record<string, any>
}

/**
 * Render job result structure
 */
export interface RenderJobResult {
  jobId: string
  status: "completed" | "failed"
  mediaIds?: string[]
  renderedImageUrls?: string[]
  animationUrl?: string
  error?: string
}

let renderQueue: Queue<RenderJobData> | null = null

/**
 * Get or create the render queue instance
 *
 * @returns Bull queue instance
 */
export function getRenderQueue(): Queue<RenderJobData> {
  if (!renderQueue) {
    renderQueue = new Bull<RenderJobData>(RENDER_QUEUE_NAME, QUEUE_OPTIONS)

    // Setup event listeners for monitoring
    renderQueue.on("error", (error) => {
      console.error(`[RenderQueue] Queue error:`, error)
    })

    renderQueue.on("waiting", (jobId) => {
      console.log(`[RenderQueue] Job ${jobId} is waiting`)
    })

    renderQueue.on("active", (job) => {
      console.log(`[RenderQueue] Job ${job.id} started processing`)
    })

    renderQueue.on("completed", (job, result: RenderJobResult) => {
      console.log(`[RenderQueue] Job ${job.id} completed:`, result)
    })

    renderQueue.on("failed", (job, error) => {
      console.error(`[RenderQueue] Job ${job?.id} failed:`, error.message)
    })

    renderQueue.on("stalled", (job) => {
      console.warn(`[RenderQueue] Job ${job.id} stalled`)
    })
  }

  return renderQueue
}

/**
 * Close the render queue connection
 */
export async function closeRenderQueue(): Promise<void> {
  if (renderQueue) {
    await renderQueue.close()
    renderQueue = null
  }
}

/**
 * Add a render job to the queue
 *
 * @param data - Render job data
 * @param options - Optional job options (overrides defaults)
 * @returns Bull job instance
 */
export async function addRenderJob(
  data: RenderJobData,
  options?: JobOptions
): Promise<Bull.Job<RenderJobData>> {
  const queue = getRenderQueue()

  return queue.add(data, {
    ...DEFAULT_JOB_OPTIONS,
    ...options,
    jobId: data.jobId // Use render job ID as Bull job ID for tracking
  })
}

/**
 * Get job status from queue
 *
 * @param jobId - Render job ID
 * @returns Job status or null if not found
 */
export async function getQueueJobStatus(
  jobId: string
): Promise<string | null> {
  const queue = getRenderQueue()
  const job = await queue.getJob(jobId)

  if (!job) {
    return null
  }

  const state = await job.getState()
  return state
}

/**
 * Remove a job from the queue
 *
 * @param jobId - Render job ID
 * @returns True if removed, false if not found
 */
export async function removeQueueJob(jobId: string): Promise<boolean> {
  const queue = getRenderQueue()
  const job = await queue.getJob(jobId)

  if (!job) {
    return false
  }

  await job.remove()
  return true
}

/**
 * Get queue metrics for monitoring
 *
 * @returns Queue statistics
 */
export async function getQueueMetrics() {
  const queue = getRenderQueue()

  const [
    waiting,
    active,
    completed,
    failed,
    delayed,
    paused
  ] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
    queue.getPausedCount()
  ])

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    paused,
    total: waiting + active + completed + failed + delayed + paused
  }
}

/**
 * Pause the queue (stop processing new jobs)
 */
export async function pauseQueue(): Promise<void> {
  const queue = getRenderQueue()
  await queue.pause()
}

/**
 * Resume the queue (start processing jobs)
 */
export async function resumeQueue(): Promise<void> {
  const queue = getRenderQueue()
  await queue.resume()
}

/**
 * Clean old completed jobs from the queue
 *
 * @param gracePeriod - Time in milliseconds to keep jobs (default: 24 hours)
 * @returns Number of jobs cleaned
 */
export async function cleanCompletedJobs(
  gracePeriod: number = 24 * 60 * 60 * 1000
): Promise<number> {
  const queue = getRenderQueue()
  const jobs = await queue.clean(gracePeriod, "completed")
  return jobs.length
}

/**
 * Clean old failed jobs from the queue
 *
 * @param gracePeriod - Time in milliseconds to keep jobs (default: 7 days)
 * @returns Number of jobs cleaned
 */
export async function cleanFailedJobs(
  gracePeriod: number = 7 * 24 * 60 * 60 * 1000
): Promise<number> {
  const queue = getRenderQueue()
  const jobs = await queue.clean(gracePeriod, "failed")
  return jobs.length
}
