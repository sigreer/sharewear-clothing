import { Button, Text, Heading, clx } from "@medusajs/ui"
import { CheckCircleSolid, XCircleSolid } from "@medusajs/icons"
import { useEffect, useState } from "react"
import { useRenderJob, RenderJobStatus } from "../hooks/use-render-job"

/**
 * Custom Spinner Component
 * (Medusa UI doesn't export Spinner, so we create our own)
 */
const Spinner = ({ className }: { className?: string }) => (
  <svg
    className={clx("animate-spin", className)}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
)

export interface RenderProgressProps {
  /** Product ID for the render job */
  productId: string
  /** Uploaded design file */
  designFile: File
  /** Selected preset position */
  preset: string
  /** Callback when render completes successfully */
  onComplete?: () => void
  /** Callback when an error occurs */
  onError?: (error: Error) => void
}

/**
 * Status message mapping for user-friendly display
 */
const STATUS_MESSAGES: Record<RenderJobStatus, string> = {
  idle: 'Ready to start',
  submitting: 'Submitting job...',
  pending: 'Initializing render pipeline...',
  compositing: 'Compositing design onto template...',
  rendering: 'Rendering 3D model...',
  completed: 'Render complete!',
  failed: 'Render failed',
}

/**
 * Status descriptions for additional context
 */
const STATUS_DESCRIPTIONS: Record<RenderJobStatus, string> = {
  idle: '',
  submitting: 'Uploading design file and creating render job',
  pending: 'Preparing render environment and queuing job',
  compositing: 'Applying your design to the T-shirt template',
  rendering: 'Generating high-quality 3D renders',
  completed: 'Your renders are ready!',
  failed: 'An error occurred during rendering',
}

/**
 * Calculate estimated time remaining based on progress
 */
function estimateTimeRemaining(progress: number, status: RenderJobStatus): string | null {
  if (status === 'completed' || status === 'failed') return null
  if (progress === 0) return 'Calculating...'

  // Rough estimates based on typical render times
  // Compositing: ~30 seconds (0-25%)
  // Rendering: ~2-3 minutes (25-100%)
  let totalEstimateSeconds = 150 // 2.5 minutes average

  const remainingProgress = 100 - progress
  const remainingSeconds = Math.ceil((totalEstimateSeconds * remainingProgress) / 100)

  if (remainingSeconds < 60) {
    return `~${remainingSeconds} seconds remaining`
  } else {
    const minutes = Math.ceil(remainingSeconds / 60)
    return `~${minutes} minute${minutes > 1 ? 's' : ''} remaining`
  }
}

/**
 * Render Progress Component
 *
 * Displays real-time progress for a render job with:
 * - Automatic job submission on mount
 * - Visual progress bar (0-100%)
 * - Status messages and descriptions
 * - Estimated time remaining
 * - Result preview thumbnails on completion
 * - Error display with retry option
 * - Cancel button for pending jobs
 * - Screen reader announcements for status changes
 *
 * @example
 * ```tsx
 * <RenderProgress
 *   productId="prod_123"
 *   designFile={uploadedFile}
 *   preset="center-chest"
 *   onComplete={() => console.log("Render done!")}
 * />
 * ```
 */
