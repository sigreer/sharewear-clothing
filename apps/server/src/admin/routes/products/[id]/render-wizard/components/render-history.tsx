import { useMemo, useState } from "react"
import {
  Table,
  Badge,
  Button,
  Select,
  Text,
  Container,
  Heading,
  Tooltip,
  Prompt,
  clx
} from "@medusajs/ui"
import {
  CheckCircleSolid,
  XCircleSolid,
  EllipseMiniSolid,
  ArrowDownTray,
  ExclamationCircle,
  ArrowPath,
  ChevronLeftMini,
  ChevronRightMini,
  Photo
} from "@medusajs/icons"
import { useRenderHistory, type RenderHistoryJob } from "../hooks/use-render-history"

/**
 * Component props
 */
export interface RenderHistoryProps {
  /** Product ID to show render history for */
  productId: string
  /** Number of jobs per page (default: 10) */
  pageSize?: number
  /** Show refresh button (default: true) */
  showRefreshButton?: boolean
  /** Auto-refresh interval in milliseconds (default: 0 = disabled) */
  autoRefreshInterval?: number
  /** Callback when a job is retried */
  onRetry?: (jobId: string) => void
}

/**
 * Status badge color mapping
 */
const STATUS_COLORS = {
  pending: 'blue',
  compositing: 'orange',
  rendering: 'orange',
  completed: 'green',
  failed: 'red',
} as const

/**
 * Status display labels
 */
const STATUS_LABELS = {
  pending: 'Pending',
  compositing: 'Compositing',
  rendering: 'Rendering',
  completed: 'Completed',
  failed: 'Failed',
} as const

/**
 * Preset display labels
 */
