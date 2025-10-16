import { model } from "@medusajs/framework/utils"

export const RENDER_JOB_TABLE = "render_job"

/**
 * RenderJob Model
 *
 * Represents a t-shirt design render job in the rendering pipeline.
 * Tracks the complete lifecycle from design upload through compositing,
 * Blender rendering, and final output generation.
 *
 * @model render_job
 */
const RenderJob = model.define(RENDER_JOB_TABLE, {
  // Primary key
  id: model.id().primaryKey(),

  // Foreign key relationships (stored as text, resolved at service layer)
  product_id: model.text(),
  variant_id: model.text().nullable(),

  // Job status and lifecycle
  status: model.enum([
    'pending',
    'compositing',
    'rendering',
    'completed',
    'failed'
  ]).default('pending'),

  // Design and output URLs
  design_file_url: model.text().nullable(),
  composited_file_url: model.text().nullable(),
  rendered_image_url: model.text().nullable(),
  animation_url: model.text().nullable(),

  // Configuration - Design placement preset (9 available presets)
  preset: model.enum([
    // Front panel presets
    'chest-small',
    'chest-medium',
    'chest-large',
    // Back panel presets (upper)
    'back-small',
    'back-medium',
    'back-large',
    // Back panel presets (lower)
    'back-bottom-small',
    'back-bottom-medium',
    'back-bottom-large'
  ]),

  // Reference to RenderTemplate (foreign key to render_template table)
  template_id: model.text().nullable(),

  // Error handling
  error_message: model.text().nullable(),

  // Timestamps
  started_at: model.dateTime().nullable(),
  completed_at: model.dateTime().nullable(),

  // Extensibility - can store RenderConfig here as JSON
  // Example: { config: { render_samples: 256, generate_animation: true }, ... }
  metadata: model.json().nullable()
})

export default RenderJob
