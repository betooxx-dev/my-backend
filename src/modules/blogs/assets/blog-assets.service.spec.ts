import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';

import { BlogAsset, BlogPost } from '../entities';
import { BlogAssetsService } from './blog-assets.service';
import type { BlogAssetStorage } from './blog-asset-storage';

describe('BlogAssetsService', () => {
  it('updates the alt text of an existing asset', async () => {
    const assets = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    const service = new BlogAssetsService(
      assets as unknown as Repository<BlogAsset>,
      {} as Repository<BlogPost>,
      {} as BlogAssetStorage,
    );

    await expect(
      service.updateAltText('asset-id', 'Updated description'),
    ).resolves.toBeUndefined();
    expect(assets.update).toHaveBeenCalledWith(
      { id: 'asset-id' },
      { altText: 'Updated description' },
    );
  });

  it('rejects updating an asset that no longer exists', async () => {
    const service = new BlogAssetsService(
      {
        update: jest.fn().mockResolvedValue({ affected: 0 }),
      } as unknown as Repository<BlogAsset>,
      {} as Repository<BlogPost>,
      {} as BlogAssetStorage,
    );

    await expect(
      service.updateAltText('missing', 'Description'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