const PRESET_LABELS: Record<string, string> = {
  'chest-small': 'Chest Small',
  'chest-medium': 'Chest Medium',
  'chest-large': 'Chest Large',
  'back-small': 'Back Small',
  'back-medium': 'Back Medium',
  'back-large': 'Back Large',
  'back-bottom-small': 'Back Bottom Small',
  'back-bottom-medium': 'Back Bottom Medium',
  'back-bottom-large': 'Back Bottom Large',
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'Just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`
  return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`
}

/**
 * Format full timestamp for tooltip
 */
function formatFullTimestamp(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

/**
 * Status icon component
 */
function StatusIcon({ status }: { status: RenderHistoryJob['status'] }) {
  switch (status) {
    case 'completed':
      return <CheckCircleSolid className="text-ui-fg-success" />
    case 'failed':
      return <XCircleSolid className="text-ui-fg-error" />
    case 'pending':
    case 'compositing':
    case 'rendering':
      return <EllipseMiniSolid className="text-ui-fg-interactive animate-pulse" />
    default:
      return <EllipseMiniSolid className="text-ui-fg-muted" />
  }
}

/**
 * Job thumbnail component
 */
function JobThumbnail({ job }: { job: RenderHistoryJob }) {
  const imageUrl = job.rendered_image_urls?.[0]

  if (job.status === 'completed' && imageUrl) {
    return (
      <a
        href={imageUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-16 h-16 rounded border border-ui-border-base overflow-hidden hover:opacity-80 transition-opacity"
      >
        <img
          src={imageUrl}
          alt={`Render ${job.id}`}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to placeholder on error
            e.currentTarget.style.display = 'none'
          }}
        />
      </a>
    )
  }

  if (job.status === 'failed') {
    return (
      <div className="w-16 h-16 rounded border border-ui-border-base bg-ui-bg-error-subtle flex items-center justify-center">
        <ExclamationCircle className="text-ui-fg-error" />
      </div>
    )
  }

  // Pending/Processing
  return (
    <div className="w-16 h-16 rounded border border-ui-border-base bg-ui-bg-subtle flex items-center justify-center">
      <Photo className="text-ui-fg-muted" />
    </div>
  )
}

/**
 * Job actions component
 */
function JobActions({ job, onRetry }: { job: RenderHistoryJob; onRetry: (jobId: string) => void }) {
  const [showRetryPrompt, setShowRetryPrompt] = useState(false)

  // Completed job - show view/download
  if (job.status === 'completed' && job.rendered_image_urls?.length) {
    const firstImage = job.rendered_image_urls[0]
    const hasMultiple = job.rendered_image_urls.length > 1

    return (
      <div className="flex items-center gap-2">
        <Tooltip content="Download image">
          <Button
            variant="secondary"
            size="small"
            onClick={() => {
              const link = document.createElement('a')
              link.href = firstImage
              link.download = `render-${job.id}.png`
              link.click()
            }}
            aria-label="Download rendered image"
          >
            <ArrowDownTray className="w-4 h-4" />
          </Button>
        </Tooltip>
        {hasMultiple && (
          <Text size="xsmall" className="text-ui-fg-subtle">
            +{job.rendered_image_urls.length - 1} more
          </Text>
        )}
      </div>
    )
  }

  // Failed job - show retry
  if (job.status === 'failed') {
    return (
      <>
        <Tooltip content="Retry this render job">
          <Button
            variant="secondary"
            size="small"
            onClick={() => setShowRetryPrompt(true)}
            aria-label="Retry failed render job"
          >
            <ArrowPath className="w-4 h-4" />
            Retry
          </Button>
        </Tooltip>

        <Prompt open={showRetryPrompt} onOpenChange={setShowRetryPrompt}>
          <Prompt.Content>
            <Prompt.Header>
              <Prompt.Title>Retry Render Job</Prompt.Title>
              <Prompt.Description>
                This will create a new render job with the same settings. The original failed job will remain in history.
              </Prompt.Description>
            </Prompt.Header>
            <Prompt.Footer>
              <Prompt.Cancel>Cancel</Prompt.Cancel>
              <Prompt.Action
                onClick={() => {
                  onRetry(job.id)
                  setShowRetryPrompt(false)
                }}
              >
                Retry Job
              </Prompt.Action>
            </Prompt.Footer>
          </Prompt.Content>
        </Prompt>
      </>
    )
  }

  // Pending/Processing - no actions
  return (
    <Text size="xsmall" className="text-ui-fg-muted italic">
      In progress...
    </Text>
  )
}

/**
 * Render History Component
 *
 * Displays a paginated, filterable list of historical render jobs for a product.
 * Supports retry for failed jobs and download for completed renders.
 *
 * Features:
 * - Paginated table with configurable page size
 * - Status filtering (All, Completed, Failed, Processing, Pending)
 * - Preview thumbnails for completed renders
 * - Download functionality for completed jobs
 * - Retry functionality for failed jobs
 * - Relative time display with full timestamp tooltips
 * - Loading states and error handling
 * - Empty state messaging
 * - Keyboard navigation and accessibility
 *
 * @example
 * ```tsx
 * <RenderHistory
 *   productId="prod_123"
 *   pageSize={10}
 *   autoRefreshInterval={5000}
 *   onRetry={(jobId) => console.log('Retried:', jobId)}
 * />
 * ```
 */
export function RenderHistory({
  productId,
  pageSize = 10,
  showRefreshButton = true,
  autoRefreshInterval = 0,
  onRetry
}: RenderHistoryProps) {
  const {
    jobs,
    isLoading,
    error,
    filter,
    pagination,
    setFilter,
    retryJob,
    refresh,
    nextPage,
    prevPage,
  } = useRenderHistory({
    productId,
    pageSize,
    autoRefreshInterval,
    onRetrySuccess: (newJobId) => {
      if (onRetry) {
        onRetry(newJobId)
      }
    },
  })

  // Filter options
  const filterOptions = useMemo(() => [
    { value: '', label: 'All Status' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
    { value: 'rendering', label: 'Processing' },
    { value: 'pending', label: 'Pending' },
  ], [])

  // Handle retry
  const handleRetry = async (jobId: string) => {
    await retryJob(jobId)
  }

  // Render error state
  if (error && !isLoading) {
    return (
      <Container className="p-6">
        <div className="flex flex-col items-center justify-center gap-4 py-8">
          <ExclamationCircle className="text-ui-fg-error w-12 h-12" />
          <div className="text-center space-y-2">
            <Heading level="h3">Failed to Load Render History</Heading>
            <Text className="text-ui-fg-subtle">{error.message}</Text>
          </div>
          <Button variant="secondary" onClick={refresh}>
            Try Again
          </Button>
        </div>
      </Container>
    )
  }

  // Render empty state
  if (!isLoading && jobs.length === 0) {
    return (
      <Container className="p-6">
        <div className="flex flex-col items-center justify-center gap-4 py-8">
          <Photo className="text-ui-fg-muted w-12 h-12" />
          <div className="text-center space-y-2">
            <Heading level="h3">No Render Jobs Found</Heading>
            <Text className="text-ui-fg-subtle">
              {filter
                ? `No ${filter} render jobs for this product.`
                : 'No render jobs have been created for this product yet.'}
            </Text>
          </div>
          {filter && (
            <Button variant="secondary" onClick={() => setFilter(null)}>
              Clear Filter
            </Button>
          )}
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      {/* Header with filters */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Heading level="h3">Render History</Heading>
          {pagination.totalCount > 0 && (
            <Badge size="small" className="bg-ui-bg-subtle">
              {pagination.totalCount} total
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Status filter */}
          <Select
            value={filter || ''}
            onValueChange={(value) => setFilter(value || null)}
            size="small"
          >
            <Select.Trigger className="w-40">
              <Select.Value placeholder="Filter by status" />
            </Select.Trigger>
            <Select.Content>
              {filterOptions.map((option) => (
                <Select.Item key={option.value} value={option.value}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>

          {/* Refresh button */}
          {showRefreshButton && (
            <Tooltip content="Refresh list">
              <Button
                variant="secondary"
                size="small"
                onClick={refresh}
                isLoading={isLoading}
                aria-label="Refresh render history"
              >
                <ArrowPath className="w-4 h-4" />
              </Button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell className="w-20">Preview</Table.HeaderCell>
              <Table.HeaderCell className="w-32">Status</Table.HeaderCell>
              <Table.HeaderCell className="w-40">Preset</Table.HeaderCell>
              <Table.HeaderCell className="w-48">Created</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Actions</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {isLoading && jobs.length === 0 ? (
              <Table.Row>
                <Table.Cell className="text-center py-8">
                  <Text className="text-ui-fg-subtle">Loading render history...</Text>
                </Table.Cell>
                <Table.Cell />
                <Table.Cell />
                <Table.Cell />
                <Table.Cell />
              </Table.Row>
            ) : (
              jobs.map((job) => (
                <Table.Row key={job.id}>
                  {/* Preview */}
                  <Table.Cell>
                    <JobThumbnail job={job} />
                  </Table.Cell>

                  {/* Status */}
                  <Table.Cell>
                    <div className="flex items-center gap-2">
                      <StatusIcon status={job.status} />
                      <Badge color={STATUS_COLORS[job.status]} size="small">
                        {STATUS_LABELS[job.status]}
                      </Badge>
                    </div>
                    {job.status === 'failed' && job.error_message && (
                      <Tooltip content={job.error_message}>
                        <Text size="xsmall" className="text-ui-fg-error mt-1 truncate max-w-[120px]">
                          {job.error_message}
                        </Text>
                      </Tooltip>
                    )}
                  </Table.Cell>

                  {/* Preset */}
                  <Table.Cell>
                    <Text size="small">
                      {PRESET_LABELS[job.preset] || job.preset}
                    </Text>
                  </Table.Cell>

                  {/* Created */}
                  <Table.Cell>
                    <Tooltip content={formatFullTimestamp(job.created_at)}>
                      <Text size="small" className="text-ui-fg-subtle">
                        {formatRelativeTime(job.created_at)}
                      </Text>
                    </Tooltip>
                  </Table.Cell>

                  {/* Actions */}
                  <Table.Cell className="text-right">
                    <JobActions job={job} onRetry={handleRetry} />
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle">
            Page {pagination.currentPage} of {pagination.totalPages}
          </Text>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="small"
              onClick={prevPage}
              disabled={pagination.currentPage === 1}
              aria-label="Previous page"
            >
              <ChevronLeftMini className="w-4 h-4" />
              Previous
            </Button>
            <Button
              variant="secondary"
              size="small"
              onClick={nextPage}
              disabled={pagination.currentPage === pagination.totalPages}
              aria-label="Next page"
            >
              Next
              <ChevronRightMini className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </Container>
  )
}
