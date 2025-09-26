import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { MedusaError } from "@medusajs/framework/utils"
import MailtrapPluginService, { MAILTRAP_PLUGIN } from "../../../../../../modules/mailtrap-plugin/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  if (!id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "A template identifier is required to preview a Mailtrap template."
    )
  }

  const pluginService: MailtrapPluginService = req.scope.resolve(MAILTRAP_PLUGIN)

  const template = await pluginService.getMailtrapTemplateDetail(id)

  res.json({ template })
}
