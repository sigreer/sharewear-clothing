import { Migration } from '@mikro-orm/migrations';

export class Migration20251004153500 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "render_job" ("id" text not null, "product_id" text not null, "variant_id" text null, "status" text check ("status" in ('pending', 'compositing', 'rendering', 'completed', 'failed')) not null default 'pending', "design_file_url" text not null, "composited_file_url" text null, "rendered_image_url" text null, "animation_url" text null, "preset" text check ("preset" in ('chest-large', 'dead-center-medium', 'back-small')) not null, "template_id" text null, "error_message" text null, "started_at" timestamptz null, "completed_at" timestamptz null, "metadata" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "render_job_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_render_job_deleted_at" ON "render_job" (deleted_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "render_job" cascade;`);
  }

}
