import { PresetType } from "../../modules/render-engine/types"
import { RenderMode } from "../../modules/render-engine/services/python-executor-service"

/**
 * Serialized Buffer type (JSON representation)
 */
export type SerializedBuffer = {
  type: 'Buffer'
  data: number[]
}

/**
 * Input type for the create-render workflow
 */
export type CreateRenderWorkflowInput = {
  /** Product ID to associate renders with */
  productId: string

  /** Design file as Buffer (or serialized Buffer when coming through workflow) */
  designFile: Buffer | SerializedBuffer

  /** Original filename for the design */
  designFilename: string

  /** MIME type of the design file */
  designMimetype: string

  /** Preset configuration for design placement */
  preset: PresetType

  /** Path to PNG template for compositing */
  templatePath: string

  /** Path to .blend file for rendering */
  blendFile: string

  /** Optional fabric/shirt color (hex #RRGGBB or named color) */
  fabricColor?: string

  /** Optional background color (hex #RRGGBB, named color, or 'transparent') */
  backgroundColor?: string

  /** Render mode: 'all' (default), 'images-only', or 'animation-only' */
  renderMode?: RenderMode

  /** Render samples for quality (default: 128) */
  samples?: number
}

/**
 * Output type from the create-render workflow
 */
export type CreateRenderWorkflowOutput = {
  /** Created render job ID */
  jobId: string

  /** Job status */
  status: string

  /** Array of created product media IDs */
  mediaIds: string[]

  /** Public URLs for rendered images */
  renderedImageUrls: string[]

  /** Public URL for animation (if generated) */
  animationUrl?: string

  /** Error message if failed */
  error?: string
}

/**
 * Step input for creating render job
 */
export type CreateRenderJobStepInput = {
  productId: string
  preset: PresetType
}

/**
 * Step output for creating render job
 */
export type CreateRenderJobStepOutput = {
  jobId: string
  productId: string
  preset: PresetType
}

/**
 * Step input for uploading design file
 */
export type UploadDesignFileStepInput = {
  jobId: string
  designFile: Buffer
  filename: string
  mimetype: string
}

/**
 * Step output for uploading design file
 */
export type UploadDesignFileStepOutput = {
  designUrl: string
  designPath: string
}

/**
 * Step input for composing design
 */
export type ComposeDesignStepInput = {
  jobId: string
  templatePath: string
  designPath: string
  preset: PresetType
  fabricColor?: string
}

/**
 * Step output for composing design
 */
export type ComposeDesignStepOutput = {
  compositedPath: string
  compositedUrl: string
}

/**
 * Step input for rendering design
 */
export type RenderDesignStepInput = {
  jobId: string
  blendFile: string
  texturePath: string
  samples?: number
  renderMode?: RenderMode
  backgroundColor?: string
}

/**
 * Step output for rendering design
 */
export type RenderDesignStepOutput = {
  renderedImages: string[]
  animation?: string
}

/**
 * Step input for storing render outputs
 */
export type StoreRenderOutputsStepInput = {
  jobId: string
  renderedImages: string[]
  animation?: string
}

/**
 * Step output for storing render outputs
 */
export type StoreRenderOutputsStepOutput = {
  renderedImageUrls: string[]
  animationUrl?: string
}

/**
 * Step input for associating product media
 */
export type AssociateProductMediaStepInput = {
  jobId: string
  productId: string
  preset: PresetType
  renderedImageUrls: string[]
  animationUrl?: string
}

/**
 * Step output for associating product media
 */
export type AssociateProductMediaStepOutput = {
  mediaIds: string[]
}

/**
 * Step input for completing render job
 */
export type CompleteRenderJobStepInput = {
  jobId: string
  mediaIds: string[]
}

/**
 * Step output for completing render job
 */
export type CompleteRenderJobStepOutput = {
  jobId: string
  status: string
}
