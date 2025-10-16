import { Migration } from '@mikro-orm/migrations';

export class Migration20251015170937 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "render_job" alter column "design_file_url" type text using ("design_file_url"::text);`);
    this.addSql(`alter table if exists "render_job" alter column "design_file_url" drop not null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "render_job" alter column "design_file_url" type text using ("design_file_url"::text);`);
    this.addSql(`alter table if exists "render_job" alter column "design_file_url" set not null;`);
  }

}
