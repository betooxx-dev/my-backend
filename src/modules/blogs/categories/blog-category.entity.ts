import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('blog_categories')
export class BlogCategory {
  @PrimaryColumn({ length: 80 })
  name: string;

  @Column({ length: 160, unique: true })
  key: string;

  @Column({ default: 0 })
  position: number;
}
