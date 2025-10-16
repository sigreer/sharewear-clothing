import { useState, useEffect } from "react"
import { Button, Text, clx } from "@medusajs/ui"
import { XCircleSolid, ExclamationCircleSolid, InformationCircleSolid } from "@medusajs/icons"
import {
  StandardError,
  createStandardError,
  ErrorSeverity,
  ErrorType,
  logError,
} from "../utils/error-messages"

/**
 * Props for the ErrorDisplay component
 */
export interface ErrorDisplayProps {
  /** Error object or error message */
  error: Error | string | StandardError | ErrorType | null
  /** Optional override for error severity */
  severity?: ErrorSeverity
  /** Callback when retry button is clicked */
  onRetry?: () => void
  /** Callback when dismiss button is clicked */
  onDismiss?: () => void
  /** Current retry count (used to disable retry after max attempts) */
  retryCount?: number
  /** Maximum number of retry attempts allowed */
  maxRetries?: number
  /** Additional context information for error logging */
  context?: Record<string, unknown>
  /** Custom CSS class name */
  className?: string
  /** Whether to show technical details by default */
  showTechnicalDetailsDefault?: boolean
}

/**
 * Get icon component based on error severity
 */
function getSeverityIcon(severity: ErrorSeverity): React.ReactNode {
  switch (severity) {
    case "critical":
      return <XCircleSolid className="w-5 h-5 text-ui-fg-error" />
    case "error":
      return <ExclamationCircleSolid className="w-5 h-5 text-ui-fg-error" />
    case "warning":
      return <ExclamationCircleSolid className="w-5 h-5 text-ui-tag-orange-icon" />
    default:
      return <InformationCircleSolid className="w-5 h-5 text-ui-fg-subtle" />
  }
}

/**
 * Get border and background colors based on severity
 */
function getSeverityStyles(severity: ErrorSeverity): {
  border: string
  background: string
} {
  switch (severity) {
    case "critical":
      return {
        border: "border-ui-border-error",
        background: "bg-ui-tag-red-bg",
      }
    case "error":
      return {
        border: "border-ui-border-error",
        background: "bg-ui-bg-subtle",
      }
    case "warning":
      return {
        border: "border-ui-tag-orange-border",
        background: "bg-ui-tag-orange-bg",
      }
    default:
      return {
        border: "border-ui-border-base",
        background: "bg-ui-bg-subtle",
      }
  }
}

/**
 * ErrorDisplay Component
 *
 * Displays user-friendly error messages with:
 * - Clear, non-technical error descriptions
 * - Severity-based visual indicators
 * - Actionable suggestions for resolution
 * - Optional retry mechanism with attempt tracking
 * - Collapsible technical details section
 * - Screen reader support
 *
 * @example
 * ```tsx
 * <ErrorDisplay
 *   error={error}
 *   severity="error"
 *   onRetry={() => handleRetry()}
 *   onDismiss={() => setError(null)}
 *   retryCount={2}
 *   maxRetries={3}
 * />
 * ```
 */
