import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import type { Logger } from "@medusajs/framework/types"
import MailtrapPluginService, {
  MAILTRAP_PLUGIN
} from "../../../../modules/mailtrap-plugin/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const pluginService: MailtrapPluginService = req.scope.resolve(MAILTRAP_PLUGIN)
  const logger = req.scope.resolve("logger") as Logger

  logger.info(
    `[mailtrap/templates] request context ${JSON.stringify({
      requestUrl: req.url
    })}`
  )

  const templates = await pluginService.listMailtrapTemplates()

  const defaults = {
    sender: await pluginService.getDefaultSender(),
    recipients: pluginService.getDefaultRecipients()
  }

  res.json({ templates, defaults })
}
