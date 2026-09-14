import { DataSource } from 'typeorm';
import { envs } from '../../src/config';
import { CreateBlogCategories1788560000000 } from '../../src/migrations/1788560000000-CreateBlogCategories';

// Existing development databases were created with synchronize and do not
// have the initial production migration in their history. Apply only the new
// migration before starting the updated development API.
async function main() {
  if (envs.stage !== 'dev')
    throw new Error('This command is restricted to STAGE=dev');
  const db = new DataSource({
    type: 'postgres',
    host: envs.dbHost,
    port: envs.dbPort,
    username: envs.dbUser,
    password: envs.dbPassword,
    database: envs.dbName,
    migrations: [CreateBlogCategories1788560000000],
  });
  await db.initialize();
  try {
    const migrations = await db.runMigrations();
    console.log(`Category migrations applied: ${migrations.length}`);
  } finally {
    await db.destroy();
  }
}

void main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'Category migration failed',
  );
  process.exitCode = 1;
});
