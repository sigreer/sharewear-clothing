import { Module, Modules } from "@medusajs/framework/utils"
import MailtrapPluginService, { MAILTRAP_PLUGIN } from "./service"
import registerMailtrapDispatcher from "./loaders/register-mailtrap-dispatcher"

export * from "./types"
export { MAILTRAP_PLUGIN }

const moduleDefinition = Module(MAILTRAP_PLUGIN, {
  service: MailtrapPluginService,
  loaders: [registerMailtrapDispatcher]
})

export default {
  ...moduleDefinition,
  dependencies: [Modules.NOTIFICATION, Modules.EVENT_BUS, Modules.PRODUCT]
}
