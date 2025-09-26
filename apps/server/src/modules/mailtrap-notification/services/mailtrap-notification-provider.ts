import {
  AbstractNotificationProviderService,
  MedusaError
} from "@medusajs/framework/utils"
import { Logger } from "@medusajs/framework/types"
import { NotificationTypes } from "@medusajs/types"
import { MailtrapClient } from "mailtrap"
import MailtrapPluginService, {
  MAILTRAP_PLUGIN
} from "../../mailtrap-plugin/service"

export interface MailtrapNotificationProviderOptions {
  token: string
  sender_email: string
  sender_name?: string
  sandbox?: boolean | string
  test_inbox_id?: number | string
  channels?: string[]
}

type InjectedDependencies = {
  logger: Logger
  [MAILTRAP_PLUGIN]?: MailtrapPluginService
  mailtrapPluginService?: MailtrapPluginService
  mailtrapPlugin?: MailtrapPluginService
}

type MailtrapSendData = {
  subject?: string
  html?: string
  text?: string
  template_uuid?: string
  template_variables?: Record<string, unknown>
  from?: {
    email: string
    name?: string
  }
  to?: (string | MailtrapRecipient)[]
  cc?: (string | MailtrapRecipient)[]
  bcc?: (string | MailtrapRecipient)[]
  reply_to?: MailtrapRecipient
  attachments?: Array<{
    filename: string
    type?: string
    content: string
    disposition?: string
    content_id?: string
  }>
}

type MailtrapRecipient = {
  email: string
  name?: string
}

type MailtrapSendPayload = {
  from: MailtrapRecipient
  to: MailtrapRecipient[]
  cc?: MailtrapRecipient[]
  bcc?: MailtrapRecipient[]
  reply_to?: MailtrapRecipient
  subject?: string
  html?: string
  text?: string
  template_uuid?: string
  template_variables?: Record<string, unknown>
  attachments?: Array<{
    filename: string
    type?: string
    content: string
    disposition?: string
    content_id?: string
  }>
}

const toRecipient = (
  recipient: string | MailtrapRecipient
): MailtrapRecipient => {
  if (typeof recipient === "string") {
    return { email: recipient }
  }

  return recipient
}

const normalizeRecipientList = (
  recipients: (string | MailtrapRecipient)[] | undefined
): MailtrapRecipient[] => {
  if (!recipients?.length) {
    return []
  }

  return recipients
    .map(recipient => toRecipient(recipient))
    .filter(recipient => !!recipient.email)
}

const looksLikeUuid = (value: string): boolean => /^[0-9a-fA-F-]{10,}$/.test(value)

