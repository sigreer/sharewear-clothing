import { useState, useCallback, useRef } from "react"
import {
  createStandardError,
  logError,
  httpStatusToErrorType,
  StandardError,
  ErrorType,
} from "../utils/error-messages"

/**
 * File validation configuration
 */
const FILE_CONFIG = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB in bytes
  ALLOWED_TYPES: ["image/png", "image/jpeg", "image/jpg"],
  ALLOWED_EXTENSIONS: [".png", ".jpg", ".jpeg"],
} as const

/**
 * File validation error types
 */
export type FileValidationError =
  | "invalid-type"
  | "file-too-large"
  | "upload-failed"
  | null

/**
 * Upload progress state
 */
export interface UploadProgress {
  /** Upload percentage (0-100) */
  percentage: number
  /** Upload status */
  status: "idle" | "uploading" | "success" | "error"
}

/**
 * File upload hook state
 */
export interface UseFileUploadReturn {
  /** Selected file (null if no file selected) */
  selectedFile: File | null
  /** File preview URL (null if no file selected) */
  previewUrl: string | null
  /** Validation error message (null if valid) */
  validationError: FileValidationError
  /** Standardized error object (null if no error) */
  error: StandardError | null
  /** Upload progress state */
  uploadProgress: UploadProgress
  /** Whether upload is in progress */
  isUploading: boolean
  /** Whether file is valid and ready for upload */
  isValid: boolean
  /** Select a file and validate it */
  selectFile: (file: File) => void
  /** Clear selected file */
  clearFile: () => void
  /** Upload file to server */
  uploadFile: (productId: string) => Promise<{ success: boolean; jobId?: string; error?: string }>
  /** Cancel ongoing upload */
  cancelUpload: () => void
}

/**
 * Custom hook for handling file upload with validation and progress tracking
 *
 * Features:
 * - Client-side validation (file type, size)
 * - File preview generation
 * - Upload progress tracking
 * - Upload cancellation
 * - Automatic cleanup of preview URLs
 *
 * @example
 * ```tsx
 * const { selectedFile, previewUrl, selectFile, uploadFile, isValid } = useFileUpload()
 *
 * const handleFileSelect = (file: File) => {
 *   selectFile(file)
 * }
 *
 * const handleUpload = async () => {
 *   const result = await uploadFile(productId)
 *   if (result.success) {
 *     console.log("Upload successful:", result.jobId)
 *   }
 * }
 * ```
 */
