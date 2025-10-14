/**
 * Render Engine Module Types
 *
 * This module handles the orchestration of t-shirt design rendering using Blender.
 * It manages render jobs, presets, and the compositing pipeline.
 */

/**
 * Status of a render job throughout its lifecycle
 */
export type RenderJobStatus =
  | 'pending'      // Job created, waiting to start
  | 'compositing'  // Creating composite image from design layers
  | 'rendering'    // Blender render in progress
  | 'completed'    // Render successful, images available
  | 'failed'       // Render failed, see error message

/**
 * Predefined t-shirt design placement presets
 *
 * Front panel presets (chest area):
 * - chest-small: Small zone at very top of chest
 * - chest-medium: Medium zone covering chest area
 * - chest-large: Large zone covering most of front
 *
 * Back panel presets (upper back area):
 * - back-small: Small zone at top of back
 * - back-medium: Medium zone on upper back
 * - back-large: Large zone covering upper/mid back
 *
 * Back panel presets (lower back area):
 * - back-bottom-small: Small zone at lower back
 * - back-bottom-medium: Medium zone at lower back
 * - back-bottom-large: Large zone at lower back
 */
export type PresetType =
  // Front panel presets
  | 'chest-small'
  | 'chest-medium'
  | 'chest-large'
  // Back panel presets (upper)
  | 'back-small'
  | 'back-medium'
  | 'back-large'
  // Back panel presets (lower)
  | 'back-bottom-small'
  | 'back-bottom-medium'
  | 'back-bottom-large'

/**
 * Placement configuration for design on t-shirt
 */
export type DesignPlacement = {
  /** X position in normalized coordinates (0-1) */
  x: number
  /** Y position in normalized coordinates (0-1) */
  y: number
  /** Scale factor for the design (1.0 = 100%) */
  scale: number
  /** Rotation in degrees */
  rotation: number
}

/**
 * Design layer for composite image creation
 */
export type DesignLayer = {
  /** Path to the design image file */
  imagePath: string
  /** Layer opacity (0-1) */
  opacity: number
  /** Blend mode for compositing */
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay'
  /** Position offset from base placement */
  offsetX?: number
  offsetY?: number
}

/**
 * Input for creating a new render job
 */
export type RenderJobInput = {
  /** Product variant ID this render is for */
  productVariantId: string
  /** Design image URL or file path */
  designImageUrl: string
  /** Optional preset to use (overrides manual placement) */
  preset?: PresetType | null
  /** Manual placement configuration (ignored if preset specified) */
  placement?: DesignPlacement | null
  /** Optional array of design layers for complex designs */
  layers?: DesignLayer[] | null
  /** Output image size in pixels (default: 1024) */
  outputSize?: number
  /** T-shirt color hex code (default: '#FFFFFF') */
  tshirtColor?: string
  /** Additional metadata for the job */
  metadata?: Record<string, unknown> | null
}

/**
 * Data transfer object for render job
 */
export type RenderJobDTO = {
  id: string
  productVariantId: string
  designImageUrl: string
  preset: PresetType | null
  placement: DesignPlacement | null
  layers: DesignLayer[]
  outputSize: number
  tshirtColor: string
  status: RenderJobStatus

  /** Path to the composited design image */
  compositedImagePath: string | null
  /** Paths to final rendered images */
  renderedImagePaths: string[]

  /** Error message if status is 'failed' */
  errorMessage: string | null
  /** Additional metadata */
  metadata: Record<string, unknown> | null

  /** Timestamp when job was created */
  createdAt: Date
  /** Timestamp when job was last updated */
  updatedAt: Date
  /** Timestamp when job completed (success or failure) */
  completedAt: Date | null
}

/**
 * Module configuration options
 */
export type RenderEngineModuleOptions = {
  /** Base directory for storing render outputs */
  outputDir?: string
  /** Base directory for temporary files */
  tempDir?: string
  /** Default output size for renders */
  defaultOutputSize?: number
  /** Blender executable path (default: 'blender') */
  blenderPath?: string
  /** Path to the Blender template file */
  blenderTemplatePath?: string
}

/**
 * Preset configuration mapping preset names to placement settings
 */
export type PresetConfiguration = {
  [K in PresetType]: DesignPlacement
}

/**
 * Default preset configurations
 *
 * Note: The actual preset logic is handled by compose_design.py.
 * These values are for reference/documentation only.
 */
export const DEFAULT_PRESETS: PresetConfiguration = {
  'chest-small': { x: 0.5, y: 0.15, scale: 0.45, rotation: 0 },
  'chest-medium': { x: 0.5, y: 0.22, scale: 0.6, rotation: 0 },
  'chest-large': { x: 0.5, y: 0.5, scale: 0.75, rotation: 0 },
  'back-small': { x: 0.5, y: 0.12, scale: 0.4, rotation: 0 },
  'back-medium': { x: 0.5, y: 0.3, scale: 0.6, rotation: 0 },
  'back-large': { x: 0.5, y: 0.25, scale: 0.7, rotation: 0 },
  'back-bottom-small': { x: 0.5, y: 0.8, scale: 0.5, rotation: 0 },
  'back-bottom-medium': { x: 0.5, y: 0.75, scale: 0.6, rotation: 0 },
  'back-bottom-large': { x: 0.5, y: 0.7, scale: 0.65, rotation: 0 }
}

/**
 * Render configuration for individual render jobs
 * This can be stored as JSON in RenderJob.metadata or as a separate table
 */
export type RenderConfig = {
  /** Preset type for this render */
  preset: PresetType
  /** Path to PNG template for compositing */
  template_path: string
  /** Path to .blend file for rendering */
  blend_file_path: string
  /** Render samples for quality (default: 128) */
  render_samples?: number
  /** Whether to generate animation alongside static render */
  generate_animation?: boolean
}

/**
 * Data transfer object for RenderTemplate
 */
export type RenderTemplateDTO = {
  id: string
  /** Template name (e.g., "White T-Shirt", "Black Hoodie") */
  name: string
  /** Path to PNG template for compositing */
  template_image_path: string
  /** Path to .blend file for rendering */
  blend_file_path: string
  /** Array of supported preset types */
  available_presets: PresetType[]
  /** Whether this template is active and available for use */
  is_active: boolean
  /** Optional preview image URL */
  thumbnail_url: string | null
  /** Additional metadata (color codes, material properties, etc.) */
  metadata: Record<string, unknown> | null
  created_at: Date
  updated_at: Date
}

/**
 * Input for creating a new RenderTemplate
 */
export type CreateRenderTemplateInput = {
  name: string
  template_image_path: string
  blend_file_path: string
  available_presets: PresetType[]
  is_active?: boolean
  thumbnail_url?: string | null
  metadata?: Record<string, unknown> | null
}

/**
 * Input for updating a RenderTemplate
 */
export type UpdateRenderTemplateInput = {
  name?: string
  template_image_path?: string
  blend_file_path?: string
  available_presets?: PresetType[]
  is_active?: boolean
  thumbnail_url?: string | null
  metadata?: Record<string, unknown> | null
}

/**
 * Module identifier constant
 */
export const RENDER_ENGINE_MODULE = "render_engine"