export class MailtrapNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "mailtrap-notification"

  static validateOptions(options: MailtrapNotificationProviderOptions) {
    if (!options?.token) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Mailtrap API token is required in the provider options."
      )
    }

    if (!options?.sender_email) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "A default sender email must be provided in the Mailtrap provider options."
      )
    }
  }

  protected readonly logger_: Logger
  protected readonly options_: MailtrapNotificationProviderOptions
  protected readonly mailtrapClient_: MailtrapClient
  protected readonly pluginService_?: MailtrapPluginService

  constructor(
    dependencies: InjectedDependencies,
    options: MailtrapNotificationProviderOptions
  ) {
    super()

    const { channels: _channels, ...providerOptions } = options

    MailtrapNotificationProviderService.validateOptions(providerOptions)

    this.logger_ = dependencies.logger
    const sandbox =
      typeof providerOptions.sandbox === "string"
        ? providerOptions.sandbox === "true"
        : !!providerOptions.sandbox

    const testInboxId =
      typeof providerOptions.test_inbox_id === "string"
        ? Number(providerOptions.test_inbox_id)
        : providerOptions.test_inbox_id

    this.options_ = {
      ...providerOptions,
      sandbox,
      test_inbox_id: testInboxId
    }

    this.mailtrapClient_ = new MailtrapClient({
      token: this.options_.token,
      sandbox: !!this.options_.sandbox,
      testInboxId: this.options_.sandbox
        ? typeof this.options_.test_inbox_id === "number"
          ? this.options_.test_inbox_id
          : undefined
        : undefined
    })

    const safeResolve = <T>(key: string): T | undefined => {
      try {
        return (dependencies as Record<string, unknown>)[key] as T | undefined
      } catch (error) {
        if (error instanceof Error && error.name === "AwilixResolutionError") {
          this.logger_.debug?.(
            `mailtrap-notification: dependency ${key} could not be resolved during provider construction`
          )
          return undefined
        }

        throw error
      }
    }

    this.pluginService_ =
      safeResolve<MailtrapPluginService>(MAILTRAP_PLUGIN) ??
      safeResolve<MailtrapPluginService>("mailtrapPluginService") ??
      safeResolve<MailtrapPluginService>("mailtrapPlugin") ??
      MailtrapPluginService.getActiveInstance() ??
      undefined

    if (process.env.NODE_ENV === "development") {
      const dependencyKeys = Object.keys(dependencies)
      this.logger_.debug?.(
        `mailtrap-notification: provider dependencies resolved (keys=${dependencyKeys.join(", ")})`
      )
    }

    if (!this.pluginService_) {
      this.logger_.warn("Mailtrap plugin service was not found in the container. Template mappings from the plugin will be ignored.")
    }
  }

  protected async buildSendPayload(
    notification: NotificationTypes.ProviderSendNotificationDTO
  ): Promise<MailtrapSendPayload> {
    const extra = (notification.data ?? {}) as MailtrapSendData

    const recipients = normalizeRecipientList(
      extra.to ?? (notification.to ? [notification.to] : [])
    )

    if (!recipients.length) {
      const defaultRecipients = this.pluginService_?.getDefaultRecipients()
      if (defaultRecipients?.length) {
        defaultRecipients.forEach(recipient => {
          const normalized = toRecipient(recipient)
          if (normalized.email) {
            recipients.push(normalized)
          }
        })
      }
    }

    if (!recipients.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Mailtrap provider requires at least one recipient email."
      )
    }

    const cc = normalizeRecipientList(extra.cc)
    const bcc = normalizeRecipientList(extra.bcc)

    const subject = notification.content?.subject ?? extra.subject

    let html = notification.content?.html ?? extra.html
    let text = notification.content?.text ?? extra.text

    let templateUuid = extra.template_uuid
    let templateVariables = extra.template_variables ?? {}

    if (!templateUuid && this.pluginService_) {
      const mapping = await this.pluginService_.getTemplateMappingByHandle(
        notification.template
      )

      if (mapping?.template_id && mapping.enabled) {
        templateUuid = mapping.template_id
        templateVariables = {
          ...templateVariables,
          ...(mapping.template_name ? { template_name: mapping.template_name } : {}),
        }

        if (templateUuid && !looksLikeUuid(templateUuid)) {
          try {
            const detail = await this.pluginService_?.getMailtrapTemplateDetail(
              mapping.template_id
            )

            if (detail?.uuid) {
              templateUuid = detail.uuid
            }
          } catch (error) {
            this.logger_.warn(
              `Mailtrap provider could not resolve UUID for template ${mapping.template_id}: ${
                error instanceof Error ? error.message : "unknown error"
              }`
            )
          }
        }
      }
    }

    if (!templateUuid && !html && !text) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Mailtrap notification requires either template mapping, HTML, or text content."
      )
    }

    if (!templateUuid && !subject) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "A subject is required when sending Mailtrap notifications without a template."
      )
    }

    const defaultSender = await this.pluginService_?.getDefaultSender()
    const fromOverride = extra.from

    const fromEmail =
      fromOverride?.email ??
      notification.from ??
      defaultSender?.email ??
      this.options_.sender_email

    if (!fromEmail) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Unable to determine sender email for Mailtrap notification."
      )
    }

    const payload: MailtrapSendPayload = {
      from: {
        email: fromEmail,
        name:
          fromOverride?.name ??
          defaultSender?.name ??
          this.options_.sender_name
      },
      to: recipients,
      cc: cc.length ? cc : undefined,
      bcc: bcc.length ? bcc : undefined,
      reply_to: extra.reply_to ? toRecipient(extra.reply_to) : undefined,
      subject
    }

    if (templateUuid) {
      payload.template_uuid = templateUuid
      if (templateVariables && Object.keys(templateVariables).length) {
        payload.template_variables = templateVariables
      }
    } else {
      payload.html = html ?? undefined
      payload.text = text ?? undefined
    }

    const attachmentsSource = extra.attachments ?? notification.attachments ?? undefined

    if (attachmentsSource && attachmentsSource.length) {
      payload.attachments = attachmentsSource.map(attachment => ({
        filename: attachment.filename,
        type: (attachment as any).type ?? attachment.content_type,
        content: attachment.content,
        disposition: attachment.disposition,
        content_id: attachment.content_id ?? attachment.id
      }))
    }

    return payload
  }

  async send(
    notification: NotificationTypes.ProviderSendNotificationDTO
  ): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
    const notificationId = (notification as { id?: string }).id ?? notification.template
    const payload = await this.buildSendPayload(notification)

    try {
      const response = await this.mailtrapClient_.send(payload as any)

      const messageIds =
        Array.isArray(response?.message_ids) && response.message_ids.length
          ? response.message_ids
          : []

      const logDetails = {
        notification: notificationId,
        recipients: payload.to.map(recipient => recipient.email),
        template_uuid: payload.template_uuid,
        message_ids: messageIds
      }
      const logMessage = `Mailtrap notification sent: ${notificationId}`
      this.logger_.info(`${logMessage} ${JSON.stringify(logDetails)}`)

      const sentId = messageIds.length ? messageIds[0] : undefined

      return {
        id: sentId
      }
    } catch (error) {
      const errorDetails = {
        notification: notificationId,
        error: error?.message,
        stack: error?.stack
      }
      this.logger_.error(`Mailtrap notification failed: ${JSON.stringify(errorDetails)}`)

      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Mailtrap failed to send notification: ${error?.message || "unknown error"}`
      )
    }
  }

  async resend(
    notification: NotificationTypes.ProviderSendNotificationDTO
  ): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
    return this.send(notification)
  }
}

export default MailtrapNotificationProviderService
