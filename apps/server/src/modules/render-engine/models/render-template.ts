import { model } from "@medusajs/framework/utils"

export const RENDER_TEMPLATE_TABLE = "render_template"

/**
 * RenderTemplate Model
 *
 * Manages available T-shirt templates (colors, styles) for the render engine.
 * Each template defines the visual assets and configuration needed for rendering
 * custom designs onto different t-shirt styles.
 *
 * @model render_template
 */
const RenderTemplate = model.define(RENDER_TEMPLATE_TABLE, {
  // Primary key
  id: model.id().primaryKey(),

  // Template identification
  name: model.text(), // e.g., "White T-Shirt", "Black Hoodie"

  // Template asset paths
  template_image_path: model.text(), // Path to PNG template for compositing
  blend_file_path: model.text(), // Path to .blend file for rendering

  // Configuration
  available_presets: model.json(), // JSON array of supported PresetType values
  is_active: model.boolean().default(true),

  // Visual preview
  thumbnail_url: model.text().nullable(),

  // Extensibility - stores color codes, material properties, etc.
  metadata: model.json().nullable()

  // Note: created_at, updated_at, and deleted_at are implicitly added by Medusa
})

export default RenderTemplate
