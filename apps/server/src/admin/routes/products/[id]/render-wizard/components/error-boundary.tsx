import React, { Component, ReactNode, ErrorInfo } from "react"
import { Button, Text, Heading, clx } from "@medusajs/ui"
import { ExclamationCircleSolid, ArrowPath } from "@medusajs/icons"
import { createStandardError, logError, StandardError } from "../utils/error-messages"

/**
 * Props for ErrorBoundary component
 */
export interface ErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode
  /** Optional fallback UI to display on error */
  fallback?: (error: Error, errorInfo: ErrorInfo, reset: () => void) => ReactNode
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /** Custom error message to display */
  errorMessage?: string
  /** Whether to show the reset button */
  showResetButton?: boolean
  /** Custom CSS class name for the error container */
  className?: string
}

/**
 * State for ErrorBoundary component
 */
export interface ErrorBoundaryState {
  /** Whether an error has been caught */
  hasError: boolean
  /** The caught error */
  error: Error | null
  /** Additional error information from React */
  errorInfo: ErrorInfo | null
  /** Standardized error for display */
  standardError: StandardError | null
}

/**
 * ErrorBoundary Component
 *
 * React error boundary that catches unhandled errors in child components
 * and displays a user-friendly fallback UI instead of crashing the entire app.
 *
 * Features:
 * - Catches React component errors
 * - Prevents full UI crash
 * - Displays user-friendly fallback UI
 * - Provides reset functionality to attempt recovery
 * - Logs errors with full details
 * - Supports custom fallback UI
 * - Includes accessibility features
 *
 * @example
 * ```tsx
 * <ErrorBoundary
 *   onError={(error, errorInfo) => console.error(error)}
 *   errorMessage="Something went wrong with the render wizard"
 * >
 *   <RenderWizardModal />
 * </ErrorBoundary>
 * ```
 *
 * @example Custom fallback
 * ```tsx
 * <ErrorBoundary
 *   fallback={(error, errorInfo, reset) => (
 *     <div>
 *       <h1>Oops! {error.message}</h1>
 *       <button onClick={reset}>Try Again</button>
 *     </div>
 *   )}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      standardError: null,
    }
  }

  /**
   * Update state when an error is caught
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      standardError: createStandardError(error, error.message),
    }
  }

  /**
   * Log error details when an error is caught
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details
    const standardError = createStandardError(error, error.message)

    logError(standardError, {
      componentStack: errorInfo.componentStack,
      errorBoundary: "RenderWizardErrorBoundary",
    })

    // Update state with error info
    this.setState({
      errorInfo,
    })

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  /**
   * Reset the error boundary state
   * Allows attempting to re-render the component
   */
  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      standardError: null,
    })
  }

  /**
   * Render method
   */
  render(): ReactNode {
    const { hasError, error, errorInfo, standardError } = this.state
    const {
      children,
      fallback,
      errorMessage,
      showResetButton = true,
      className,
    } = this.props

    // If no error, render children normally
    if (!hasError || !error) {
      return children
    }

    // If custom fallback provided, use it
    if (fallback) {
      return fallback(error, errorInfo!, this.resetError)
    }

    // Default fallback UI
    return (
      <div
        className={clx(
          "flex items-center justify-center min-h-[400px] p-8",
          className
        )}
        role="alert"
        aria-live="assertive"
      >
        <div className="max-w-md w-full space-y-6">
          {/* Error Icon */}
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-ui-tag-red-bg border border-ui-border-error">
              <ExclamationCircleSolid className="w-12 h-12 text-ui-fg-error" />
            </div>
          </div>

          {/* Error Message */}
          <div className="text-center space-y-2">
            <Heading level="h2" className="text-xl font-semibold">
              {standardError?.config.title || "Something went wrong"}
            </Heading>
            <Text className="text-ui-fg-subtle">
              {errorMessage ||
                standardError?.config.message ||
                "An unexpected error occurred. Please try refreshing the page."}
            </Text>
          </div>

          {/* Action Suggestion */}
          {standardError?.config.action && (
            <div className="p-4 rounded-lg bg-ui-bg-subtle border border-ui-border-base">
              <Text size="small" className="text-ui-fg-muted">
                <strong>What to do:</strong> {standardError.config.action}
              </Text>
            </div>
          )}

          {/* Technical Details (Collapsible) */}
          {error && (
            <details className="text-left">
              <summary className="cursor-pointer text-sm font-medium text-ui-fg-subtle hover:text-ui-fg-base transition-colors px-4 py-2 rounded hover:bg-ui-bg-subtle">
                Technical Details
              </summary>
              <div className="mt-2 p-4 rounded-lg bg-ui-bg-base border border-ui-border-base space-y-2">
                <div>
                  <Text size="xsmall" className="font-semibold text-ui-fg-muted">
                    Error Message:
                  </Text>
                  <Text
                    size="xsmall"
                    className="font-mono text-ui-fg-subtle mt-1 break-all"
                  >
                    {error.message}
                  </Text>
                </div>

                {error.stack && (
                  <div>
                    <Text size="xsmall" className="font-semibold text-ui-fg-muted">
                      Stack Trace:
                    </Text>
                    <pre className="mt-1 p-2 rounded bg-ui-bg-subtle text-xs font-mono text-ui-fg-muted overflow-x-auto max-h-40 overflow-y-auto">
                      {error.stack}
                    </pre>
                  </div>
                )}

                {errorInfo?.componentStack && (
                  <div>
                    <Text size="xsmall" className="font-semibold text-ui-fg-muted">
                      Component Stack:
                    </Text>
                    <pre className="mt-1 p-2 rounded bg-ui-bg-subtle text-xs font-mono text-ui-fg-muted overflow-x-auto max-h-40 overflow-y-auto">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}

                {standardError?.timestamp && (
                  <div>
                    <Text size="xsmall" className="text-ui-fg-disabled">
                      Occurred at: {standardError.timestamp.toLocaleString()}
                    </Text>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {showResetButton && (
              <Button
                variant="primary"
                onClick={this.resetError}
                aria-label="Reset and try again"
              >
                <ArrowPath className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}

            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
              aria-label="Refresh page"
            >
              Refresh Page
            </Button>

            {standardError?.config.severity === "critical" && (
              <Button
                variant="secondary"
                onClick={() => {
                  // Open support page or email
                  window.open("mailto:support@example.com", "_blank")
                }}
                aria-label="Contact support"
              >
                Contact Support
              </Button>
            )}
          </div>

          {/* Additional Help Text */}
          <div className="text-center pt-4 border-t border-ui-border-base">
            <Text size="xsmall" className="text-ui-fg-disabled">
              If this problem persists, please contact support with the technical
              details above.
            </Text>
          </div>
        </div>
      </div>
    )
  }
}

/**
 * Hook-based error boundary wrapper
 * For use in functional components
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   return (
 *     <ErrorBoundary>
 *       <ComponentThatMightError />
 *     </ErrorBoundary>
 *   )
 * }
 * ```
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">
) => {
  const WrappedComponent = (props: P) => {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }

  WrappedComponent.displayName = `withErrorBoundary(${
    Component.displayName || Component.name || "Component"
  })`

  return WrappedComponent
}
