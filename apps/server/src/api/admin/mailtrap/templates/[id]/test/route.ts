import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { MedusaError } from "@medusajs/framework/utils"
import MailtrapPluginService, { MAILTRAP_PLUGIN } from "../../../../../../modules/mailtrap-plugin/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  if (!id) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "A template identifier is required to send a Mailtrap test email."
    )
  }

  const pluginService: MailtrapPluginService = req.scope.resolve(MAILTRAP_PLUGIN)

  const body = req.body as {
    to?: string | string[]
    variables?: Record<string, unknown>
    fromEmail?: string
    fromName?: string
  }

  const to = Array.isArray(body?.to)
    ? body?.to
    : typeof body?.to === "string"
      ? body?.to.split(",")
      : undefined

  await pluginService.sendTestEmail(id, {
    to: to?.map(entry => entry.trim()).filter(entry => entry.length > 0),
    variables: body?.variables,
    fromEmail: body?.fromEmail,
    fromName: body?.fromName
  })

  res.json({ sent: true })
}
