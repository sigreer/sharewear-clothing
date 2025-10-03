import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import {
  MEGA_MENU_MODULE,
  type MegaMenuService,
  type MegaMenuLayout
} from "../../../../modules/mega-menu"
import { pickMegaMenuPayload } from "../utils"

const AVAILABLE_MENU_LAYOUTS: MegaMenuLayout[] = ["no-menu", "simple-dropdown", "rich-columns"]

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const categoryId = req.params.category_id

  if (!categoryId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Category ID is required"
    )
  }

  const megaMenuService = req.scope.resolve<MegaMenuService>(MEGA_MENU_MODULE)

  const [config, globalConfig] = await Promise.all([
    megaMenuService.getCategoryConfig(categoryId),
    megaMenuService.getGlobalConfig()
  ])

  res.json({
    categoryId,
    config,
    inherited: config ? null : globalConfig,
    defaults: megaMenuService.getDefaults(),
    availableMenuLayouts: AVAILABLE_MENU_LAYOUTS
  })
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const categoryId = req.params.category_id

  if (!categoryId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Category ID is required"
    )
  }

  const megaMenuService = req.scope.resolve<MegaMenuService>(MEGA_MENU_MODULE)

  const body = pickMegaMenuPayload(req.body)

  const updated = await megaMenuService.upsertCategoryConfig({
    ...body,
    categoryId
  })

  res.json({
    categoryId,
    config: updated
  })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const categoryId = req.params.category_id

  if (!categoryId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Category ID is required"
    )
  }

  const megaMenuService = req.scope.resolve<MegaMenuService>(MEGA_MENU_MODULE)

  await megaMenuService.deleteCategoryConfig(categoryId)

  res.status(204).send()
}
