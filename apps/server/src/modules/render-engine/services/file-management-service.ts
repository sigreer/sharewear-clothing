import { MedusaError } from "@medusajs/framework/utils"
import type { Logger } from "@medusajs/framework/types"
import fs from "fs/promises"
import { existsSync, createReadStream } from "fs"
import path from "path"
import { Readable } from "stream"

type InjectedDependencies = {
  logger: Logger
}

/**
 * File type for upload operations
 */
export type UploadFile = {
  buffer: Buffer
  filename: string
  mimetype: string
}

/**
 * Upload result with public URL and storage path
 */
export type UploadResult = {
  url: string
  path: string
}

/**
 * Output file type for render results
 */
export type OutputType = 'composited' | 'rendered' | 'animation'

/**
 * Cleanup result
 */
export type CleanupResult = {
  count: number
}

/**
 * Allowed MIME types for design uploads
 */
const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg'
]

/**
 * Maximum file size for uploads (10MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB in bytes

/**
 * Magic bytes for file type validation
 */
const FILE_MAGIC_BYTES = {
  png: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
  jpg: Buffer.from([0xFF, 0xD8, 0xFF]),
  jpeg: Buffer.from([0xFF, 0xD8, 0xFF])
}

/**
 * Base directory for file storage (relative to project root)
 */
const STATIC_DIR = path.resolve(process.cwd(), 'static')

/**
 * File Management Service
 *
 * Manages file uploads, storage, URL generation, and cleanup for render jobs.
 * Integrates with Medusa's local file provider while also handling direct
 * file system operations for temporary processing files.
 *
 * File Organization:
 * - Uploads: /static/uploads/render-jobs/{job-id}/design.{ext}
 * - Temp: /tmp/render-jobs/{job-id}/
 * - Outputs: /static/media/products/{product-id}/renders/{job-id}/
 *
 * Security Features:
 * - File type validation (MIME + magic bytes)
 * - Max file size enforcement
 * - Path sanitization and traversal prevention
 * - Automatic cleanup of temporary files
 *
 * @service
 */
export default class FileManagementService {
  protected readonly logger_: Logger

  // Base URL for public file access (configured via MEDUSA_FILE_BASE_URL)
  protected readonly baseUrl_: string

  constructor(dependencies: InjectedDependencies) {
    this.logger_ = dependencies.logger

    // Resolve base URL from environment or default to sharewear.local:9000
    this.baseUrl_ = this.resolveBaseUrl()

    this.logger_.debug(
      `FileManagementService initialized with baseUrl: ${this.baseUrl_}, staticDir: ${STATIC_DIR}`
    )
  }

