import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActiveApiKeyNameIndex1789000000000 implements MigrationInterface {
  name = 'AddActiveApiKeyNameIndex1789000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_api_keys_active_name" ON "api_keys" ("name") WHERE "revokedAt" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_api_keys_active_name"`);
  }
}
