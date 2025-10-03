import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  MEGA_MENU_GLOBAL_ID,
  MEGA_MENU_MODULE,
  type MegaMenuConfigDTO,
  type MegaMenuService
} from "../../../../modules/mega-menu"
import { pickMegaMenuPayload } from "../utils"

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

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const megaMenuService = req.scope.resolve<MegaMenuService>(MEGA_MENU_MODULE)

  const body = pickMegaMenuPayload(req.body)

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
