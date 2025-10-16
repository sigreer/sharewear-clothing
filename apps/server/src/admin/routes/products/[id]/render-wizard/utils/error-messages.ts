/**
 * Error severity levels
 */
export type ErrorSeverity = "warning" | "error" | "critical"

/**
 * Error types that can occur in the render wizard
 */
export type ErrorType =
  // File Upload Errors
  | "FILE_TOO_LARGE"
  | "INVALID_FILE_TYPE"
  | "INVALID_FILE_FORMAT"
  | "UPLOAD_NETWORK_ERROR"
  | "UPLOAD_TIMEOUT"
  | "UPLOAD_FAILED"
  | "FILE_CORRUPTED"
  // API Errors
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "SERVER_ERROR"
  | "SERVICE_UNAVAILABLE"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "RATE_LIMITED"
  // Job Processing Errors
  | "PYTHON_SCRIPT_ERROR"
  | "RENDER_TIMEOUT"
  | "INSUFFICIENT_RESOURCES"
  | "TEMPLATE_NOT_FOUND"
  | "COMPOSITING_FAILED"
  | "RENDERING_FAILED"
  | "FILE_PROCESSING_ERROR"
  | "INVALID_PRESET"
  | "BLENDER_ERROR"
  | "OUTPUT_ERROR"
  // React/Component Errors
  | "COMPONENT_ERROR"
  | "STATE_ERROR"
  | "RENDER_ERROR"
  | "HOOK_ERROR"
  // Generic Errors
  | "UNKNOWN_ERROR"
  | "CANCELLED"

/**
 * Error message configuration
 */
export interface ErrorMessageConfig {
  /** User-friendly error title */
  title: string
  /** User-friendly error message */
  message: string
  /** Actionable suggestion for resolution */
  action: string
  /** Error severity level */
  severity: ErrorSeverity
  /** Whether this error is retryable */
  retryable: boolean
}

/**
 * Complete error message mappings
 */
