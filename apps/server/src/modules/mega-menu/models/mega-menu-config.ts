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
    metadata: model.json().nullable()
  }
)

export default MegaMenuConfig
