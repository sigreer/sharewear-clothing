import { Migration } from '@mikro-orm/migrations';

export class Migration20251004001248 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "mega_menu_config" add column if not exists "selected_thumbnail_product_id" text null, add column if not exists "selected_thumbnail_image_id" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "mega_menu_config" drop column if exists "selected_thumbnail_product_id", drop column if exists "selected_thumbnail_image_id";`);
  }

}
