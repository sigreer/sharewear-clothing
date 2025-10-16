import { useState, useEffect, useCallback, useRef } from "react"

/**
 * Render job data structure for history display
 */
export interface RenderHistoryJob {
  id: string
  status: 'pending' | 'compositing' | 'rendering' | 'completed' | 'failed'
  progress?: number
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
 * API response structure for render jobs list
 */
export interface RenderJobsResponse {
  render_jobs: RenderHistoryJob[]
  count: number
  limit: number
  offset: number
}

/**
 * Pagination state
 */
export interface PaginationState {
  currentPage: number
  totalPages: number
  totalCount: number
  pageSize: number
}

/**
 * Hook return type
 */
export interface UseRenderHistoryReturn {
  // Data
  jobs: RenderHistoryJob[]
  pagination: PaginationState

  // State
  isLoading: boolean
  error: Error | null
  filter: string | null

  // Actions
  fetchJobs: () => Promise<void>
  nextPage: () => void
  prevPage: () => void
  goToPage: (page: number) => void
  setFilter: (status: string | null) => void
  retryJob: (jobId: string) => Promise<void>
  refresh: () => Promise<void>
}

/**
 * Configuration for the render history hook
 */
export interface UseRenderHistoryConfig {
  /** Product ID to fetch render jobs for */
  productId: string
  /** Number of jobs per page (default: 10) */
  pageSize?: number
  /** Initial status filter (default: null = all) */
  initialFilter?: string | null
  /** Auto-refresh interval in milliseconds (default: 0 = disabled) */
  autoRefreshInterval?: number
  /** Callback when retry succeeds */
  onRetrySuccess?: (newJobId: string) => void
  /** Callback when retry fails */
  onRetryError?: (error: Error) => void
}

/**
 * Custom hook for fetching and managing render job history
 *
 * Features:
 * - Paginated job list with configurable page size
 * - Status filtering (all, completed, failed, processing, pending)
 * - Retry failed jobs
 * - Auto-refresh capability
 * - Error handling
 *
 * @example
 * ```tsx
 * const {
 *   jobs,
 *   isLoading,
 *   pagination,
 *   setFilter,
 *   retryJob
 * } = useRenderHistory({
 *   productId: 'prod_123',
 *   pageSize: 10,
 *   onRetrySuccess: (jobId) => console.log('Retry created:', jobId)
 * })
 * ```
 */
export function useRenderHistory(config: UseRenderHistoryConfig): UseRenderHistoryReturn {
  const {
    productId,
    pageSize = 10,
    initialFilter = null,
    autoRefreshInterval = 0,
    onRetrySuccess,
    onRetryError
  } = config

  // State
  const [jobs, setJobs] = useState<RenderHistoryJob[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [filter, setFilter] = useState<string | null>(initialFilter)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Refs
  const isMountedRef = useRef(true)
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const offset = (currentPage - 1) * pageSize

  /**
   * Fetch render jobs from API
   */
  const fetchJobs = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Build query params
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: offset.toString(),
      })

      if (filter) {
        params.append('status', filter)
      }

      const response = await fetch(
        `/admin/products/${productId}/render-jobs?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch render jobs: ${response.statusText}`)
      }

      const data: RenderJobsResponse = await response.json()

      if (!isMountedRef.current) return

      setJobs(data.render_jobs)
      setTotalCount(data.count)
      setIsLoading(false)

    } catch (err) {
      console.error('[useRenderHistory] Fetch error:', err)

      if (!isMountedRef.current) return

      const fetchError = err instanceof Error ? err : new Error('Failed to fetch render jobs')
      setError(fetchError)
      setIsLoading(false)
    }
  }, [productId, pageSize, offset, filter])

  /**
   * Retry a failed render job
   */
  const retryJob = useCallback(async (jobId: string) => {
    try {
      setError(null)

      const response = await fetch(`/admin/render-jobs/${jobId}/retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to retry job: ${response.statusText}`)
      }

      const data = await response.json()
      const newJobId = data.render_job.id

      if (!isMountedRef.current) return

      // Refresh the list to show the new job
      await fetchJobs()

      if (onRetrySuccess) {
        onRetrySuccess(newJobId)
      }

    } catch (err) {
      console.error('[useRenderHistory] Retry error:', err)

      if (!isMountedRef.current) return

      const retryError = err instanceof Error ? err : new Error('Failed to retry render job')
      setError(retryError)

      if (onRetryError) {
        onRetryError(retryError)
      }
    }
  }, [fetchJobs, onRetrySuccess, onRetryError])

  /**
   * Navigation actions
   */
  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1)
    }
  }, [currentPage, totalPages])

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1)
    }
  }, [currentPage])

  const goToPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(validPage)
  }, [totalPages])

  /**
   * Refresh current page
   */
  const refresh = useCallback(async () => {
    await fetchJobs()
  }, [fetchJobs])

  /**
   * Update filter and reset to first page
   */
  const updateFilter = useCallback((status: string | null) => {
    setFilter(status)
    setCurrentPage(1) // Reset to first page when filter changes
  }, [])

  /**
   * Fetch jobs when dependencies change
   */
  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  /**
   * Setup auto-refresh if enabled
   */
  useEffect(() => {
    if (autoRefreshInterval > 0) {
      autoRefreshIntervalRef.current = setInterval(() => {
        fetchJobs()
      }, autoRefreshInterval)

      return () => {
        if (autoRefreshIntervalRef.current) {
          clearInterval(autoRefreshIntervalRef.current)
          autoRefreshIntervalRef.current = null
        }
      }
    }
  }, [autoRefreshInterval, fetchJobs])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current)
      }
    }
  }, [])

  return {
    // Data
    jobs,
    pagination: {
      currentPage,
      totalPages,
      totalCount,
      pageSize,
    },

    // State
    isLoading,
    error,
    filter,

    // Actions
    fetchJobs,
    nextPage,
    prevPage,
    goToPage,
    setFilter: updateFilter,
    retryJob,
    refresh,
  }
}
