import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBlogSchema1782520000000 implements MigrationInterface {
  name = 'CreateBlogSchema1782520000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query(
      `CREATE TYPE "public"."blog_posts_locale_enum" AS ENUM('es', 'en')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."blog_posts_status_enum" AS ENUM('draft', 'published')`,
    );

    await queryRunner.query(`
      CREATE TABLE "api_keys" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(100) NOT NULL,
        "hash" character varying(64) NOT NULL,
        "displayPrefix" character varying(20) NOT NULL,
        "scopes" text NOT NULL DEFAULT '',
        "active" boolean NOT NULL DEFAULT true,
        "expiresAt" TIMESTAMP WITH TIME ZONE,
        "lastUsedAt" TIMESTAMP WITH TIME ZONE,
        "revokedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_api_keys_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_api_keys_hash" ON "api_keys" ("hash")`,
    );

    await queryRunner.query(`
      CREATE TABLE "blog_assets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "storageKey" character varying(255) NOT NULL,
        "originalName" character varying(120) NOT NULL,
        "mimeType" character varying(40) NOT NULL,
        "sizeBytes" integer NOT NULL,
        "width" integer NOT NULL,
        "height" integer NOT NULL,
        "sha256" character varying(64) NOT NULL,
        "altText" character varying(300) NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_blog_assets_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_blog_assets_storage_key" ON "blog_assets" ("storageKey")`,
    );

    await queryRunner.query(`
      CREATE TABLE "blog_posts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "slug" character varying(120) NOT NULL,
        "locale" "public"."blog_posts_locale_enum" NOT NULL,
        "title" character varying(180) NOT NULL,
        "excerpt" text NOT NULL DEFAULT '',
        "contentMarkdown" text NOT NULL DEFAULT '',
        "publishedAt" TIMESTAMP WITH TIME ZONE,
        "category" character varying(80) NOT NULL DEFAULT 'General',
        "tags" text array NOT NULL DEFAULT '{}',
        "coverAssetId" uuid,
        "featured" boolean NOT NULL DEFAULT false,
        "status" "public"."blog_posts_status_enum" NOT NULL DEFAULT 'draft',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_blog_posts_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_blog_posts_locale_slug" ON "blog_posts" ("locale", "slug")`,
    );
    await queryRunner.query(`
      ALTER TABLE "blog_posts"
      ADD CONSTRAINT "FK_blog_posts_cover_asset"
      FOREIGN KEY ("coverAssetId") REFERENCES "blog_assets"("id")
      ON DELETE RESTRICT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "blog_posts" DROP CONSTRAINT "FK_blog_posts_cover_asset"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_blog_posts_locale_slug"`);
    await queryRunner.query(`DROP TABLE "blog_posts"`);
    await queryRunner.query(`DROP INDEX "IDX_blog_assets_storage_key"`);
    await queryRunner.query(`DROP TABLE "blog_assets"`);
    await queryRunner.query(`DROP INDEX "IDX_api_keys_hash"`);
    await queryRunner.query(`DROP TABLE "api_keys"`);
    await queryRunner.query(`DROP TYPE "public"."blog_posts_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."blog_posts_locale_enum"`);
  }
}
