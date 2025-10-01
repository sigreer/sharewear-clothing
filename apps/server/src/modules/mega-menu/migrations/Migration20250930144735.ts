import { Migration } from '@mikro-orm/migrations';

export class Migration20250930144735 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "mega_menu_config" add column if not exists "display_mode" text check ("display_mode" in ('simple-dropdown', 'columns')) null, add column if not exists "column_layout" text check ("column_layout" in ('image', 'image-with-text', 'subcategory-icons', 'text-and-icons')) null, add column if not exists "column_image_url" text null, add column if not exists "column_image_source" text check ("column_image_source" in ('upload', 'product')) null, add column if not exists "column_badge" text check ("column_badge" in ('new', 'offers', 'free-shipping', 'featured')) null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "mega_menu_config" drop column if exists "display_mode", drop column if exists "column_layout", drop column if exists "column_image_url", drop column if exists "column_image_source", drop column if exists "column_badge";`);
  }

}
