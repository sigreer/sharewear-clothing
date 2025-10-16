import { useState, useEffect, useCallback, useRef } from "react"
import {
  createStandardError,
  logError,
  httpStatusToErrorType,
  StandardError,
} from "../utils/error-messages"

/**
 * Render job status from backend
 */
export type RenderJobStatus = 'idle' | 'submitting' | 'pending' | 'compositing' | 'rendering' | 'completed' | 'failed'

/**
 * Render job data structure returned from API
 */
export interface RenderJobData {
  id: string
  status: 'pending' | 'compositing' | 'rendering' | 'completed' | 'failed'
  progress?: number
  product_id: string
  preset: string
  design_file_url?: string
  composited_file_url?: string
  rendered_image_urls?: string[]
  animation_file_url?: string
  error_message?: string
  created_at: string
  started_at?: string
  completed_at?: string
}

/**
 * Hook return type
 */
export interface UseRenderJobReturn {
  // State
  jobId: string | null
  status: RenderJobStatus
  progress: number
  errorMessage: string | null
  error: StandardError | null
  resultUrls: string[]
  animationUrl: string | null

  // Actions
  submitJob: (file: File, productId: string, preset: string) => Promise<void>
  cancelJob: () => Promise<void>
  retry: () => Promise<void>

  // Flags
  isLoading: boolean
  isPolling: boolean
  canCancel: boolean
}

/**
 * Configuration for the render job hook
 */
export interface UseRenderJobConfig {
  /** Polling interval in milliseconds (default: 2000) */
  pollingInterval?: number
  /** Callback when job completes successfully */
  onComplete?: (jobData: RenderJobData) => void
  /** Callback when job fails */
  onError?: (error: Error) => void
}

/**
 * Custom hook for managing render job submission, polling, and status tracking
 *
 * Features:
 * - Automatic job submission with file upload
 * - Real-time status polling every 2 seconds
 * - Progress tracking (0-100%)
 * - Error handling and retry capability
 * - Job cancellation for pending jobs
 * - Cleanup on unmount
 *
 * @example
 * ```tsx
 * const {
 *   status,
 *   progress,
 *   submitJob,
 *   resultUrls,
 * } = useRenderJob({
 *   onComplete: (job) => console.log("Job completed:", job),
 *   onError: (error) => console.error("Job failed:", error)
 * })
 *
 * // Submit a job
 * await submitJob(file, productId, 'center-chest')
 * ```
 */