export const useFileUpload = (): UseFileUploadReturn => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<FileValidationError>(null)
  const [error, setError] = useState<StandardError | null>(null)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    percentage: 0,
    status: "idle",
  })

  // Reference to track ongoing upload for cancellation
  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * Validate file type
   */
  const validateFileType = useCallback((file: File): boolean => {
    return (FILE_CONFIG.ALLOWED_TYPES as readonly string[]).includes(file.type)
  }, [])

  /**
   * Validate file size
   */
  const validateFileSize = useCallback((file: File): boolean => {
    return file.size <= FILE_CONFIG.MAX_SIZE
  }, [])

  /**
   * Generate preview URL for image file
   */
  const generatePreview = useCallback((file: File): string => {
    return URL.createObjectURL(file)
  }, [])

  /**
   * Cleanup preview URL
   */
  const cleanupPreview = useCallback((url: string | null) => {
    if (url) {
      URL.revokeObjectURL(url)
    }
  }, [])

  /**
   * Select and validate a file
   */
  const selectFile = useCallback((file: File) => {
    // Cleanup previous preview
    cleanupPreview(previewUrl)

    // Reset validation error and standard error
    setValidationError(null)
    setError(null)

    // Validate file type
    if (!validateFileType(file)) {
      setValidationError("invalid-type")
      const standardError = createStandardError("INVALID_FILE_TYPE")
      setError(standardError)
      logError(standardError, { fileName: file.name, fileType: file.type })
      setSelectedFile(null)
      setPreviewUrl(null)
      return
    }

    // Validate file size
    if (!validateFileSize(file)) {
      setValidationError("file-too-large")
      const standardError = createStandardError("FILE_TOO_LARGE")
      setError(standardError)
      logError(standardError, { fileName: file.name, fileSize: file.size })
      setSelectedFile(null)
      setPreviewUrl(null)
      return
    }

    // File is valid - set state
    setSelectedFile(file)
    setPreviewUrl(generatePreview(file))
    setUploadProgress({ percentage: 0, status: "idle" })
  }, [previewUrl, cleanupPreview, validateFileType, validateFileSize, generatePreview])

  /**
   * Clear selected file
   */
  const clearFile = useCallback(() => {
    cleanupPreview(previewUrl)
    setSelectedFile(null)
    setPreviewUrl(null)
    setValidationError(null)
    setError(null)
    setUploadProgress({ percentage: 0, status: "idle" })
  }, [previewUrl, cleanupPreview])

  /**
   * Upload file to server
   */
  const uploadFile = useCallback(async (
    productId: string
  ): Promise<{ success: boolean; jobId?: string; error?: string }> => {
    if (!selectedFile) {
      const standardError = createStandardError("BAD_REQUEST", "No file selected")
      setError(standardError)
      logError(standardError)
      return { success: false, error: "No file selected" }
    }

    // Create abort controller for cancellation
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      // Set uploading state
      setUploadProgress({ percentage: 0, status: "uploading" })
      setError(null)

      // Create form data
      const formData = new FormData()
      formData.append("design_file", selectedFile)
      formData.append("product_id", productId)

      // Upload file with progress tracking
      const response = await fetch("/admin/render-jobs", {
        method: "POST",
        body: formData,
        signal: abortController.signal as AbortSignal,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Upload failed" }))
        const errorType = httpStatusToErrorType(response.status)
        const standardError = createStandardError(errorType, errorData.message || "Upload failed")
        setError(standardError)
        logError(standardError, {
          productId,
          fileName: selectedFile.name,
          statusCode: response.status,
        })
        throw new Error(errorData.message || "Upload failed")
      }

      const result = await response.json()

      // Set success state
      setUploadProgress({ percentage: 100, status: "success" })

      return {
        success: true,
        jobId: result.id,
      }
    } catch (error) {
      // Check if error is due to cancellation
      if (error instanceof Error && error.name === "AbortError") {
        setUploadProgress({ percentage: 0, status: "idle" })
        const standardError = createStandardError("CANCELLED")
        setError(standardError)
        return { success: false, error: "Upload cancelled" }
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes("fetch")) {
        const standardError = createStandardError("UPLOAD_NETWORK_ERROR")
        setError(standardError)
        logError(standardError, {
          productId,
          fileName: selectedFile.name,
        })
      }

      // Set error state
      setUploadProgress({ percentage: 0, status: "error" })
      setValidationError("upload-failed")

      // If error wasn't set already, set a generic upload error
      if (!error) {
        const standardError = createStandardError("UPLOAD_FAILED")
        setError(standardError)
        logError(standardError, {
          productId,
          fileName: selectedFile.name,
          originalError: error instanceof Error ? error.message : String(error),
        })
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      }
    } finally {
      abortControllerRef.current = null
    }
  }, [selectedFile])

  /**
   * Cancel ongoing upload
   */
  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  // Computed properties
  const isUploading = uploadProgress.status === "uploading"
  const isValid = selectedFile !== null && validationError === null

  return {
    selectedFile,
    previewUrl,
    validationError,
    error,
    uploadProgress,
    isUploading,
    isValid,
    selectFile,
    clearFile,
    uploadFile,
    cancelUpload,
  }
}

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes"

  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

/**
 * Get user-friendly error message
 */
export const getErrorMessage = (error: FileValidationError): string | null => {
  switch (error) {
    case "invalid-type":
      return "Invalid file type. Please upload a PNG or JPG file."
    case "file-too-large":
      return "File is too large. Maximum file size is 10MB."
    case "upload-failed":
      return "Upload failed. Please try again."
    default:
      return null
  }
}
