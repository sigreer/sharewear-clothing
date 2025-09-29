import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import {
  MEGA_MENU_MODULE,
  type MegaMenuService,
  type MegaMenuLayout
} from "../../../../modules/mega-menu"
import { IProductModuleService } from "@medusajs/types"

const AVAILABLE_LAYOUTS: MegaMenuLayout[] = ["default", "thumbnail-grid"]

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const megaMenuService = req.scope.resolve<MegaMenuService>(MEGA_MENU_MODULE)
  const productModuleService = req.scope.resolve<IProductModuleService>(
    Modules.PRODUCT
  )

  const query = typeof req.query?.q === "string" ? req.query.q.trim() : ""
  const limitParam = Number.parseInt(req.query?.limit as string, 10)
  const limit = Number.isFinite(limitParam) && limitParam > 0
    ? Math.min(limitParam, 200)
    : 200

  const selector: Record<string, unknown> = {}

  if (query.length) {
    selector.q = query
  }

  const categories = await productModuleService.listProductCategories(
    selector,
    {
      take: limit,
      select: [
        "id",
        "name",
        "handle",
        "description",
        "parent_category_id",
        "rank"
      ]
    }
  )

  const configMap = await megaMenuService.getConfigMap(
    categories.map(category => category.id)
  )

  res.json({
    categories: categories.map(category => ({
      id: category.id,
      name: category.name,
      handle: category.handle,
      description: category.description,
      parent_category_id: category.parent_category_id,
      rank: category.rank,
      config: configMap.get(category.id) ?? null
    })),
    total: categories.length,
    availableLayouts: AVAILABLE_LAYOUTS,
    defaults: megaMenuService.getDefaults()
  })
}
