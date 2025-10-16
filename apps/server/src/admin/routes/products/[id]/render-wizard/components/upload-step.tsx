import { Text, Button, clx } from "@medusajs/ui"
import { XMark, ArrowUpTray, Photo } from "@medusajs/icons"
import { useRef, useState, DragEvent, ChangeEvent } from "react"
import {
  useFileUpload,
  formatFileSize,
  getErrorMessage,
} from "../hooks/use-file-upload"

export interface UploadStepProps {
  /** Callback when file is selected and validated */
  onFileSelect: (file: File) => void
  /** Callback when validation state changes */
  onValidationChange: (isValid: boolean) => void
}

/**
 * Upload Step Component
 *
 * Provides file upload functionality with:
 * - Drag-and-drop support
 * - File picker fallback
 * - Client-side validation (type, size)
 * - File preview
 * - Upload progress tracking
 * - Accessibility features
 *
 * @example
 * ```tsx
 * <UploadStep
 *   onFileSelect={(file) => console.log("File selected:", file)}
 *   onValidationChange={(isValid) => setCanProceed(isValid)}
 * />
 * ```
 */
export const UploadStep = ({
  onFileSelect,
  onValidationChange,
}: UploadStepProps) => {
  const {
    selectedFile,
    previewUrl,
    validationError,
    uploadProgress,
    isValid,
    selectFile,
    clearFile,
  } = useFileUpload()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  /**
   * Handle file selection from input
   */
  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      selectFile(file)
      onFileSelect(file)
      onValidationChange(true)
    }
  }

  /**
   * Handle drag enter event
   */
  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(true)
  }

  /**
   * Handle drag leave event
   */
  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()

    // Only set isDragging to false if we're leaving the drop zone entirely
    const target = event.currentTarget
    const relatedTarget = event.relatedTarget as Node | null

    if (!relatedTarget || !target.contains(relatedTarget)) {
      setIsDragging(false)
    }
  }

  /**
   * Handle drag over event
   */
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }

  /**
   * Handle file drop
   */
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)

    const file = event.dataTransfer.files[0]
    if (file) {
      selectFile(file)
      onFileSelect(file)
      onValidationChange(true)
    }
  }

  /**
   * Handle click on drop zone to open file picker
   */
  const handleDropZoneClick = () => {
    fileInputRef.current?.click()
  }

  /**
   * Handle file removal
   */
  const handleRemoveFile = () => {
    clearFile()
    onValidationChange(false)
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  /**
   * Handle keyboard navigation for drop zone
   */
  const handleDropZoneKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      handleDropZoneClick()
    }
  }

  // Get error message if validation failed
  const errorMessage = getErrorMessage(validationError)

  return (
    <div className="space-y-4">
      {/* File Upload Zone */}
      {!selectedFile && (
        <>
          <div
            className={clx(
              "relative border-2 border-dashed rounded-lg transition-all duration-200",
              "cursor-pointer hover:border-ui-fg-interactive hover:bg-ui-bg-subtle-hover",
              "focus:outline-none focus:ring-2 focus:ring-ui-fg-interactive focus:ring-offset-2",
              isDragging
                ? "border-ui-fg-interactive bg-ui-bg-subtle-hover"
                : "border-ui-border-base"
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleDropZoneClick}
            onKeyDown={handleDropZoneKeyDown}
            role="button"
            tabIndex={0}
            aria-label="Upload design file. Click to select file or drag and drop."
          >
            <div className="flex flex-col items-center justify-center p-12 text-center">
              {/* Upload Icon */}
              <div className="mb-4 p-3 rounded-full bg-ui-bg-subtle">
                <ArrowUpTray className="w-8 h-8 text-ui-fg-muted" />
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <Text className="font-medium text-ui-fg-base">
                  {isDragging ? "Drop your file here" : "Drag and drop your design file"}
                </Text>
                <Text size="small" className="text-ui-fg-subtle">
                  or click to browse files
                </Text>
              </div>

              {/* File requirements */}
              <div className="mt-4 pt-4 border-t border-ui-border-base">
                <Text size="xsmall" className="text-ui-fg-muted">
                  Supported formats: PNG, JPG • Maximum size: 10MB
                </Text>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,image/png,image/jpeg"
              onChange={handleFileInputChange}
              className="hidden"
              aria-label="File input for design upload"
            />
          </div>

          {/* Validation Error */}
          {errorMessage && (
            <div
              className="flex items-start gap-x-2 p-3 rounded-lg bg-ui-bg-subtle border border-ui-border-error"
              role="alert"
              aria-live="polite"
            >
              <XMark className="w-5 h-5 text-ui-fg-error flex-shrink-0 mt-0.5" />
              <Text size="small" className="text-ui-fg-error">
                {errorMessage}
              </Text>
            </div>
          )}
        </>
      )}

      {/* File Preview */}
      {selectedFile && previewUrl && (
        <div
          className="border border-ui-border-base rounded-lg overflow-hidden"
          role="region"
          aria-label="Selected file preview"
        >
          {/* Preview Image */}
          <div className="relative bg-ui-bg-subtle aspect-video flex items-center justify-center">
            <img
              src={previewUrl}
              alt={`Preview of ${selectedFile.name}`}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* File Info */}
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-x-4">
              <div className="flex items-start gap-x-3 min-w-0 flex-1">
                <div className="p-2 rounded bg-ui-bg-subtle flex-shrink-0">
                  <Photo className="w-5 h-5 text-ui-fg-muted" />
                </div>
                <div className="min-w-0 flex-1">
                  <Text className="font-medium truncate" title={selectedFile.name}>
                    {selectedFile.name}
                  </Text>
                  <Text size="small" className="text-ui-fg-subtle">
                    {formatFileSize(selectedFile.size)}
                  </Text>
                </div>
              </div>

              {/* Remove Button */}
              <Button
                variant="transparent"
                onClick={handleRemoveFile}
                aria-label="Remove selected file"
                className="flex-shrink-0"
              >
                <XMark className="w-5 h-5" />
              </Button>
            </div>

            {/* Upload Progress */}
            {uploadProgress.status === "uploading" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Text size="small" className="text-ui-fg-subtle">
                    Uploading...
                  </Text>
                  <Text size="small" className="text-ui-fg-subtle">
                    {uploadProgress.percentage}%
                  </Text>
                </div>
                <div className="w-full bg-ui-bg-subtle rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-ui-fg-interactive h-full transition-all duration-300"
                    style={{ width: `${uploadProgress.percentage}%` }}
                    role="progressbar"
                    aria-valuenow={uploadProgress.percentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Upload progress"
                  />
                </div>
              </div>
            )}

            {/* Upload Success */}
            {uploadProgress.status === "success" && (
              <div className="flex items-center gap-x-2 text-ui-fg-success">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <Text size="small">Upload successful</Text>
              </div>
            )}

            {/* Upload Error */}
            {uploadProgress.status === "error" && errorMessage && (
              <div className="flex items-start gap-x-2 text-ui-fg-error">
                <XMark className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <Text size="small">{errorMessage}</Text>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Accessibility: Additional Instructions */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {selectedFile
          ? `File selected: ${selectedFile.name}, ${formatFileSize(selectedFile.size)}`
          : "No file selected. Use the file upload area to select a design file."}
      </div>
    </div>
  )
}