export const ERROR_MESSAGES: Record<ErrorType, ErrorMessageConfig> = {
  // File Upload Errors
  FILE_TOO_LARGE: {
    title: "File Too Large",
    message: "The selected file exceeds the 10MB size limit.",
    action:
      "Please choose a smaller file or compress your image before uploading.",
    severity: "warning",
    retryable: false,
  },
  INVALID_FILE_TYPE: {
    title: "Invalid File Type",
    message: "The selected file is not a supported image format.",
    action: "Please upload a PNG or JPG file.",
    severity: "warning",
    retryable: false,
  },
  INVALID_FILE_FORMAT: {
    title: "Invalid File Format",
    message: "The file format could not be recognized or is corrupted.",
    action: "Please ensure you're uploading a valid PNG or JPG image file.",
    severity: "warning",
    retryable: false,
  },
  UPLOAD_NETWORK_ERROR: {
    title: "Network Error",
    message: "Unable to upload file due to a network connection issue.",
    action: "Please check your internet connection and try again.",
    severity: "error",
    retryable: true,
  },
  UPLOAD_TIMEOUT: {
    title: "Upload Timeout",
    message: "The file upload took too long and timed out.",
    action:
      "This may be due to a slow connection. Please try again or use a smaller file.",
    severity: "error",
    retryable: true,
  },
  UPLOAD_FAILED: {
    title: "Upload Failed",
    message: "Unable to upload your design file to the server.",
    action: "Please try uploading again. If the problem persists, contact support.",
    severity: "error",
    retryable: true,
  },
  FILE_CORRUPTED: {
    title: "File Corrupted",
    message: "The uploaded file appears to be corrupted or damaged.",
    action: "Please try re-exporting your design or use a different file.",
    severity: "warning",
    retryable: false,
  },

  // API Errors
  BAD_REQUEST: {
    title: "Invalid Request",
    message: "The request contains invalid or missing information.",
    action: "Please check your input and try again.",
    severity: "error",
    retryable: false,
  },
  UNAUTHORIZED: {
    title: "Authentication Required",
    message: "You need to be logged in to perform this action.",
    action: "Please log in and try again.",
    severity: "error",
    retryable: false,
  },
  FORBIDDEN: {
    title: "Access Denied",
    message: "You don't have permission to perform this action.",
    action: "Please contact your administrator if you believe this is an error.",
    severity: "error",
    retryable: false,
  },
  NOT_FOUND: {
    title: "Resource Not Found",
    message: "The requested resource could not be found.",
    action: "Please refresh the page or contact support if the problem persists.",
    severity: "error",
    retryable: false,
  },
  CONFLICT: {
    title: "Conflict",
    message: "A conflicting operation is already in progress.",
    action: "Please wait for the current operation to complete and try again.",
    severity: "warning",
    retryable: true,
  },
  VALIDATION_ERROR: {
    title: "Validation Error",
    message: "The provided data failed validation checks.",
    action: "Please review your input and correct any errors.",
    severity: "warning",
    retryable: false,
  },
  SERVER_ERROR: {
    title: "Server Error",
    message: "An unexpected error occurred on the server.",
    action:
      "This is likely a temporary issue. Please try again in a few moments.",
    severity: "critical",
    retryable: true,
  },
  SERVICE_UNAVAILABLE: {
    title: "Service Unavailable",
    message: "The render service is temporarily unavailable.",
    action:
      "Please try again in a few minutes. If the issue persists, contact support.",
    severity: "critical",
    retryable: true,
  },
  NETWORK_ERROR: {
    title: "Network Error",
    message: "Unable to connect to the server.",
    action:
      "Please check your internet connection and try again.",
    severity: "error",
    retryable: true,
  },
  TIMEOUT: {
    title: "Request Timeout",
    message: "The request took too long and timed out.",
    action: "Please try again. If the problem persists, contact support.",
    severity: "error",
    retryable: true,
  },
  RATE_LIMITED: {
    title: "Too Many Requests",
    message: "You've made too many requests in a short period.",
    action: "Please wait a few minutes before trying again.",
    severity: "warning",
    retryable: true,
  },

  // Job Processing Errors
  PYTHON_SCRIPT_ERROR: {
    title: "Processing Error",
    message: "An error occurred while processing your design.",
    action:
      "Please try again with a different design file or contact support.",
    severity: "error",
    retryable: true,
  },
  RENDER_TIMEOUT: {
    title: "Render Timeout",
    message: "The render process took longer than expected (>5 minutes).",
    action:
      "This may be due to high server load. Please try again or simplify your design.",
    severity: "error",
    retryable: true,
  },
  INSUFFICIENT_RESOURCES: {
    title: "Insufficient Resources",
    message: "The server doesn't have enough resources to process your request.",
    action:
      "Please try again later when server load is lower, or contact support.",
    severity: "critical",
    retryable: true,
  },
  TEMPLATE_NOT_FOUND: {
    title: "Template Not Found",
    message: "The T-shirt template file could not be found.",
    action: "This is a configuration issue. Please contact support immediately.",
    severity: "critical",
    retryable: false,
  },
  COMPOSITING_FAILED: {
    title: "Compositing Failed",
    message: "Unable to apply your design to the T-shirt template.",
    action:
      "Please ensure your design is a valid image file and try again.",
    severity: "error",
    retryable: true,
  },
  RENDERING_FAILED: {
    title: "Rendering Failed",
    message: "The 3D rendering process encountered an error.",
    action: "Please try again. If the problem persists, contact support.",
    severity: "error",
    retryable: true,
  },
  FILE_PROCESSING_ERROR: {
    title: "File Processing Error",
    message: "Unable to process the uploaded file.",
    action:
      "Please ensure your file is not corrupted and meets the requirements.",
    severity: "error",
    retryable: true,
  },
  INVALID_PRESET: {
    title: "Invalid Preset",
    message: "The selected render preset is not valid.",
    action: "Please select a different preset and try again.",
    severity: "warning",
    retryable: false,
  },
  BLENDER_ERROR: {
    title: "Blender Error",
    message: "The Blender rendering engine encountered an error.",
    action: "This is a server-side issue. Please try again or contact support.",
    severity: "critical",
    retryable: true,
  },
  OUTPUT_ERROR: {
    title: "Output Error",
    message: "Unable to generate or save the rendered output.",
    action: "Please try again. If the problem persists, contact support.",
    severity: "error",
    retryable: true,
  },

  // React/Component Errors
  COMPONENT_ERROR: {
    title: "Component Error",
    message: "A component failed to render properly.",
    action:
      "Please refresh the page. If the problem persists, contact support.",
    severity: "error",
    retryable: true,
  },
  STATE_ERROR: {
    title: "State Error",
    message: "An error occurred while updating component state.",
    action:
      "Please refresh the page and try again.",
    severity: "error",
    retryable: true,
  },
  RENDER_ERROR: {
    title: "Render Error",
    message: "An error occurred while rendering the interface.",
    action:
      "Please refresh the page. If the problem persists, contact support.",
    severity: "error",
    retryable: true,
  },
  HOOK_ERROR: {
    title: "Hook Error",
    message: "An error occurred in a React hook.",
    action:
      "Please refresh the page and try again.",
    severity: "error",
    retryable: true,
  },

  // Generic Errors
  UNKNOWN_ERROR: {
    title: "Unexpected Error",
    message: "An unexpected error occurred.",
    action:
      "Please try again. If the problem persists, contact support with details about what you were doing.",
    severity: "error",
    retryable: true,
  },
  CANCELLED: {
    title: "Operation Cancelled",
    message: "The operation was cancelled by the user.",
    action: "You can start a new operation at any time.",
    severity: "warning",
    retryable: false,
  },
}

/**
 * Get error message configuration for a given error type
 */
export function getErrorConfig(errorType: ErrorType): ErrorMessageConfig {
  return ERROR_MESSAGES[errorType] || ERROR_MESSAGES.UNKNOWN_ERROR
}

/**
 * Parse HTTP status code to error type
 */
