import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import { MailtrapNotificationProviderService } from "./services/mailtrap-notification-provider"

export default ModuleProvider(Modules.NOTIFICATION, {
  services: [MailtrapNotificationProviderService]
})

export * from "./services/mailtrap-notification-provider"
