import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { MedusaError } from "@medusajs/framework/utils"
import MailtrapPluginService, {
  MAILTRAP_PLUGIN
} from "../../../../../modules/mailtrap-plugin/service"
import {
  MAILTRAP_NOTIFICATION_DISPATCHER,
  MailtrapNotificationDispatcher
} from "../../../../../modules/mailtrap-plugin/mailtrap-notification-dispatcher"

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const pluginService: MailtrapPluginService = req.scope.resolve(MAILTRAP_PLUGIN)
  const { id } = req.params

  if (!id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "A mapping id must be provided to delete a Mailtrap template mapping."
    )
  }

  await pluginService.deleteTemplateMapping(id)

  try {
    const dispatcher = req.scope.resolve<MailtrapNotificationDispatcher>(
      MAILTRAP_NOTIFICATION_DISPATCHER
    )
    await dispatcher.refreshAllSubscriptions()
  } catch (error) {
    req.scope
      .resolve("logger")
      ?.warn(
        `[mailtrap/mappings] failed to refresh dispatcher after deleting ${id}: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      )
  }

  res.json({ id, deleted: true })
}
