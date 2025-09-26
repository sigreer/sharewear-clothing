import { model } from "@medusajs/framework/utils"

const MailtrapTemplateMapping = model.define("mailtrap_template_mapping", {
  id: model.id().primaryKey(),
  notification_handle: model.text().unique(),
  template_id: model.text(),
  template_name: model.text().nullable(),
  template_description: model.text().nullable(),
  template_edit_url: model.text().nullable(),
  enabled: model.boolean().default(true),
  last_synced_at: model.dateTime().nullable()
})

export default MailtrapTemplateMapping