export function httpStatusToErrorType(status: number): ErrorType {
  switch (status) {
    case 400:
      return "BAD_REQUEST"
    case 401:
      return "UNAUTHORIZED"
    case 403:
      return "FORBIDDEN"
    case 404:
      return "NOT_FOUND"
    case 409:
      return "CONFLICT"
    case 422:
      return "VALIDATION_ERROR"
    case 429:
      return "RATE_LIMITED"
    case 500:
      return "SERVER_ERROR"
    case 503:
      return "SERVICE_UNAVAILABLE"
    case 504:
      return "TIMEOUT"
    default:
      if (status >= 500) {
        return "SERVER_ERROR"
      }
      if (status >= 400) {
        return "BAD_REQUEST"
      }
      return "UNKNOWN_ERROR"
  }
}

/**
 * Parse error message to determine error type
 * Useful for extracting error types from backend error messages
 */
export function parseErrorMessage(message: string): ErrorType {
  const lowerMessage = message.toLowerCase()

  // File upload errors
  if (
    lowerMessage.includes("file too large") ||
    lowerMessage.includes("file size")
  ) {
    return "FILE_TOO_LARGE"
  }
  if (
    lowerMessage.includes("invalid file type") ||
    lowerMessage.includes("file type")
  ) {
    return "INVALID_FILE_TYPE"
  }
  if (lowerMessage.includes("upload")) {
    return "UPLOAD_FAILED"
  }

  // Network errors
  if (lowerMessage.includes("network") || lowerMessage.includes("connection")) {
    return "NETWORK_ERROR"
  }
  if (lowerMessage.includes("timeout") || lowerMessage.includes("timed out")) {
    return "TIMEOUT"
  }

  // Processing errors
  if (lowerMessage.includes("python") || lowerMessage.includes("script")) {
    return "PYTHON_SCRIPT_ERROR"
  }
  if (lowerMessage.includes("composit")) {
    return "COMPOSITING_FAILED"
  }
  if (lowerMessage.includes("render")) {
    return "RENDERING_FAILED"
  }
  if (lowerMessage.includes("blender")) {
    return "BLENDER_ERROR"
  }
  if (lowerMessage.includes("template")) {
    return "TEMPLATE_NOT_FOUND"
  }

  // Authorization errors
  if (lowerMessage.includes("unauthorized") || lowerMessage.includes("authentication")) {
    return "UNAUTHORIZED"
  }
  if (lowerMessage.includes("forbidden") || lowerMessage.includes("permission")) {
    return "FORBIDDEN"
  }

  // Resource errors
  if (lowerMessage.includes("not found")) {
    return "NOT_FOUND"
  }
  if (lowerMessage.includes("conflict")) {
    return "CONFLICT"
  }

  // Validation errors
  if (lowerMessage.includes("validation") || lowerMessage.includes("invalid")) {
    return "VALIDATION_ERROR"
  }

  // Server errors
  if (lowerMessage.includes("server error") || lowerMessage.includes("internal")) {
    return "SERVER_ERROR"
  }
  if (lowerMessage.includes("unavailable")) {
    return "SERVICE_UNAVAILABLE"
  }

  // Cancelled
  if (lowerMessage.includes("cancel") || lowerMessage.includes("abort")) {
    return "CANCELLED"
  }

  return "UNKNOWN_ERROR"
}

/**
 * Create a standardized error object with type and config
 */
export interface StandardError {
  type: ErrorType
  config: ErrorMessageConfig
  originalError?: Error
  technicalDetails?: string
  timestamp: Date
}

/**
 * Create a standard error from various error sources
 */
export function createStandardError(
  error: Error | string | ErrorType,
  technicalDetails?: string
): StandardError {
  let errorType: ErrorType
  let originalError: Error | undefined

  if (typeof error === "string") {
    if (error in ERROR_MESSAGES) {
      errorType = error as ErrorType
    } else {
      errorType = parseErrorMessage(error)
      technicalDetails = technicalDetails || error
    }
  } else if (error instanceof Error) {
    originalError = error
    errorType = parseErrorMessage(error.message)
    technicalDetails = technicalDetails || error.message
  } else {
    errorType = error
  }

  return {
    type: errorType,
    config: getErrorConfig(errorType),
    originalError,
    technicalDetails,
    timestamp: new Date(),
  }
}

/**
 * Log error to console with structured format
 */
export function logError(
  error: StandardError,
  context?: Record<string, unknown>
): void {
  const logData = {
    timestamp: error.timestamp.toISOString(),
    type: error.type,
    severity: error.config.severity,
    title: error.config.title,
    message: error.config.message,
    technicalDetails: error.technicalDetails,
    retryable: error.config.retryable,
    context,
    stack: error.originalError?.stack,
  }

  // Use appropriate console method based on severity
  switch (error.config.severity) {
    case "critical":
      console.error("[CRITICAL ERROR]", logData)
      break
    case "error":
      console.error("[ERROR]", logData)
      break
    case "warning":
      console.warn("[WARNING]", logData)
      break
  }
}
