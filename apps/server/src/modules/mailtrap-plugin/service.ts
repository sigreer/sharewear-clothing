import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import { InferEntityType, Logger } from "@medusajs/framework/types"
import { MailtrapClient } from "mailtrap"
import MailtrapTemplateMapping from "./models/mailtrap-template-mapping"
import {
  MailtrapPluginOptions,
  MailtrapTemplateMappingUpsertDTO,
  MailtrapTemplateSummary,
  MailtrapTemplateDetail,
  MailtrapSendTestEmailDTO
} from "./types"

export const MAILTRAP_PLUGIN = "mailtrap_plugin"

type InjectedDependencies = {
  logger: Logger
}

type NormalizedOptions = Omit<MailtrapPluginOptions, "sandbox"> & {
  token: string
  senderEmail?: string
  senderName?: string
  sandbox: boolean
  defaultRecipients: string[]
}

type MailtrapTemplateMappingEntity = InferEntityType<typeof MailtrapTemplateMapping>

class MailtrapPluginService extends MedusaService({
  MailtrapTemplateMapping
}) {
  protected static activeInstance_: MailtrapPluginService | null = null
  protected readonly logger_: Logger
  protected readonly options_: NormalizedOptions
  protected mailtrapClient_: MailtrapClient

  constructor(dependencies: InjectedDependencies, options: MailtrapPluginOptions = {}) {
    super(dependencies)

    this.logger_ = dependencies.logger
    this.options_ = this.normalizeOptions(options)

    if (!this.options_.token) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Missing Mailtrap API token. Set MAILTRAP_API_TOKEN or pass it in the module options."
      )
    }

    this.mailtrapClient_ = this.buildMailtrapClient(this.options_)

    const maskedToken = this.maskSecret(this.options_.token)
    this.logger_.info(
      `Mailtrap plugin initialized (accountId=${this.options_.accountId ?? "undefined"}, sandbox=${this.options_.sandbox}, testInboxId=${this.options_.testInboxId ?? "undefined"}, token=${maskedToken})`
    )

    MailtrapPluginService.activeInstance_ = this
  }

  static getActiveInstance(): MailtrapPluginService | null {
    return this.activeInstance_
  }

  protected normalizeOptions(options: MailtrapPluginOptions): NormalizedOptions {
    const parseMaybeNumber = (value?: number | string) => {
      if (typeof value === "number") {
        return Number.isNaN(value) ? undefined : value
      }

      if (typeof value === "string" && value.trim().length) {
        const parsed = Number(value)
        return Number.isNaN(parsed) ? undefined : parsed
      }

      return undefined
    }

    const normalizeRecipients = (value?: string | string[] | null): string[] => {
      if (!value) {
        return []
      }

      const values = Array.isArray(value) ? value : String(value).split(",")

      return values
        .map(entry => entry.trim())
        .filter(entry => entry.length > 0)
    }

    const token = options.token ?? process.env.MAILTRAP_API_TOKEN

    const senderEmail = options.senderEmail ?? process.env.MAILTRAP_SENDER_EMAIL ?? undefined
    const senderName = options.senderName ?? process.env.MAILTRAP_SENDER_NAME ?? undefined

    const sandboxEnv = process.env.MAILTRAP_USE_SANDBOX
    const sandbox = options.sandbox ?? (sandboxEnv ? sandboxEnv === "true" : false)

    const testInboxId =
      options.testInboxId ?? parseMaybeNumber(process.env.MAILTRAP_TEST_INBOX_ID)

    const accountId =
      options.accountId ?? parseMaybeNumber(process.env.MAILTRAP_ACCOUNT_ID)

    const defaultRecipients = normalizeRecipients(
      options.defaultRecipients ?? process.env.MAILTRAP_DEFAULT_RECIPIENTS ?? undefined
    )

    if (sandbox && !testInboxId) {
      this.logger_.warn(
        "Mailtrap sandbox mode is enabled but MAILTRAP_TEST_INBOX_ID is not set. Sandbox send calls will fail until a test inbox is provided."
      )
    }

    return {
      token: token ?? "",
      accountId,
      testInboxId,
      sandbox,
      cacheTemplates: options.cacheTemplates,
      senderEmail,
      senderName,
      defaultRecipients
    }
  }

  protected buildMailtrapClient(options: NormalizedOptions): MailtrapClient {
    return new MailtrapClient({
      token: options.token,
      accountId: options.accountId,
      testInboxId: options.sandbox ? options.testInboxId : undefined,
      sandbox: options.sandbox
    })
  }

  protected ensureAccountConfigured(): void {
    if (!this.options_.accountId) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Missing Mailtrap account ID. Set MAILTRAP_ACCOUNT_ID in your environment or pass it in the module options."
      )
    }
  }

  async listTemplateMappings(): Promise<MailtrapTemplateMappingEntity[]> {
    return await this.listMailtrapTemplateMappings()
  }

  async getTemplateMappingByHandle(
    notificationHandle: string
  ): Promise<MailtrapTemplateMappingEntity | null> {
    const [mapping] = await this.listMailtrapTemplateMappings(
      {
        notification_handle: notificationHandle,
        enabled: true
      },
      {
        take: 1
      }
    )

    return mapping ?? null
  }

  async upsertTemplateMapping(
    data: MailtrapTemplateMappingUpsertDTO
  ): Promise<MailtrapTemplateMappingEntity> {
    const now = new Date()

    const [existing] = await this.listMailtrapTemplateMappings(
      {
        notification_handle: data.notification_handle
      },
      {
        take: 1
      }
    )

    const payload = {
      ...data,
      enabled: data.enabled ?? true,
      last_synced_at: now
    }

    if (existing) {
      return await this.updateMailtrapTemplateMappings({
        id: existing.id,
        ...payload
      })
    }

    return await this.createMailtrapTemplateMappings({
      ...payload
    })
  }

  async deleteTemplateMapping(id: string): Promise<void> {
    await this.deleteMailtrapTemplateMappings(id)
  }

  async listMailtrapTemplates(): Promise<MailtrapTemplateSummary[]> {
    this.ensureAccountConfigured()

    try {
      const response: any = await this.mailtrapClient_.templates.getList()

      const templatesArray = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.email_templates)
          ? response.email_templates
          : Array.isArray(response)
            ? response
            : []

      return templatesArray.map((template: any) => {
        const templateUuid =
          template?.uuid ??
          template?.template_uuid ??
          template?.email_template?.uuid ??
          template?.email_template?.template_uuid ??
          null

        const numericId =
          template?.id ?? template?.email_template?.id ?? null

        const name = template?.name ?? template?.email_template?.name ?? "Unnamed Template"
        const description = template?.description ?? template?.email_template?.description ?? null
        const editUrl = template?.edit_url ?? template?.email_template?.edit_url ?? null
        const updatedAt = template?.updated_at ?? template?.email_template?.updated_at ?? null

        const identifier = templateUuid ?? numericId ?? template?.id ?? template?.uuid

        return {
          id: identifier ? String(identifier) : "",
          uuid: templateUuid ?? undefined,
          numeric_id: numericId !== null && numericId !== undefined ? String(numericId) : undefined,
          name,
          description: description ?? undefined,
          edit_url: editUrl ?? undefined,
          updated_at: updatedAt ?? undefined
        }
      })
    } catch (error) {
      return this.handleMailtrapError(error, "retrieve templates")
    }
  }

  async getDefaultSender() {
    return {
      email: this.options_.senderEmail,
      name: this.options_.senderName
    }
  }

  getDefaultRecipients(): string[] {
    return [...this.options_.defaultRecipients]
  }

  async getMailtrapTemplateDetail(identifier: string): Promise<MailtrapTemplateDetail> {
    this.ensureAccountConfigured()

    const attemptNumericId = Number(identifier)

    try {
      if (!Number.isNaN(attemptNumericId) && attemptNumericId > 0) {
        const template = await this.mailtrapClient_.templates.get(attemptNumericId)
        return this.normalizeTemplateDetail(template)
      }

      const templates = await this.listMailtrapTemplates()
      const match = templates.find(template => {
        if (!identifier) {
          return false
        }

        if (template.uuid && template.uuid === identifier) {
          return true
        }

        return template.id === identifier
      })

      if (!match?.numeric_id) {
        throw new MedusaError(
          MedusaError.Types.NOT_FOUND,
          `Unable to locate Mailtrap template with identifier ${identifier}.`
        )
      }

      const template = await this.mailtrapClient_.templates.get(Number(match.numeric_id))
      return this.normalizeTemplateDetail(template)
    } catch (error) {
      return this.handleMailtrapError(error, "load template details")
    }
  }

  async sendTestEmail(
    templateIdentifier: string,
    data: MailtrapSendTestEmailDTO = {}
  ): Promise<void> {
    const recipients = data.to?.filter(recipient => recipient.trim().length) ?? this.getDefaultRecipients()

    if (!recipients.length) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "At least one recipient email must be provided to send a Mailtrap test email."
      )
    }

    const fromEmail = data.fromEmail ?? this.options_.senderEmail

    if (!fromEmail) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Mailtrap test email requires a sender email. Configure MAILTRAP_SENDER_EMAIL or pass fromEmail."
      )
    }

    let templateUuid = templateIdentifier

    if (!this.looksLikeUuid(templateUuid)) {
      const detail = await this.getMailtrapTemplateDetail(templateIdentifier)
      templateUuid = detail.uuid ?? detail.id
    }

    if (!templateUuid) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Unable to determine template UUID for identifier ${templateIdentifier}.`
      )
    }

    const payload = {
      from: {
        email: fromEmail,
        name: data.fromName ?? this.options_.senderName
      },
      to: recipients.map(email => ({ email })),
      template_uuid: templateUuid,
      template_variables: data.variables ?? {}
    }

    try {
      await this.mailtrapClient_.send(payload as any)
    } catch (error) {
      this.handleMailtrapError(error, "send test email")
    }
  }

  protected looksLikeUuid(value: string): boolean {
    return /^[0-9a-fA-F-]{10,}$/.test(value)
  }

  protected normalizeTemplateDetail(template: any): MailtrapTemplateDetail {
    const uuid = template?.uuid ?? template?.template_uuid ?? null
    const numericId = template?.id ?? null

    const identifier = uuid ?? numericId

    if (identifier === null || identifier === undefined) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Mailtrap returned a template without an identifier."
      )
    }

    return {
      id: String(identifier),
      uuid: uuid ?? undefined,
      numeric_id: numericId !== null && numericId !== undefined ? String(numericId) : undefined,
      name: template?.name ?? "Unnamed template",
      subject: template?.subject ?? undefined,
      html: template?.body_html ?? undefined,
      text: template?.body_text ?? undefined,
      created_at: template?.created_at ?? undefined,
      updated_at: template?.updated_at ?? undefined,
      description: template?.description ?? undefined
    }
  }

  protected handleMailtrapError(error: unknown, action: string): never {
    const defaultMessage = `Unable to ${action} from Mailtrap.`

    if (error && typeof error === "object") {
      const errorRecord = error as Record<string, any>
      const response = errorRecord.response as Record<string, any> | undefined
      const status = (errorRecord.status ?? response?.status) as number | undefined
      const responseData = response?.data as Record<string, any> | undefined

      const detailFromData = (() => {
        if (!responseData || typeof responseData !== "object") {
          return null
        }

        if (typeof responseData.message === "string") {
          return responseData.message
        }

        if (typeof responseData.error === "string") {
          return responseData.error
        }

        if (
          responseData.error &&
          typeof responseData.error === "object" &&
          typeof (responseData.error as Record<string, any>).message === "string"
        ) {
          return (responseData.error as Record<string, any>).message as string
        }

        return null
      })()

      const fallbackMessage = error instanceof Error ? error.message : null

      let message = defaultMessage

      if (status) {
        message += ` Mailtrap responded with status ${status}.`
      }

      if (detailFromData) {
        message += ` ${detailFromData}`
      } else if (fallbackMessage) {
        message += ` ${fallbackMessage}`
      }

      if (status === 401 || status === 403) {
        const accountHint = this.options_.accountId ? ` ${this.options_.accountId}` : ""
        message +=
          ` Verify that MAILTRAP_API_TOKEN has access to the Mailtrap account${accountHint}.`
      }

      this.logger_.error(
        `Mailtrap API error while attempting to ${action}: ${JSON.stringify({
          status,
          detail: detailFromData ?? fallbackMessage ?? null,
          accountId: this.options_.accountId,
          sandbox: this.options_.sandbox,
          testInboxId: this.options_.testInboxId,
          token: this.maskSecret(this.options_.token),
          responseData
        })}`
      )

      const errorType = status === 401 || status === 403
        ? MedusaError.Types.UNAUTHORIZED
        : MedusaError.Types.UNEXPECTED_STATE

      throw new MedusaError(errorType, message)
    }

    throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, defaultMessage)
  }

  protected maskSecret(secret?: string | number | null): string {
    if (secret === undefined || secret === null) {
      return "undefined"
    }

    const normalized = String(secret)

    if (normalized.length <= 4) {
      return `${normalized.charAt(0)}***`
    }

    const prefix = normalized.slice(0, 4)
    const suffix = normalized.slice(-4)

    return `${prefix}***${suffix}`
  }
}

export default MailtrapPluginService
