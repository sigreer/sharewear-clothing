import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  MEGA_MENU_GLOBAL_ID,
  MEGA_MENU_MODULE,
  type MegaMenuConfigDTO,
  type MegaMenuService
} from "../../../../modules/mega-menu"
import { pickMegaMenuPayload, validateIconField, validateColumnsIcons } from "../utils"

type GlobalMegaMenuResponse = {
  config: MegaMenuConfigDTO | null
  defaults: ReturnType<MegaMenuService["getDefaults"]>
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const megaMenuService = req.scope.resolve<MegaMenuService>(MEGA_MENU_MODULE)

  const config = await megaMenuService.getGlobalConfig()

  const payload: GlobalMegaMenuResponse = {
    config,
    defaults: megaMenuService.getDefaults()
  }

  res.json(payload)
}

/**
 * PUT /admin/mega-menu/global
 *
 * Updates global mega-menu configuration.
 *
 * Icon Field: The `icon` field accepts LucideReact icon names (e.g., 'ShoppingBag', 'Heart', 'Star').
 * Icons should follow PascalCase naming convention. See https://lucide.dev/icons for available icons.
 * Invalid icon names will log warnings but won't block the request.
 */
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const megaMenuService = req.scope.resolve<MegaMenuService>(MEGA_MENU_MODULE)

  const body = pickMegaMenuPayload(req.body)

  // Validate icon fields (logs warnings, doesn't block)
  if (body.icon) {
    validateIconField(body.icon, "global config icon")
  }
  if (body.columns) {
    validateColumnsIcons(body.columns)
  }

  const updated = await megaMenuService.upsertGlobalConfig({
    ...body,
    categoryId: MEGA_MENU_GLOBAL_ID
  })

  res.json({
    config: updated
  })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const megaMenuService = req.scope.resolve<MegaMenuService>(MEGA_MENU_MODULE)

  await megaMenuService.deleteCategoryConfig(MEGA_MENU_GLOBAL_ID)

  res.status(204).send()
}
