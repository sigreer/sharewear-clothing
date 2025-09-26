import { MedusaError } from "@medusajs/framework/utils"
import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import type { Logger } from "@medusajs/framework/types"
import MailtrapPluginService, {
  MAILTRAP_PLUGIN
} from "../../../../modules/mailtrap-plugin/service"
import { MailtrapTemplateMappingUpsertDTO } from "../../../../modules/mailtrap-plugin/types"
import {
  MAILTRAP_NOTIFICATION_DISPATCHER,
  MailtrapNotificationDispatcher
} from "../../../../modules/mailtrap-plugin/mailtrap-notification-dispatcher"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const pluginService: MailtrapPluginService = req.scope.resolve(MAILTRAP_PLUGIN)
  const logger = req.scope.resolve("logger") as Logger

  logger.info(
    `[mailtrap/mappings] request context ${JSON.stringify({
      requestUrl: req.url
    })}`
  )

  const mappings = await pluginService.listTemplateMappings()

  res.json({ mappings })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const pluginService: MailtrapPluginService = req.scope.resolve(MAILTRAP_PLUGIN)

  const body = req.body as MailtrapTemplateMappingUpsertDTO | undefined

  if (!body?.notification_handle) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "A notification_handle is required to create a Mailtrap template mapping."
    )
  }

  if (!body?.template_id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "A template_id is required to map a Mailtrap template."
    )
  }

  const mapping = await pluginService.upsertTemplateMapping(body)

  try {
    const dispatcher = req.scope.resolve<MailtrapNotificationDispatcher>(
      MAILTRAP_NOTIFICATION_DISPATCHER
    )
    await dispatcher.refreshSubscriptionForHandle(body.notification_handle)
  } catch (error) {
    req.scope
      .resolve("logger")
      ?.warn(
        `[mailtrap/mappings] failed to refresh dispatcher for ${body.notification_handle}: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      )
  }

  res.json({ mapping })
}
