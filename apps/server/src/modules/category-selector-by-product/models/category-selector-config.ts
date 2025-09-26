import { model } from "@medusajs/framework/utils"

export const CATEGORY_SELECTOR_TABLE = "category_selector_by_product_config"

const CategorySelectorByProductConfig = model.define(
  {
    name: "category_selector_by_product_config",
    tableName: CATEGORY_SELECTOR_TABLE
  },
  {
    id: model.id().primaryKey(),
    category_id: model.text().unique(),
    mode: model
      .enum(["custom_image", "product_image", "random_product"])
      .default("random_product"),
    custom_image_url: model.text().nullable(),
    selected_product_id: model.text().nullable(),
    selected_product_image_id: model.text().nullable(),
    random_product_ids: model.json().nullable(),
    metadata: model.json().nullable()
  }
)

export default CategorySelectorByProductConfig
