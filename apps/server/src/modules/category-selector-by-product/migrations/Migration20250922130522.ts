import { Migration } from '@mikro-orm/migrations';

export class Migration20250922130522 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "category_selector_by_product_config" drop constraint if exists "category_selector_by_product_config_category_id_unique";`);
    this.addSql(`create table if not exists "category_selector_by_product_config" ("id" text not null, "category_id" text not null, "mode" text check ("mode" in ('custom_image', 'product_image', 'random_product')) not null default 'random_product', "custom_image_url" text null, "selected_product_id" text null, "selected_product_image_id" text null, "random_product_ids" jsonb null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "category_selector_by_product_config_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_category_selector_by_product_config_category_id_unique" ON "category_selector_by_product_config" (category_id) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_category_selector_by_product_config_deleted_at" ON "category_selector_by_product_config" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "category_selector_by_product_config" cascade;`);
  }

}
