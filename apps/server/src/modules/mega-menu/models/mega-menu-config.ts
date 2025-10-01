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
    layout: model.enum(["default", "thumbnail-grid"]).default("default"),
    tagline: model.text().nullable(),
    columns: model.json().nullable(),
    featured: model.json().nullable(),
    submenu_category_ids: model.json().nullable(),
    metadata: model.json().nullable(),
    // Parent category configuration: determines how subcategories are displayed
    display_mode: model.enum(["simple-dropdown", "columns"]).nullable(),
    // Subcategory column configuration (when parent uses "columns" mode)
    column_layout: model.enum(["image", "image-with-text", "subcategory-icons", "text-and-icons"]).nullable(),
    column_image_url: model.text().nullable(),
    column_image_source: model.enum(["upload", "product"]).nullable(),
    column_badge: model.enum(["new", "offers", "free-shipping", "featured"]).nullable()
  }
)

export default MegaMenuConfig
