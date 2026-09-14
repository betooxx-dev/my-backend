import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { envs } from '@config/index';
import { BlogAsset, BlogPost } from '../entities';
import { AssetReconciler } from './asset-reconciler';
import {
  AdminBlogAssetsController,
  PublicBlogAssetsController,
} from './blog-assets.controller';
import { BlogAssetsService } from './blog-assets.service';
import { BLOG_ASSET_STORAGE } from './blog-asset-storage';
import { LocalBlogAssetStorage } from './local-blog-asset.storage';
import { R2BlogAssetStorage } from './r2-blog-asset.storage';

@Module({
  imports: [TypeOrmModule.forFeature([BlogAsset, BlogPost])],
  controllers: [AdminBlogAssetsController, PublicBlogAssetsController],
  providers: [
    BlogAssetsService,
    AssetReconciler,
    {
      provide: BLOG_ASSET_STORAGE,
      useFactory: () => {
        if (envs.blogAssetDriver === 'local') {
          return new LocalBlogAssetStorage(envs.blogAssetLocalDir);
        }

        if (
          !envs.r2AccountId ||
          !envs.r2Bucket ||
          !envs.r2AccessKeyId ||
          !envs.r2SecretAccessKey
        ) {
          throw new Error('R2 blog asset storage configuration is incomplete');
        }
        return new R2BlogAssetStorage({
          accountId: envs.r2AccountId,
          bucket: envs.r2Bucket,
          accessKeyId: envs.r2AccessKeyId,
          secretAccessKey: envs.r2SecretAccessKey,
        });
      },
    },
  ],
  exports: [BlogAssetsService, AssetReconciler, BLOG_ASSET_STORAGE],
})
export class BlogAssetsModule {}
