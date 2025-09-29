import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import {
  MEGA_MENU_GLOBAL_ID,
  MEGA_MENU_MODULE,
  type MegaMenuConfigDTO,
  type MegaMenuService
} from "../../../../modules/mega-menu"
import { IProductModuleService } from "@medusajs/types"
import {
  collectCategoryIdsFromConfig,
  pickMegaMenuPayload
} from "../utils"

type GlobalMegaMenuResponse = {
  config: MegaMenuConfigDTO | null
  preview: ReturnType<MegaMenuService["buildPreview"]>
  defaults: ReturnType<MegaMenuService["getDefaults"]>
}

const loadRelevantCategories = async (
  productModuleService: IProductModuleService,
  config: MegaMenuConfigDTO | null
) => {
  const referenced = collectCategoryIdsFromConfig(config)

  if (!referenced.length) {
    return []
  }

  return productModuleService.listProductCategories(
    {
      id: referenced
    },
    {
      take: referenced.length,
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
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const megaMenuService = req.scope.resolve<MegaMenuService>(MEGA_MENU_MODULE)
  const productModuleService = req.scope.resolve<IProductModuleService>(
    Modules.PRODUCT
  )

  const config = await megaMenuService.getGlobalConfig()
  const categories = await loadRelevantCategories(productModuleService, config)
  const preview = megaMenuService.buildPreview(config, categories)

  const payload: GlobalMegaMenuResponse = {
    config,
    preview,
    defaults: megaMenuService.getDefaults()
  }

  res.json(payload)
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const megaMenuService = req.scope.resolve<MegaMenuService>(MEGA_MENU_MODULE)
  const productModuleService = req.scope.resolve<IProductModuleService>(
    Modules.PRODUCT
  )

  const body = pickMegaMenuPayload(req.body)

  const updated = await megaMenuService.upsertGlobalConfig({
    ...body,
    categoryId: MEGA_MENU_GLOBAL_ID
  })

  const categories = await loadRelevantCategories(productModuleService, updated)
  const preview = megaMenuService.buildPreview(updated, categories)

  res.json({
    config: updated,
    preview
  })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const megaMenuService = req.scope.resolve<MegaMenuService>(MEGA_MENU_MODULE)

  await megaMenuService.deleteCategoryConfig(MEGA_MENU_GLOBAL_ID)

  res.status(204).send()
}
