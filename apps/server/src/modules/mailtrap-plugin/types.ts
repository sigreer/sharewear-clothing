export type MailtrapPluginOptions = {
  /**
   * Override the Mailtrap API token. Defaults to MAILTRAP_API_TOKEN env var.
   */
  token?: string
  /**
   * Mailtrap account identifier required for listing templates.
   * Defaults to MAILTRAP_ACCOUNT_ID env var.
   */
  accountId?: number
  /**
   * Optional Mailtrap sandbox inbox identifier.
   * Defaults to MAILTRAP_TEST_INBOX_ID env var.
   */
  testInboxId?: number
  /**
   * Toggle sandbox mode. Defaults to MAILTRAP_USE_SANDBOX env var.
   */
  sandbox?: boolean
  /**
   * Optional flag to enable caching Mailtrap templates locally.
   */
  cacheTemplates?: boolean
  /**
   * Default sender email to apply when Mailtrap templates are triggered.
   */
  senderEmail?: string
  /**
   * Default sender name to apply when Mailtrap templates are triggered.
   */
  senderName?: string
  /**
   * Default recipients for notifications when none are provided explicitly.
   * Accepts a comma-separated string or array when supplied via environment variables.
   */
  defaultRecipients?: string | string[]
}

export type MailtrapTemplateMappingUpsertDTO = {
  notification_handle: string
  template_id: string
  template_name?: string | null
  template_description?: string | null
  template_edit_url?: string | null
  enabled?: boolean
}

export type MailtrapTemplateSummary = {
  id: string
  uuid?: string
  numeric_id?: string
  name: string
  updated_at?: string
  description?: string
  edit_url?: string
}

export type MailtrapTemplateDetail = {
  id: string
  uuid?: string
  numeric_id?: string
  name: string
  subject?: string
  html?: string
  text?: string
  created_at?: string
  updated_at?: string
  description?: string
}

export type MailtrapSendTestEmailDTO = {
  to?: string[]
  variables?: Record<string, unknown>
  subject?: string
  fromEmail?: string
  fromName?: string
}
