import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('blog_assets')
export class BlogAsset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 255 })
  storageKey: string;

  @Column({ length: 120 })
  originalName: string;

  @Column({ length: 40 })
  mimeType: string;

  @Column({ type: 'integer' })
  sizeBytes: number;

  @Column({ type: 'integer' })
  width: number;

  @Column({ type: 'integer' })
  height: number;

  @Column({ length: 64 })
  sha256: string;

  @Column({ length: 300 })
  altText: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
