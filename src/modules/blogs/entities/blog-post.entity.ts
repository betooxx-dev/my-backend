import { BlogCategory } from '../categories/blog-category.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { BlogLocale, BlogPostStatus } from '../dto';
import { BlogAsset } from './blog-asset.entity';

@Entity('blog_posts')
@Index(['locale', 'slug'], { unique: true })
export class BlogPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  slug: string;

  @Column({ type: 'enum', enum: BlogLocale })
  locale: BlogLocale;

  @Column({ length: 180 })
  title: string;

  @Column({ type: 'text', default: '' })
  excerpt: string;

  @Column({ type: 'text', default: '' })
  contentMarkdown: string;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Column({ length: 80, default: 'General' })
  category: string;

  @ManyToOne(() => BlogCategory, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({
    name: 'category',
    referencedColumnName: 'name',
    foreignKeyConstraintName: 'FK_blog_posts_category',
  })
  categoryEntity: BlogCategory;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  tags: string[];

  @Column({ type: 'uuid', nullable: true })
  coverAssetId: string | null;

  @ManyToOne(() => BlogAsset, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'coverAssetId' })
  coverAsset?: BlogAsset | null;

  @Column({ default: false })
  featured: boolean;

  @Column({ type: 'enum', enum: BlogPostStatus, default: BlogPostStatus.DRAFT })
  status: BlogPostStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
