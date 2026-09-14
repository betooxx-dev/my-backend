import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import { CreateBlogSchema1782520000000 } from '../src/migrations/1782520000000-CreateBlogSchema';
import { CreateBlogCategories1788560000000 } from '../src/migrations/1788560000000-CreateBlogCategories';

describe('Blog category migration on existing data', () => {
  let postgres: StartedPostgreSqlContainer;
  let db: DataSource;
  beforeAll(async () => {
    postgres = await new PostgreSqlContainer('postgres:14.3').start();
    db = await new DataSource({
      type: 'postgres',
      url: postgres.getConnectionUri(),
    }).initialize();
  });
  afterAll(async () => {
    await db?.destroy();
    await postgres?.stop();
  });

  it('backfills and deduplicates without losing posts, supports rename and rollback', async () => {
    const runner = db.createQueryRunner();
    await runner.connect();
    try {
      await new CreateBlogSchema1782520000000().up(runner);
      for (const [index, category] of [
        '  Tecnología ',
        'TECNOLOGIA',
        'Tecnología',
        '',
      ].entries()) {
        await runner.query(
          `INSERT INTO blog_posts (locale,slug,title,category) VALUES ('es',$1,$2,$3)`,
          [`legacy-${index}`, `Legacy ${index}`, category],
        );
      }
      const migration = new CreateBlogCategories1788560000000();
      await migration.up(runner);
      await migration.up(runner);
      const posts = (await runner.query(
        'SELECT title,category FROM blog_posts ORDER BY slug',
      )) as Array<{ title: string; category: string }>;
      expect(posts).toHaveLength(4);
      expect(new Set(posts.slice(0, 3).map((post) => post.category)).size).toBe(
        1,
      );
      expect(posts[3].category).toBe('General');
      expect(posts.map((post) => post.title)).toEqual([
        'Legacy 0',
        'Legacy 1',
        'Legacy 2',
        'Legacy 3',
      ]);
      await expect(
        runner.query('DELETE FROM blog_categories WHERE name=$1', [
          posts[0].category,
        ]),
      ).rejects.toThrow();
      await runner.query('UPDATE blog_categories SET name=$1 WHERE name=$2', [
        'Nuevo nombre',
        posts[0].category,
      ]);
      const updated = (await runner.query(
        'SELECT category FROM blog_posts WHERE slug=$1',
        ['legacy-0'],
      )) as Array<{ category: string }>;
      expect(updated[0].category).toBe('Nuevo nombre');
      await migration.down(runner);
      const remaining = (await runner.query(
        'SELECT count(*) AS count FROM blog_posts',
      )) as Array<{ count: string }>;
      expect(remaining[0].count).toBe('4');
    } finally {
      await runner.release();
    }
  });
});