export const RenderProgress = ({
  productId,
  designFile,
  preset,
  onComplete,
  onError,
}: RenderProgressProps) => {
  const {
    status,
    progress,
    errorMessage,
    resultUrls,
    animationUrl,
    submitJob,
    cancelJob,
    retry,
    isLoading,
    canCancel,
  } = useRenderJob({
    pollingInterval: 2000,
    onComplete: () => {
      if (onComplete) {
        onComplete()
      }
    },
    onError: (error) => {
      if (onError) {
        onError(error)
      }
    }
  })

  // Track previous status for screen reader announcements
  const [announcement, setAnnouncement] = useState("")
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  /**
   * Auto-submit job on mount
   */
  useEffect(() => {
    submitJob(designFile, productId, preset)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // Only run on mount - we don't want to re-submit if props change

  /**
   * Announce status changes to screen readers
   */
  useEffect(() => {
    if (status !== 'idle' && status !== 'submitting') {
      const message = STATUS_MESSAGES[status]
      const description = STATUS_DESCRIPTIONS[status]
      setAnnouncement(`${message}. ${description}`)
    }
  }, [status])

  /**
   * Handle cancel confirmation
   */
  const handleCancelClick = () => {
    setShowCancelConfirm(true)
  }

  /**
   * Confirm cancellation
   */
  const handleConfirmCancel = async () => {
    await cancelJob()
    setShowCancelConfirm(false)
  }

  /**
   * Dismiss cancel confirmation
   */
  const handleDismissCancel = () => {
    setShowCancelConfirm(false)
  }

  /**
   * Handle retry
   */
  const handleRetry = async () => {
    await retry()
  }

  const estimatedTime = estimateTimeRemaining(progress, status)

  /**
   * Render status icon
   */
  const renderStatusIcon = () => {
    if (status === 'completed') {
      return <CheckCircleSolid className="w-12 h-12 text-ui-fg-success" />
    }

    if (status === 'failed') {
      return <XCircleSolid className="w-12 h-12 text-ui-fg-error" />
    }

    return <Spinner className="w-12 h-12 text-ui-fg-interactive" />
  }

  /**
   * Render result previews
   */
  const renderResults = () => {
    if (status !== 'completed' || resultUrls.length === 0) {
      return null
    }

    return (
      <div className="space-y-4">
        <div className="border-t border-ui-border-base pt-4">
          <Heading level="h3" className="text-sm font-medium mb-3">
            Generated Renders
          </Heading>
          <div className="grid grid-cols-2 gap-3">
            {resultUrls.map((url, index) => (
              <a
                key={index}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={clx(
                  "block border border-ui-border-base rounded-lg overflow-hidden",
                  "hover:border-ui-fg-interactive transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-ui-fg-interactive focus:ring-offset-2"
                )}
                aria-label={`View render ${index + 1}`}
              >
                <div className="aspect-square bg-ui-bg-subtle flex items-center justify-center">
                  <img
                    src={url}
                    alt={`Render ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </a>
            ))}
          </div>

          {animationUrl && (
            <div className="mt-3">
              <Button
                variant="secondary"
                size="small"
                onClick={() => window.open(animationUrl, '_blank')}
                aria-label="View animation"
              >
                View Animation
              </Button>
            </div>
          )}
        </div>

        <Text size="small" className="text-ui-fg-subtle text-center">
          Click images to view full size • Images have been added to product media
        </Text>
      </div>
    )
  }

  return (
    <>
      {/* Screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      <div
        className="space-y-6"
        role="region"
        aria-label="Render progress"
        aria-busy={status !== 'completed' && status !== 'failed'}
      >
        {/* Status Display */}
        <div className="flex flex-col items-center text-center space-y-4 py-6">
          {/* Status Icon */}
          <div className="flex items-center justify-center" aria-hidden="true">
            {renderStatusIcon()}
          </div>

          {/* Status Message */}
          <div className="space-y-2">
            <Heading level="h3" className="text-lg font-semibold">
              {STATUS_MESSAGES[status]}
            </Heading>
            <Text className="text-ui-fg-subtle">
              {STATUS_DESCRIPTIONS[status]}
            </Text>
          </div>

          {/* Progress Bar */}
          {status !== 'completed' && status !== 'failed' && (
            <div className="w-full space-y-3">
              {/* Custom Progress Bar */}
              <div className="w-full bg-ui-bg-subtle rounded-full h-3 overflow-hidden">
                <div
                  className="bg-ui-fg-interactive h-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Render progress"
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <Text size="small" className="text-ui-fg-subtle">
                  {progress}%
                </Text>
                {estimatedTime && (
                  <Text size="small" className="text-ui-fg-subtle">
                    {estimatedTime}
                  </Text>
                )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {status === 'failed' && errorMessage && (
            <div
              className="w-full p-4 rounded-lg bg-ui-bg-subtle border border-ui-border-error"
              role="alert"
            >
              <div className="flex items-start gap-3">
                <XCircleSolid className="w-5 h-5 text-ui-fg-error flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <Text className="font-medium text-ui-fg-error mb-1">
                    Error
                  </Text>
                  <Text size="small" className="text-ui-fg-subtle">
                    {errorMessage}
                  </Text>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Display */}
        {renderResults()}

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3 pt-4 border-t border-ui-border-base">
          {/* Cancel Button */}
          {canCancel && !showCancelConfirm && (
            <Button
              variant="secondary"
              onClick={handleCancelClick}
              disabled={isLoading}
              aria-label="Cancel render job"
            >
              Cancel Job
            </Button>
          )}

          {/* Cancel Confirmation */}
          {showCancelConfirm && (
            <div className="flex items-center gap-3">
              <Text size="small" className="text-ui-fg-subtle">
                Are you sure you want to cancel?
              </Text>
              <Button
                variant="danger"
                size="small"
                onClick={handleConfirmCancel}
              >
                Yes, Cancel
              </Button>
              <Button
                variant="secondary"
                size="small"
                onClick={handleDismissCancel}
              >
                No
              </Button>
            </div>
          )}

          {/* Retry Button */}
          {status === 'failed' && (
            <Button
              variant="primary"
              onClick={handleRetry}
              disabled={isLoading}
              aria-label="Retry render job"
            >
              Retry
            </Button>
          )}
        </div>
      </div>
    </>
  )
}
