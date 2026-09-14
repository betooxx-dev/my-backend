import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('api_keys')
@Index('IDX_api_keys_active_name', ['name'], {
  unique: true,
  where: '"revokedAt" IS NULL',
})
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Index({ unique: true })
  @Column({ length: 64 })
  hash: string;

  @Column({ length: 20 })
  displayPrefix: string;

  @Column('simple-array', { default: '' })
  scopes: string[];

  @Column({ default: true })
  active: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastUsedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
