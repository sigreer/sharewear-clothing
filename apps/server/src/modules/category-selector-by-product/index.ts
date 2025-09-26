import { Module } from "@medusajs/framework/utils"
import CategorySelectorByProductService, {
  CATEGORY_SELECTOR_BY_PRODUCT,
  CATEGORY_SELECTOR_GLOBAL_ID
} from "./service"

export * from "./types"
export { CATEGORY_SELECTOR_BY_PRODUCT, CATEGORY_SELECTOR_GLOBAL_ID }
export type { default as CategorySelectorByProductService } from "./service"

export default Module(CATEGORY_SELECTOR_BY_PRODUCT, {
  service: CategorySelectorByProductService
})
