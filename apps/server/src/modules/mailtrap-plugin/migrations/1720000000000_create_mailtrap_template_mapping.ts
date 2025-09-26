import { Migration } from "@mikro-orm/migrations"

export class Migration1720000000000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'create table "mailtrap_template_mapping" (' +
        '"id" text not null,' +
        '"notification_handle" text not null,' +
        '"template_id" text not null,' +
        '"template_name" text null,' +
        '"template_description" text null,' +
        '"template_edit_url" text null,' +
        '"enabled" boolean not null default true,' +
        '"created_at" timestamptz not null,' +
        '"updated_at" timestamptz not null,' +
        '"last_synced_at" timestamptz null,' +
        'constraint "mailtrap_template_mapping_pkey" primary key ("id")' +
      ');'
    )

    this.addSql(
      'create unique index "mailtrap_template_mapping_notification_handle_unique" on "mailtrap_template_mapping" ("notification_handle");'
    )
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "mailtrap_template_mapping";')
  }
}
