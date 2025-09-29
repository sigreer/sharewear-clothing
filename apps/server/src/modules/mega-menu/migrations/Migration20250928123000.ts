import { Migration } from '@mikro-orm/migrations';

export class Migration20250928123000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "mega_menu_config" ("id" text not null, "category_id" text not null, "layout" text check ("layout" in ('default', 'thumbnail-grid')) not null default 'default', "tagline" text null, "columns" jsonb null, "featured" jsonb null, "submenu_category_ids" jsonb null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "mega_menu_config_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_mega_menu_config_category_id_unique" ON "mega_menu_config" (category_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_mega_menu_config_deleted_at" ON "mega_menu_config" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "mega_menu_config" cascade;`);
  }

}
