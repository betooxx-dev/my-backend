import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { BlogCategory } from './blog-category.entity';
import { categoryKey, categoryName } from './category-name';
import { CategoryDto } from './category.dto';

@Injectable()
export class BlogCategoriesService {
  constructor(
    @InjectRepository(BlogCategory)
    private readonly categories: Repository<BlogCategory>,
  ) {}

  findAll() {
    return this.categories.find({ order: { position: 'ASC', name: 'ASC' } });
  }

  async resolve(name: string): Promise<string> {
    const category = await this.categories.findOneBy({
      key: categoryKey(name),
    });
    if (!category)
      throw new BadRequestException('Selecciona una categoría disponible.');
    return category.name;
  }

  async create(dto: CategoryDto) {
    const name = categoryName(dto.name);
    const key = categoryKey(name);
    if (!key)
      throw new BadRequestException('La categoría necesita un nombre válido.');
    try {
      await this.categories.insert({ name, key, position: dto.position });
      return { name, position: dto.position };
    } catch (error) {
      this.rethrow(error);
    }
  }

  async update(previousName: string, dto: CategoryDto) {
    const name = categoryName(dto.name);
    const key = categoryKey(name);
    if (!key)
      throw new BadRequestException('La categoría necesita un nombre válido.');
    try {
      const result = await this.categories.update(
        { name: previousName },
        { name, key, position: dto.position },
      );
      if (!result.affected)
        throw new NotFoundException('La categoría ya no existe.');
      return { name, position: dto.position };
    } catch (error) {
      this.rethrow(error);
    }
  }

  async delete(name: string) {
    try {
      const result = await this.categories.delete({ name });
      if (!result.affected)
        throw new NotFoundException('La categoría ya no existe.');
      return { deleted: true };
    } catch (error) {
      this.rethrow(error);
    }
  }

  private rethrow(error: unknown): never {
    if (error instanceof QueryFailedError) {
      const code = (error.driverError as { code?: string }).code;
      if (code === '23505')
        throw new ConflictException(
          'Ya existe una categoría con ese nombre o una variante equivalente.',
        );
      if (code === '23503')
        throw new ConflictException(
          'La categoría está en uso. Reasigna sus publicaciones antes de eliminarla.',
        );
    }
    throw error;
  }
}
