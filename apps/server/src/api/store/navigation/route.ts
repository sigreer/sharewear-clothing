import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  DYNAMIC_CATEGORY_MENU,
  type DynamicCategoryMenuService
} from "../../../modules/dynamic-category-menu"
import {
  MEGA_MENU_MODULE,
  type MegaMenuService
} from "../../../modules/mega-menu"
import { Modules } from "@medusajs/framework/utils"
import { IProductModuleService } from "@medusajs/types"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const menuService = req.scope.resolve<DynamicCategoryMenuService>(
      DYNAMIC_CATEGORY_MENU
    )

    const productModuleService = req.scope.resolve<IProductModuleService>(
      Modules.PRODUCT
    )

    const categories = await productModuleService.listProductCategories(
      {},
      {
        take: 1000,
        select: [
          "id",
          "name",
          "handle",
          "description",
          "is_active",
          "is_internal",
          "parent_category_id",
          "rank",
          "metadata"
        ],
      }
    )

    console.log("Navigation API Debug:", {
      totalCategories: categories.length,
      activeCategories: categories.filter(c => c.is_active).length,
      internalCategories: categories.filter(c => c.is_internal).length,
      categoriesWithHandles: categories.filter(c => c.handle).length,
      sampleCategory: categories[0] ? {
        id: categories[0].id,
        name: categories[0].name,
        handle: categories[0].handle,
        is_active: categories[0].is_active,
        is_internal: categories[0].is_internal,
        parent_category_id: categories[0].parent_category_id
      } : null
    })

    const items = await menuService.buildNavigationTree(categories)
    const megaMenuService = req.scope.resolve<MegaMenuService>(MEGA_MENU_MODULE)
    const navigation = await megaMenuService.buildNavigationWithMegaMenu(
      items,
      categories
    )

    console.log("Generated navigation items:", navigation.length)

    res.json({ items: navigation })
  } catch (error) {
    console.error("Navigation API error:", error)
    res.status(500).json({
      error: "Failed to generate navigation",
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}
