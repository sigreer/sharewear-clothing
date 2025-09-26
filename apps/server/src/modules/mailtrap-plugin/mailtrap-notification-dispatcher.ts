import { Modules, ProductTagWorkflowEvents } from "@medusajs/framework/utils"
import type {
  Logger,
  IEventBusModuleService,
  NotificationTypes
} from "@medusajs/framework/types"
import type NotificationModuleService from "@medusajs/notification/dist/services/notification-module-service"
import type ProductModuleService from "@medusajs/product/dist/services/product-module-service"
import type MailtrapPluginService from "./service"
import { MAILTRAP_PLUGIN } from "./service"

export type MailtrapNotificationDispatcherDependencies = {
  logger: Logger
  mailtrapPluginService: MailtrapPluginService
  notificationModuleService: NotificationModuleService
  eventBusService: IEventBusModuleService
  productModuleService: ProductModuleService
}

type EventPayload = {
  data?: Record<string, any>
  metadata?: Record<string, any>
}

export class MailtrapNotificationDispatcher {
  protected readonly logger_: Logger
  protected readonly mailtrapPluginService_: MailtrapPluginService
  protected readonly notificationModuleService_: NotificationModuleService
  protected readonly eventBusService_: IEventBusModuleService
  protected readonly productModuleService_: ProductModuleService

  protected subscribedHandles_: Set<string> = new Set()

  constructor(dependencies: MailtrapNotificationDispatcherDependencies) {
    this.logger_ = dependencies.logger
    this.mailtrapPluginService_ = dependencies.mailtrapPluginService
    this.notificationModuleService_ = dependencies.notificationModuleService
    this.eventBusService_ = dependencies.eventBusService
    this.productModuleService_ = dependencies.productModuleService
  }

  async initialize(): Promise<void> {
    await this.refreshAllSubscriptions()
  }

  async refreshAllSubscriptions(): Promise<void> {
    const mappings = await this.mailtrapPluginService_.listTemplateMappings()
    const handles = mappings
      .filter(mapping => mapping.enabled !== false)
      .map(mapping => mapping.notification_handle)

    handles.forEach(handle => this.ensureSubscribed(handle))
  }

  async refreshSubscriptionForHandle(handle: string): Promise<void> {
    const mapping = await this.mailtrapPluginService_.getTemplateMappingByHandle(handle)
    if (!mapping || mapping.enabled === false) {
      return
    }

    this.ensureSubscribed(handle)
  }

  protected ensureSubscribed(handle: string): void {
    if (this.subscribedHandles_.has(handle)) {
      return
    }

    this.eventBusService_.subscribe(handle, async payload => {
      await this.handleEvent(handle, payload as EventPayload)
    })

    this.subscribedHandles_.add(handle)
    this.logger_.info(`Mailtrap dispatcher subscribed to event: ${handle}`)
  }