export function useRenderJob(config: UseRenderJobConfig = {}): UseRenderJobReturn {
  const {
    pollingInterval = 2000,
    onComplete,
    onError
  } = config

  // State
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<RenderJobStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [error, setError] = useState<StandardError | null>(null)
  const [resultUrls, setResultUrls] = useState<string[]>([])
  const [animationUrl, setAnimationUrl] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)

  // Refs for cleanup
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)
  const lastSubmitParamsRef = useRef<{ file: File; productId: string; preset: string } | null>(null)

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    setIsPolling(false)
  }, [])

  /**
   * Poll job status from backend
   */
  const pollJobStatus = useCallback(async (currentJobId: string) => {
    try {
      const response = await fetch(`/admin/render-jobs/${currentJobId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch job status: ${response.statusText}`)
      }

      const data = await response.json()
      const jobData = data.render_job as RenderJobData

      if (!isMountedRef.current) return

      // Update state
      setStatus(jobData.status)
      setProgress(jobData.progress || 0)

      // Handle completion
      if (jobData.status === 'completed') {
        setResultUrls(jobData.rendered_image_urls || [])
        setAnimationUrl(jobData.animation_file_url || null)
        setProgress(100)
        stopPolling()

        if (onComplete) {
          onComplete(jobData)
        }
      }

      // Handle failure
      if (jobData.status === 'failed') {
        setErrorMessage(jobData.error_message || 'Render job failed')
        const standardError = createStandardError('RENDERING_FAILED', jobData.error_message || 'Render job failed')
        setError(standardError)
        logError(standardError, {
          jobId: currentJobId,
          status: jobData.status,
        })
        stopPolling()

        if (onError) {
          onError(new Error(jobData.error_message || 'Render job failed'))
        }
      }

    } catch (error) {
      console.error('[useRenderJob] Polling error:', error)

      if (!isMountedRef.current) return

      // Log network errors but don't stop polling - might be temporary
      if (error instanceof Error) {
        const standardError = createStandardError('NETWORK_ERROR', error.message)
        logError(standardError, {
          jobId: currentJobId,
          context: 'polling',
        })
      }

      // Don't stop polling on network errors - might be temporary
      // User can cancel manually if needed
    }
  }, [onComplete, onError, stopPolling])

  /**
   * Start polling job status
   */
  const startPolling = useCallback((currentJobId: string) => {
    // Stop any existing polling
    stopPolling()

    setIsPolling(true)

    // Poll immediately
    pollJobStatus(currentJobId)

    // Set up interval for continued polling
    pollingIntervalRef.current = setInterval(() => {
      pollJobStatus(currentJobId)
    }, pollingInterval)
  }, [pollingInterval, pollJobStatus, stopPolling])

  /**
   * Submit render job to backend
   */
  const submitJob = useCallback(async (file: File, productId: string, preset: string) => {
    try {
      // Reset state
      setStatus('submitting')
      setProgress(0)
      setErrorMessage(null)
      setError(null)
      setResultUrls([])
      setAnimationUrl(null)

      // Store params for retry
      lastSubmitParamsRef.current = { file, productId, preset }

      // Create form data
      const formData = new FormData()
      formData.append('design_file', file)
      formData.append('product_id', productId)
      formData.append('preset', preset)

      // Submit to backend
      const response = await fetch('/admin/render-jobs', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorType = httpStatusToErrorType(response.status)
        const errorMessage = errorData.message || `Failed to create render job: ${response.statusText}`
        const standardError = createStandardError(errorType, errorMessage)
        setError(standardError)
        logError(standardError, {
          productId,
          preset,
          fileName: file.name,
          statusCode: response.status,
        })
        throw new Error(errorMessage)
      }

      const data = await response.json()
      const createdJobId = data.render_job.id

      if (!isMountedRef.current) return

      setJobId(createdJobId)
      setStatus('pending')

      // Start polling for status updates
      startPolling(createdJobId)

    } catch (error) {
      console.error('[useRenderJob] Submit error:', error)

      if (!isMountedRef.current) return

      const message = error instanceof Error ? error.message : 'Failed to submit render job'
      setStatus('failed')
      setErrorMessage(message)

      // Set error if not already set
      if (!error) {
        const standardError = createStandardError('SERVER_ERROR', message)
        setError(standardError)
        logError(standardError, {
          productId,
          preset,
          fileName: file.name,
        })
      }

      if (onError) {
        onError(error instanceof Error ? error : new Error(message))
      }
    }
  }, [startPolling, onError])

  /**
   * Cancel the current render job (only works for pending jobs)
   */
  const cancelJob = useCallback(async () => {
    if (!jobId) return

    try {
      const response = await fetch(`/admin/render-jobs/${jobId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        const errorType = httpStatusToErrorType(response.status)
        const errorMessage = `Failed to cancel job: ${response.statusText}`
        const standardError = createStandardError(errorType, errorMessage)
        setError(standardError)
        logError(standardError, {
          jobId,
          context: 'cancellation',
        })
        throw new Error(errorMessage)
      }

      if (!isMountedRef.current) return

      stopPolling()
      setStatus('failed')
      setErrorMessage('Job cancelled by user')
      const standardError = createStandardError('CANCELLED')
      setError(standardError)

    } catch (error) {
      console.error('[useRenderJob] Cancel error:', error)

      if (!isMountedRef.current) return

      const message = error instanceof Error ? error.message : 'Failed to cancel render job'
      setErrorMessage(message)

      if (!error) {
        const standardError = createStandardError('SERVER_ERROR', message)
        setError(standardError)
        logError(standardError, {
          jobId,
          context: 'cancellation',
        })
      }
    }
  }, [jobId, stopPolling])

  /**
   * Retry the last failed submission
   */
  const retry = useCallback(async () => {
    if (!lastSubmitParamsRef.current) return

    const { file, productId, preset } = lastSubmitParamsRef.current
    await submitJob(file, productId, preset)
  }, [submitJob])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      stopPolling()
    }
  }, [stopPolling])

  return {
    // State
    jobId,
    status,
    progress,
    errorMessage,
    error,
    resultUrls,
    animationUrl,

    // Actions
    submitJob,
    cancelJob,
    retry,

    // Flags
    isLoading: status === 'submitting',
    isPolling,
    canCancel: status === 'pending',
  }
}
