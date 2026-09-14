import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { BlogCategoriesService } from './blog-categories.service';
import { BlogCategory } from './blog-category.entity';

describe('BlogCategoriesService', () => {
  const repository = {
    findOneBy: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
  };
  const service = new BlogCategoriesService(
    repository as unknown as Repository<BlogCategory>,
  );
  beforeEach(() => jest.resetAllMocks());

  it('resolves equivalent spellings to the existing canonical category', async () => {
    repository.findOneBy.mockResolvedValue({ name: 'Tecnología' });
    await expect(service.resolve('  TECNOLOGIA  ')).resolves.toBe('Tecnología');
    expect(repository.findOneBy).toHaveBeenCalledWith({ key: 'tecnologia' });
  });
  it('rejects unknown categories and punctuation-only names', async () => {
    repository.findOneBy.mockResolvedValue(null);
    await expect(service.resolve('Missing')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.create({ name: '!!!', position: 0 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('reports concurrent duplicates and referenced deletion as recoverable conflicts', async () => {
    repository.insert.mockRejectedValue(
      new QueryFailedError('', [], { code: '23505' }),
    );
    await expect(
      service.create({ name: 'Trabajo', position: 1 }),
    ).rejects.toBeInstanceOf(ConflictException);
    repository.delete.mockRejectedValue(
      new QueryFailedError('', [], { code: '23503' }),
    );
    await expect(service.delete('Trabajo')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
  it('does not report a missing rename or deletion as successful', async () => {
    repository.update.mockResolvedValue({ affected: 0 });
    repository.delete.mockResolvedValue({ affected: 0 });
    await expect(
      service.update('Missing', { name: 'New', position: 0 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.delete('Missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