  protected async handleEvent(handle: string, payload: EventPayload): Promise<void> {
    try {
      const mapping = await this.mailtrapPluginService_.getTemplateMappingByHandle(handle)

      if (!mapping || mapping.enabled === false) {
        this.logger_.debug?.(
          `Mailtrap dispatcher ignoring event ${handle} because no enabled mapping was found.`
        )
        return
      }

      const recipients = await this.resolveRecipients(handle, payload)

      if (!recipients.length) {
        this.logger_.warn(
          `Mailtrap dispatcher could not resolve recipients for ${handle}. Event skipped.`
        )
        return
      }

      const templateVariables = await this.buildTemplateVariables(handle, payload)

      const notifications: NotificationTypes.CreateNotificationDTO[] = recipients.map(
        recipient => ({
          channel: "email",
          template: handle,
          to: recipient,
          idempotency_key: this.buildIdempotencyKey(handle, payload, recipient),
          data: {
            template_uuid: mapping.template_id,
            template_variables: templateVariables
          }
        })
      )

      await this.notificationModuleService_.createNotifications(notifications)
    } catch (error) {
      this.logger_.error?.(
        `Mailtrap dispatcher failed to process event ${handle}: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      )
    }
  }

  protected buildIdempotencyKey(
    handle: string,
    payload: EventPayload,
    recipient?: string
  ): string | undefined {
    const payloadId = payload?.data?.id ?? payload?.data?.entity_id
    if (!payloadId) {
      return undefined
    }

    const recipientKey = recipient ? `:${recipient}` : ""

    return `${handle}${recipientKey}:${payloadId}`
  }

  protected async resolveRecipients(handle: string, payload: EventPayload): Promise<string[]> {
    const dataRecipients = this.extractRecipientsFromPayload(payload)
    if (dataRecipients.length) {
      return dataRecipients
    }

    const defaultRecipients = await this.mailtrapPluginService_.getDefaultRecipients()
    if (defaultRecipients.length) {
      return defaultRecipients
    }

    const fallbackSender = await this.mailtrapPluginService_.getDefaultSender()
    if (fallbackSender?.email) {
      return [fallbackSender.email]
    }

    return []
  }

  protected extractRecipientsFromPayload(payload: EventPayload): string[] {
    const data = payload?.data
    if (!data) {
      return []
    }

    const to = data.to ?? data.email ?? data.recipient ?? data.recipients

    if (!to) {
      return []
    }

    if (Array.isArray(to)) {
      return to
        .map(entry => {
          if (!entry) {
            return null
          }

          if (typeof entry === "string") {
            return entry
          }

          if (typeof entry === "object" && typeof entry.email === "string") {
            return entry.email
          }

          return null
        })
        .filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
    }

    if (typeof to === "string") {
      return to.length ? [to] : []
    }

    if (typeof to === "object" && typeof to.email === "string") {
      return to.email.length ? [to.email] : []
    }

    return []
  }

  protected async buildTemplateVariables(
    handle: string,
    payload: EventPayload
  ): Promise<Record<string, unknown>> {
    const baseVariables: Record<string, unknown> = {
      event_name: handle,
      event_payload: payload?.data ?? null,
      event_metadata: payload?.metadata ?? null,
      triggered_at: new Date().toISOString()
    }

    if (this.isProductTagEvent(handle) && payload?.data?.id) {
      const tagDetail = await this.fetchProductTag(payload.data.id)

      return {
        ...baseVariables,
        product_tag: tagDetail ?? null
      }
    }

    return baseVariables
  }

  protected isProductTagEvent(handle: string): boolean {
    const productTagEvents = [
      ProductTagWorkflowEvents.CREATED,
      ProductTagWorkflowEvents.UPDATED,
      ProductTagWorkflowEvents.DELETED
    ]

    return productTagEvents.includes(handle)
  }

  protected async fetchProductTag(id: string): Promise<Record<string, unknown> | null> {
    try {
      const tags = await this.productModuleService_.listProductTags(
        { id: [id] },
        { relations: ["products"] }
      )

      const tag = tags[0]

      if (!tag) {
        return null
      }

      return { ...tag } as Record<string, unknown>
    } catch (error) {
      this.logger_.error?.(
        `Mailtrap dispatcher could not load product tag ${id}: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      )
      return null
    }
  }
}

export const MAILTRAP_NOTIFICATION_DISPATCHER = "mailtrapNotificationDispatcher"

export const tryBuildMailtrapNotificationDispatcher = (
  container: any
): MailtrapNotificationDispatcher | null => {
  const logger = resolveOptional<Logger>(container, "logger")
  const mailtrapPluginService = resolveMailtrapPluginService(container)
  const notificationModuleService = resolveOptional<NotificationModuleService>(
    container,
    Modules.NOTIFICATION
  )

  if (!notificationModuleService) {
    return null
  }

  const eventBusService = resolveOptional<IEventBusModuleService>(
    container,
    Modules.EVENT_BUS
  )

  if (!eventBusService) {
    throw new Error("Event bus module is not registered. Cannot initialize Mailtrap dispatcher.")
  }

  const productModuleService = resolveOptional<ProductModuleService>(
    container,
    Modules.PRODUCT
  )

  if (!productModuleService) {
    throw new Error("Product module is not registered. Cannot initialize Mailtrap dispatcher.")
  }

  return new MailtrapNotificationDispatcher({
    logger: logger ?? (console as unknown as Logger),
    mailtrapPluginService,
    notificationModuleService,
    eventBusService,
    productModuleService
  })
}

export const buildMailtrapNotificationDispatcher = (container: any) => {
  const dispatcher = tryBuildMailtrapNotificationDispatcher(container)

  if (!dispatcher) {
    throw new Error("Notification module service is not registered.")
  }

  return dispatcher
}

const resolveOptional = <T>(container: any, key: string): T | undefined => {
  if (!container || typeof container.resolve !== "function") {
    return undefined
  }

  try {
    return container.resolve(key, { allowUnregistered: true }) as T | undefined
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("allowUnregistered")) {
      try {
        return container.resolve(key) as T
      } catch (err) {
        if (err instanceof Error && err.message.includes(`Could not resolve '${key}'`)) {
          return undefined
        }

        throw err
      }
    }

    if (error instanceof Error && error.message.includes(`Could not resolve '${key}'`)) {
      return undefined
    }

    throw error
  }
}

const MAILTRAP_SERVICE_REGISTRATION_KEYS = [
  MAILTRAP_PLUGIN,
  "mailtrapPluginService",
  "mailtrapPlugin"
] as const

const resolveMailtrapPluginService = (container: any): MailtrapPluginService => {
  for (const key of MAILTRAP_SERVICE_REGISTRATION_KEYS) {
    const service = resolveOptional<MailtrapPluginService>(container, key)
    if (service) {
      return service
    }
  }

  throw new Error(
    `Mailtrap plugin service is not registered. Checked keys: ${MAILTRAP_SERVICE_REGISTRATION_KEYS.join(
      ", "
    )}`
  )
}