  /**
   * Upload a design file for a render job
   *
   * @param file - File data with buffer, filename, and mimetype
   * @param jobId - Render job ID
   * @returns Upload result with public URL and storage path
   * @throws {MedusaError} If validation fails
   */
  async uploadDesignFile(
    file: UploadFile,
    jobId: string
  ): Promise<UploadResult> {
    this.logger_.info(
      `Uploading design file for job ${jobId}: ${file.filename} (${file.mimetype}, ${file.buffer.length} bytes)`
    )

    try {
      // Validate job ID
      this.validateJobId(jobId)

      // Validate file
      this.validateFileUpload(file)

      // Sanitize filename and determine extension
      const ext = this.getFileExtension(file.filename, file.mimetype)
      const sanitizedFilename = `design${ext}`

      // Create storage path
      const storagePath = path.join(
        STATIC_DIR,
        'uploads',
        'render-jobs',
        jobId,
        sanitizedFilename
      )

      // Ensure directory exists
      await this.ensureDirectory(path.dirname(storagePath))

      // Write file to disk
      await fs.writeFile(storagePath, file.buffer)

      // Generate public URL
      const publicUrl = this.getPublicUrl(storagePath)

      this.logger_.info(
        `Design file uploaded successfully for job ${jobId}: ${storagePath} -> ${publicUrl}`
      )

      return {
        url: publicUrl,
        path: storagePath
      }

    } catch (error) {
      this.logger_.error(
        `Failed to upload design file for job ${jobId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )

      if (error instanceof MedusaError) {
        throw error
      }

      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Failed to upload design file: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Store a render output file (composited, rendered, or animation)
   *
   * @param filePath - Local file path of the output
   * @param jobId - Render job ID
   * @param type - Type of output (composited, rendered, animation)
   * @returns Upload result with public URL and storage path
   * @throws {MedusaError} If file not found or validation fails
   */
  async storeRenderOutput(
    filePath: string,
    jobId: string,
    type: OutputType
  ): Promise<UploadResult> {
    this.logger_.info(
      `Storing render output for job ${jobId}: ${type} from ${filePath}`
    )

    try {
      // Validate job ID
      this.validateJobId(jobId)

      // Validate file path
      this.validateFilePath(filePath)

      // Verify file exists
      if (!existsSync(filePath)) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          `Output file not found: ${filePath}`
        )
      }

      // Determine output filename and extension based on type
      const { filename, ext } = this.getOutputFilename(type, filePath)

      // Create storage path (using job-id for product-id placeholder)
      const storagePath = path.join(
        STATIC_DIR,
        'media',
        'products',
        jobId, // Will be replaced with actual product ID in orchestration
        'renders',
        jobId,
        filename
      )

      // Ensure directory exists
      await this.ensureDirectory(path.dirname(storagePath))

      // Copy file to storage location
      await fs.copyFile(filePath, storagePath)

      // Generate public URL
      const publicUrl = this.getPublicUrl(storagePath)

      this.logger_.info(
        `Render output stored successfully for job ${jobId} (${type}): ${storagePath} -> ${publicUrl}`
      )

      return {
        url: publicUrl,
        path: storagePath
      }

    } catch (error) {
      this.logger_.error(
        `Failed to store render output for job ${jobId} (${type}): ${error instanceof Error ? error.message : 'Unknown error'}`
      )

      if (error instanceof MedusaError) {
        throw error
      }

      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Failed to store render output: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Clean up all files associated with a render job
   *
   * @param jobId - Render job ID
   * @throws Does not throw - logs warnings instead
   */
  async cleanupJobFiles(jobId: string): Promise<void> {
    this.logger_.info(`Cleaning up job files for job ${jobId}`)

    try {
      // Validate job ID
      this.validateJobId(jobId)

      const pathsToClean = [
        // Temporary directory
        path.join('/tmp', 'render-jobs', jobId),
        // Upload directory
        path.join(STATIC_DIR, 'uploads', 'render-jobs', jobId)
        // Note: We don't delete final outputs in media/products as they're permanent
      ]

      let cleanedCount = 0

      for (const dirPath of pathsToClean) {
        try {
          if (existsSync(dirPath)) {
            await fs.rm(dirPath, { recursive: true, force: true })
            cleanedCount++
            this.logger_.debug(`Cleaned up directory: ${dirPath}`)
          }
        } catch (error) {
          // Log warning but don't throw - cleanup is best effort
          this.logger_.warn(
            `Failed to clean up directory ${dirPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }
      }

      this.logger_.info(
        `Job files cleanup completed for job ${jobId}: cleaned ${cleanedCount} directories`
      )

    } catch (error) {
      // Log error but don't throw - cleanup failures shouldn't break the flow
      this.logger_.error(
        `Error during job files cleanup for job ${jobId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Clean up temporary files older than specified date
   *
   * @param olderThan - Date threshold for cleanup
   * @returns Cleanup result with count of deleted items
   */
  async cleanupTempFiles(olderThan: Date): Promise<CleanupResult> {
    this.logger_.info(
      `Cleaning up temporary files older than ${olderThan.toISOString()}`
    )

    let count = 0

    try {
      const tempBaseDir = path.join('/tmp', 'render-jobs')

      // Check if temp directory exists
      if (!existsSync(tempBaseDir)) {
        this.logger_.debug(`Temp directory does not exist, skipping cleanup: ${tempBaseDir}`)
        return { count: 0 }
      }

      // List all job directories
      const entries = await fs.readdir(tempBaseDir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const dirPath = path.join(tempBaseDir, entry.name)

          try {
            // Get directory stats
            const stats = await fs.stat(dirPath)

            // Check if older than threshold
            if (stats.mtime < olderThan) {
              await fs.rm(dirPath, { recursive: true, force: true })
              count++
              const age = olderThan.getTime() - stats.mtime.getTime()
              this.logger_.debug(
                `Cleaned up old temp directory ${dirPath} (age: ${age}ms)`
              )
            }
          } catch (error) {
            // Log warning but continue with other directories
            this.logger_.warn(
              `Failed to clean up temp directory ${dirPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
          }
        }
      }

      this.logger_.info(
        `Temp files cleanup completed: cleaned ${count} directories older than ${olderThan.toISOString()}`
      )

      return { count }

    } catch (error) {
      this.logger_.error(
        `Error during temp files cleanup: ${error instanceof Error ? error.message : 'Unknown error'}`
      )

      return { count }
    }
  }

  /**
   * Clean up temporary files older than specified milliseconds
   *
   * @param ageMs - Age threshold in milliseconds
   * @returns Number of directories cleaned
   */
  async cleanupOldTempFiles(ageMs: number): Promise<number> {
    const cutoffDate = new Date(Date.now() - ageMs)
    const result = await this.cleanupTempFiles(cutoffDate)
    return result.count
  }

  /**
   * Create a temporary directory for a render job
   *
   * @param jobId - Render job ID
   * @returns Absolute path to created directory
   * @throws {MedusaError} If directory creation fails
   */
  async createTempDirectory(jobId: string): Promise<string> {
    this.logger_.debug(`Creating temp directory for job ${jobId}`)

    try {
      // Validate job ID
      this.validateJobId(jobId)

      const tempDir = path.join('/tmp', 'render-jobs', jobId)

      // Create directory with recursive option
      await fs.mkdir(tempDir, { recursive: true })

      this.logger_.debug(`Temp directory created: ${tempDir}`)

      return tempDir

    } catch (error) {
      this.logger_.error(
        `Failed to create temp directory for job ${jobId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )

      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Failed to create temp directory: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get the path to a temp file for a render job
   *
   * @param jobId - Render job ID
   * @param filename - Name of the file
   * @returns Absolute path to the temp file
   * @throws {MedusaError} If validation fails
   */
  async getTempFilePath(jobId: string, filename: string): Promise<string> {
    try {
      // Validate job ID
      this.validateJobId(jobId)

      // Sanitize filename
      const sanitizedFilename = this.sanitizeFilename(filename)

      // Construct temp file path
      const tempFilePath = path.join('/tmp', 'render-jobs', jobId, sanitizedFilename)

      // Ensure parent directory exists
      await this.ensureDirectory(path.dirname(tempFilePath))

      return tempFilePath

    } catch (error) {
      this.logger_.error(
        `Failed to get temp file path for job ${jobId}, filename ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )

      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Failed to get temp file path: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Generate public URL for a file path
   *
   * @param filePath - Absolute file path
   * @returns Public URL
   */
  getPublicUrl(filePath: string): string {
    // Get relative path from static directory
    const relativePath = path.relative(STATIC_DIR, filePath)

    // Normalize path separators for URLs
    const urlPath = relativePath.split(path.sep).join('/')

    // Construct full URL
    const url = `${this.baseUrl_}/${urlPath}`

    return url
  }

  /**
   * Validate file upload
   *
   * @param file - File to validate
   * @throws {MedusaError} If validation fails
   */
  protected validateFileUpload(file: UploadFile): void {
    // Validate file object
    if (!file || typeof file !== 'object') {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'File is required and must be an object'
      )
    }

    // Validate buffer
    if (!Buffer.isBuffer(file.buffer)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'File buffer is required'
      )
    }

    // Validate file size
    if (file.buffer.length === 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'File is empty'
      )
    }

    if (file.buffer.length > MAX_FILE_SIZE) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`
      )
    }

    // Validate MIME type
    if (!file.mimetype || !ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
      )
    }

    // Validate magic bytes
    this.validateMagicBytes(file.buffer, file.mimetype)

    // Validate filename
    if (!file.filename || typeof file.filename !== 'string') {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Filename is required'
      )
    }
  }

  /**
   * Validate file magic bytes match declared MIME type
   *
   * @param buffer - File buffer
   * @param mimetype - Declared MIME type
   * @throws {MedusaError} If magic bytes don't match
   */
  protected validateMagicBytes(buffer: Buffer, mimetype: string): void {
    const mimeTypeLower = mimetype.toLowerCase()

    let expectedMagic: Buffer | undefined

    if (mimeTypeLower === 'image/png') {
      expectedMagic = FILE_MAGIC_BYTES.png
    } else if (mimeTypeLower === 'image/jpeg' || mimeTypeLower === 'image/jpg') {
      expectedMagic = FILE_MAGIC_BYTES.jpg
    }

    if (expectedMagic) {
      const actualMagic = buffer.slice(0, expectedMagic.length)

      if (!actualMagic.equals(expectedMagic)) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `File content does not match declared type: ${mimetype}`
        )
      }
    }
  }

  /**
   * Validate job ID format
   *
   * @param jobId - Job ID to validate
   * @throws {MedusaError} If validation fails
   */
  protected validateJobId(jobId: string): void {
    if (!jobId || typeof jobId !== 'string') {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Job ID is required and must be a string'
      )
    }

    // Check for path traversal
    if (jobId.includes('..') || jobId.includes('/') || jobId.includes('\\')) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Job ID contains invalid characters'
      )
    }

    // Validate format (should be UUID-like)
    const uuidPattern = /^[a-zA-Z0-9_-]+$/
    if (!uuidPattern.test(jobId)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'Job ID has invalid format'
      )
    }
  }

  /**
   * Validate and sanitize file path
   *
   * @param filePath - File path to validate
   * @throws {MedusaError} If validation fails
   */
  protected validateFilePath(filePath: string): void {
    if (!filePath || typeof filePath !== 'string') {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'File path is required and must be a string'
      )
    }

    // Normalize path
    const normalizedPath = path.normalize(filePath)

    // Check for path traversal
    if (normalizedPath.includes('..')) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'File path contains path traversal'
      )
    }

    // Ensure absolute path
    if (!path.isAbsolute(normalizedPath)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        'File path must be absolute'
      )
    }
  }

  /**
   * Sanitize filename to prevent path traversal
   *
   * @param filename - Original filename
   * @returns Sanitized filename
   */
  protected sanitizeFilename(filename: string): string {
    // Remove directory separators and path traversal
    return path.basename(filename)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
  }

  /**
   * Get file extension from filename and MIME type
   *
   * @param filename - Original filename
   * @param mimetype - MIME type
   * @returns File extension with leading dot
   */
  protected getFileExtension(filename: string, mimetype: string): string {
    const ext = path.extname(filename).toLowerCase()

    // Validate extension matches MIME type
    if (mimetype === 'image/png' && ext !== '.png') {
      return '.png'
    }

    if ((mimetype === 'image/jpeg' || mimetype === 'image/jpg') && ext !== '.jpg' && ext !== '.jpeg') {
      return '.jpg'
    }

    return ext || '.png' // Default to .png
  }

  /**
   * Get output filename and extension based on output type
   *
   * @param type - Output type
   * @param filePath - Original file path
   * @returns Filename and extension
   */
  protected getOutputFilename(type: OutputType, filePath: string): { filename: string; ext: string } {
    const ext = path.extname(filePath).toLowerCase()

    switch (type) {
      case 'composited':
        return { filename: 'composited.png', ext: '.png' }
      case 'rendered':
        return { filename: 'rendered.png', ext: '.png' }
      case 'animation':
        return { filename: 'animation.mp4', ext: '.mp4' }
      default:
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Unknown output type: ${type}`
        )
    }
  }

  /**
   * Ensure directory exists, creating it if necessary
   *
   * @param dirPath - Directory path
   */
  protected async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true })
    } catch (error) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Failed to create directory: ${dirPath}`
      )
    }
  }

  /**
   * Resolve base URL for public file access
   *
   * @returns Base URL
   */
  protected resolveBaseUrl(): string {
    // Check environment variables in order of priority
    const baseUrl =
      process.env.MEDUSA_FILE_BASE_URL ||
      process.env.MEDUSA_PUBLIC_BASE_URL ||
      process.env.MEDUSA_BACKEND_URL ||
      'http://sharewear.local:9000/static'

    // Ensure URL ends with /static
    if (!baseUrl.endsWith('/static')) {
      return `${baseUrl.replace(/\/$/, '')}/static`
    }

    return baseUrl
  }
}
