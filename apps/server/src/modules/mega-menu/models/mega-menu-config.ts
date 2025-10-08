import { model } from "@medusajs/framework/utils"

export const MEGA_MENU_CONFIG_TABLE = "mega_menu_config"

const MegaMenuConfig = model.define(
  {
    name: "mega_menu_config",
    tableName: MEGA_MENU_CONFIG_TABLE
  },
  {
    id: model.id().primaryKey(),
    category_id: model.text().unique(),

    // Global config field (only used when category_id = "__mega_menu_global__")
    default_menu_layout: model.enum(["no-menu", "simple-dropdown", "rich-columns"]).nullable(),

    // Per-category menu layout (inherits from global if not set)
    menu_layout: model.enum(["no-menu", "simple-dropdown", "rich-columns"]).nullable(),

    // Category-level content fields (not used for global config)
    tagline: model.text().nullable(),
    columns: model.json().nullable(),
    featured: model.json().nullable(),
    submenu_category_ids: model.json().nullable(),
    metadata: model.json().nullable(),

    // Second-level category configuration
    display_as_column: model.boolean().nullable(), // true = title/image/description, false = third-level list
    column_title: model.text().nullable(),
    column_description: model.text().nullable(),
    column_image_url: model.text().nullable(),
    column_image_source: model.enum(["upload", "product"]).nullable(),
    column_badge: model.enum(["new", "offers", "free-shipping", "featured"]).nullable(),

    // Third-level category configuration
    // Stores LucideReact icon name (e.g., 'ShoppingBag', 'Heart', 'Star')
    // @see https://lucide.dev/icons for available icons
    icon: model.text().nullable(),
    thumbnail_url: model.text().nullable(),
    selected_thumbnail_product_id: model.text().nullable(),
    selected_thumbnail_image_id: model.text().nullable(),
    title: model.text().nullable(),
    subtitle: model.text().nullable(),

    // Optional field to exclude category from menu while retaining config
    excluded_from_menu: model.boolean().default(false),

    // Legacy fields - keeping for backward compatibility during migration
    layout: model.enum(["default", "thumbnail-grid"]).nullable(),
    display_mode: model.enum(["simple-dropdown", "columns"]).nullable(),
    column_layout: model.enum(["image", "image-with-text", "subcategory-icons", "text-and-icons"]).nullable()
  }
)

export default MegaMenuConfig
