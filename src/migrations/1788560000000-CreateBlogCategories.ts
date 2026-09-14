import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBlogCategories1788560000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "blog_categories" (
      "name" varchar(80) PRIMARY KEY,
      "key" varchar(160) NOT NULL UNIQUE,
      "position" integer NOT NULL DEFAULT 0
    )`);
    const existing = (await queryRunner.query(
      `SELECT "name", "key" FROM "blog_categories"`,
    )) as Array<{ name: string; key: string }>;
    const rows = (await queryRunner.query(
      `SELECT DISTINCT "category" FROM "blog_posts" ORDER BY "category"`,
    )) as Array<{ category: string }>;
    const names = new Map(existing.map(({ key, name }) => [key, name]));
    for (const { category } of [...rows, { category: 'General' }]) {
      const name =
        category.normalize('NFKC').trim().replace(/\s+/gu, ' ') || 'General';
      const key =
        name
          .normalize('NFD')
          .replace(/\p{M}/gu, '')
          .toLowerCase()
          .replace(/[\s\p{P}]+/gu, '') || 'general';
      const canonical =
        names.get(key) ?? (key === 'general' ? 'General' : name);
      if (!names.has(key)) {
        await queryRunner.query(
          `INSERT INTO "blog_categories" ("name", "key") VALUES ($1, $2)
           ON CONFLICT ("key") DO NOTHING`,
          [canonical, key],
        );
        names.set(key, canonical);
      }
      await queryRunner.query(
        `UPDATE "blog_posts" SET "category" = $1 WHERE "category" = $2`,
        [canonical, category],
      );
    }
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_blog_posts_category'
            AND conrelid = 'blog_posts'::regclass
        ) THEN
          ALTER TABLE "blog_posts" ADD CONSTRAINT "FK_blog_posts_category"
            FOREIGN KEY ("category") REFERENCES "blog_categories"("name")
            ON UPDATE CASCADE ON DELETE RESTRICT;
        END IF;
      END $$;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "blog_posts" DROP CONSTRAINT IF EXISTS "FK_blog_posts_category"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "blog_categories"`);
  }
}
