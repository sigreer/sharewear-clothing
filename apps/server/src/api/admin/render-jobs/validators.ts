import { z } from "zod"
import { PresetType } from "../../../modules/render-engine/types"

/**
 * Valid preset types (all 9 presets)
 */
export const VALID_PRESETS: PresetType[] = [
  "chest-small",
  "chest-medium",
  "chest-large",
  "back-small",
  "back-medium",
  "back-large",
  "back-bottom-small",
  "back-bottom-medium",
  "back-bottom-large"
]

/**
 * Valid render modes
 */
export const VALID_RENDER_MODES = ["all", "images-only", "animation-only"] as const

/**
 * Maximum file size for design uploads (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * Allowed MIME types for design files
 */
export const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg"]

/**
 * Schema for creating a render job
 */
export const createRenderJobSchema = z.object({
  product_id: z.string().min(1, "product_id is required"),
  preset: z.enum([
    "chest-small",
    "chest-medium",
    "chest-large",
    "back-small",
    "back-medium",
    "back-large",
    "back-bottom-small",
    "back-bottom-medium",
    "back-bottom-large"
  ]),
  fabric_color: z.string().optional(),
  background_color: z.string().optional(),
  render_mode: z.enum(VALID_RENDER_MODES).optional(),
  samples: z.number().int().min(1).max(4096).optional()
})

/**
 * Schema for retry render job request body
 */
export const retryRenderJobSchema = z.object({
  preset: z.enum([
    "chest-small",
    "chest-medium",
    "chest-large",
    "back-small",
    "back-medium",
    "back-large",
    "back-bottom-small",
    "back-bottom-medium",
    "back-bottom-large"
  ]).optional(),
  fabric_color: z.string().optional(),
  background_color: z.string().optional(),
  samples: z.number().int().min(1).max(4096).optional()
})

/**
 * Validate hex color format
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color)
}

/**
 * Validate color (hex, named color, or 'transparent')
 */
export function isValidColor(color: string): boolean {
  if (color === "transparent") {
    return true
  }

  if (isValidHexColor(color)) {
    return true
  }

  // Allow common named colors
  const namedColors = [
    "white", "black", "red", "green", "blue", "yellow", "orange",
    "purple", "pink", "brown", "gray", "grey", "cyan", "magenta"
  ]

  return namedColors.includes(color.toLowerCase())
}

/**
 * Validate file type using MIME type and magic bytes
 */
export function validateFileType(buffer: Buffer, mimetype: string): { valid: boolean; error?: string } {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
    return {
      valid: false,
      error: `Invalid file type. Only PNG and JPEG files are allowed. Received: ${mimetype}`
    }
  }

  // Check magic bytes (file signature)
  if (buffer.length < 8) {
    return {
      valid: false,
      error: "File is too small to be a valid image"
    }
  }

  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  const isPNG = buffer[0] === 0x89 &&
                buffer[1] === 0x50 &&
                buffer[2] === 0x4E &&
                buffer[3] === 0x47

  // JPEG signature: FF D8 FF
  const isJPEG = buffer[0] === 0xFF &&
                 buffer[1] === 0xD8 &&
                 buffer[2] === 0xFF

  if (mimetype === "image/png" && !isPNG) {
    return {
      valid: false,
      error: "File claims to be PNG but has invalid file signature"
    }
  }

  if (mimetype === "image/jpeg" && !isJPEG) {
    return {
      valid: false,
      error: "File claims to be JPEG but has invalid file signature"
    }
  }

  return { valid: true }
}

/**
 * Validate file size
 */
export function validateFileSize(size: number): { valid: boolean; error?: string } {
  if (size > MAX_FILE_SIZE) {
    const sizeMB = (size / (1024 * 1024)).toFixed(2)
    const maxMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)
    return {
      valid: false,
      error: `File size (${sizeMB}MB) exceeds maximum allowed size of ${maxMB}MB`
    }
  }

  return { valid: true }
}
