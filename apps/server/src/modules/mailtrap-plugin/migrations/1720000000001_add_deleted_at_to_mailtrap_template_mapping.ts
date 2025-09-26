import { Migration } from "@mikro-orm/migrations"

export class Migration1720000000001 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'alter table "mailtrap_template_mapping" add column "deleted_at" timestamptz null;'
    )
  }

  async down(): Promise<void> {
    this.addSql(
      'alter table "mailtrap_template_mapping" drop column "deleted_at";'
    )
  }
}