export const ErrorDisplay = ({
  error,
  severity: overrideSeverity,
  onRetry,
  onDismiss,
  retryCount = 0,
  maxRetries = 3,
  context,
  className,
  showTechnicalDetailsDefault = false,
}: ErrorDisplayProps) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(
    showTechnicalDetailsDefault
  )

  // Convert error to StandardError format
  const standardError: StandardError | null = error
    ? error && typeof error === "object" && "config" in error
      ? (error as StandardError)
      : createStandardError(error as Error | string | ErrorType)
    : null

  // Log error when it changes
  useEffect(() => {
    if (standardError) {
      logError(standardError, {
        ...context,
        retryCount,
        maxRetries,
      })
    }
  }, [standardError, context, retryCount, maxRetries])

  // If no error, render nothing
  if (!standardError) {
    return null
  }

  const { config } = standardError
  const severity = overrideSeverity || config.severity
  const styles = getSeverityStyles(severity)

  // Determine if retry is available
  const canRetry = config.retryable && onRetry && retryCount < maxRetries
  const hasReachedMaxRetries = retryCount >= maxRetries

  // Toggle technical details
  const toggleTechnicalDetails = () => {
    setShowTechnicalDetails(!showTechnicalDetails)
  }

  return (
    <div
      className={clx(
        "rounded-lg border p-4",
        styles.border,
        styles.background,
        className
      )}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="space-y-3">
        {/* Error Header */}
        <div className="flex items-start gap-x-3">
          {/* Severity Icon */}
          <div className="flex-shrink-0 mt-0.5" aria-hidden="true">
            {getSeverityIcon(severity)}
          </div>

          {/* Error Content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Error Title */}
            <Text className="font-semibold text-ui-fg-base">
              {config.title}
            </Text>

            {/* Error Message */}
            <Text size="small" className="text-ui-fg-subtle">
              {config.message}
            </Text>

            {/* Action Suggestion */}
            {config.action && (
              <Text size="small" className="text-ui-fg-muted">
                <strong>What to do:</strong> {config.action}
              </Text>
            )}

            {/* Retry Count Warning */}
            {canRetry && retryCount > 0 && (
              <Text size="xsmall" className="text-ui-fg-muted">
                Retry attempt {retryCount} of {maxRetries}
              </Text>
            )}

            {/* Max Retries Reached */}
            {hasReachedMaxRetries && config.retryable && (
              <div className="flex items-start gap-x-2 p-2 rounded bg-ui-tag-orange-bg border border-ui-tag-orange-border">
                <ExclamationCircleSolid className="w-4 h-4 text-ui-tag-orange-icon flex-shrink-0 mt-0.5" />
                <Text size="xsmall" className="text-ui-fg-subtle">
                  Maximum retry attempts reached. Please contact support if the
                  problem persists.
                </Text>
              </div>
            )}
          </div>

          {/* Dismiss Button */}
          {onDismiss && (
            <Button
              variant="transparent"
              size="small"
              onClick={onDismiss}
              aria-label="Dismiss error"
              className="flex-shrink-0"
            >
              <XCircleSolid className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Technical Details (Collapsible) */}
        {standardError.technicalDetails && (
          <div className="border-t border-ui-border-base pt-3">
            <button
              onClick={toggleTechnicalDetails}
              className={clx(
                "flex items-center gap-x-2 w-full text-left",
                "text-ui-fg-subtle hover:text-ui-fg-base transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-ui-fg-interactive focus:ring-offset-2 rounded px-2 py-1"
              )}
              aria-expanded={showTechnicalDetails}
              aria-controls="technical-details"
            >
              {showTechnicalDetails ? (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 15l7-7 7 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              )}
              <Text size="xsmall" className="font-medium">
                Technical Details
              </Text>
            </button>

            {showTechnicalDetails && (
              <div
                id="technical-details"
                className="mt-2 p-3 rounded bg-ui-bg-base border border-ui-border-base"
              >
                <Text
                  size="xsmall"
                  className="font-mono text-ui-fg-muted break-all"
                >
                  {standardError.technicalDetails}
                </Text>

                {standardError.timestamp && (
                  <Text
                    size="xsmall"
                    className="text-ui-fg-disabled mt-2 block"
                  >
                    Occurred at:{" "}
                    {standardError.timestamp.toLocaleString()}
                  </Text>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {(canRetry || onDismiss) && (
          <div className="flex items-center gap-x-2 pt-2">
            {/* Retry Button */}
            {canRetry && (
              <Button
                variant="secondary"
                size="small"
                onClick={onRetry}
                aria-label="Retry operation"
              >
                Retry
              </Button>
            )}

            {/* Contact Support Button */}
            {severity === "critical" && (
              <Button
                variant="secondary"
                size="small"
                onClick={() => {
                  // Open support page or email
                  window.open("mailto:support@example.com", "_blank")
                }}
                aria-label="Contact support"
              >
                Contact Support
              </Button>
            )}

            {/* Dismiss Button (Alternative Position) */}
            {onDismiss && !canRetry && (
              <Button
                variant="secondary"
                size="small"
                onClick={onDismiss}
                aria-label="Dismiss error"
              >
                Dismiss
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Screen Reader Announcement */}
      <div className="sr-only" role="status" aria-live="polite">
        Error: {config.title}. {config.message}. {config.action}
        {canRetry && `. You can retry this operation.`}
      </div>
    </div>
  )
}

/**
 * ErrorList Component
 *
 * Displays multiple errors in a list format
 * Useful for batch operations or form validation
 */
export interface ErrorListProps {
  /** Array of errors to display */
  errors: Array<Error | string | StandardError | ErrorType>
  /** Callback when an error is dismissed */
  onDismissError?: (index: number) => void
  /** Custom CSS class name */
  className?: string
}

export const ErrorList = ({
  errors,
  onDismissError,
  className,
}: ErrorListProps) => {
  if (errors.length === 0) {
    return null
  }

  return (
    <div className={clx("space-y-3", className)} role="alert" aria-live="polite">
      {errors.map((error, index) => (
        <ErrorDisplay
          key={index}
          error={error}
          onDismiss={
            onDismissError ? () => onDismissError(index) : undefined
          }
        />
      ))}
    </div>
  )
}
