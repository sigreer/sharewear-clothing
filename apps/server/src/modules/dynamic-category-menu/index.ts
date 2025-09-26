import { Module } from "@medusajs/framework/utils"
import DynamicCategoryMenuService, { DYNAMIC_CATEGORY_MENU } from "./service"

export * from "./types"
export { DYNAMIC_CATEGORY_MENU }
export type { default as DynamicCategoryMenuService } from "./service"

export default Module(DYNAMIC_CATEGORY_MENU, {
  service: DynamicCategoryMenuService
})
