import { Migration } from '@mikro-orm/migrations';

export class Migration20251015124141 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "render_job" drop constraint if exists "render_job_preset_check";`);

    this.addSql(`alter table if exists "render_job" add constraint "render_job_preset_check" check("preset" in ('chest-small', 'chest-medium', 'chest-large', 'back-small', 'back-medium', 'back-large', 'back-bottom-small', 'back-bottom-medium', 'back-bottom-large'));`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "render_job" drop constraint if exists "render_job_preset_check";`);

    this.addSql(`alter table if exists "render_job" add constraint "render_job_preset_check" check("preset" in ('chest-large', 'dead-center-medium', 'back-small'));`);
  }

}
