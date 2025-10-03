import { Migration } from '@mikro-orm/migrations';

export class Migration20251002183200 extends Migration {

  override async up(): Promise<void> {
    // Make legacy 'layout' field nullable to allow new menu_layout field to be primary
    this.addSql(`alter table if exists "mega_menu_config" alter column "layout" drop not null, alter column "layout" drop default;`);
  }

  override async down(): Promise<void> {
    // Restore old constraint (default value)
    this.addSql(`alter table if exists "mega_menu_config" alter column "layout" set not null, alter column "layout" set default 'default';`);
  }

}
