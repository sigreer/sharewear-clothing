import { Migration } from '@mikro-orm/migrations';

export class Migration20251002162212 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "mega_menu_config" add column if not exists "default_menu_layout" text check ("default_menu_layout" in ('no-menu', 'simple-dropdown', 'rich-columns')) null, add column if not exists "menu_layout" text check ("menu_layout" in ('no-menu', 'simple-dropdown', 'rich-columns')) null, add column if not exists "display_as_column" boolean null, add column if not exists "column_title" text null, add column if not exists "column_description" text null, add column if not exists "icon" text null, add column if not exists "thumbnail_url" text null, add column if not exists "title" text null, add column if not exists "subtitle" text null, add column if not exists "excluded_from_menu" boolean not null default false;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "mega_menu_config" drop column if exists "default_menu_layout", drop column if exists "menu_layout", drop column if exists "display_as_column", drop column if exists "column_title", drop column if exists "column_description", drop column if exists "icon", drop column if exists "thumbnail_url", drop column if exists "title", drop column if exists "subtitle", drop column if exists "excluded_from_menu";`);
  }

}
