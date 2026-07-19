import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

import { envs } from '@config/index';
import { Public } from '@/modules/api-keys/decorators/public.decorator';
import { RequireScopes } from '@/modules/api-keys/decorators/require-scopes.decorator';
import { UploadBlogAssetDto } from '../dto';
import { BlogAssetsService } from './blog-assets.service';

@RequireScopes('blog:admin')
@Controller('blog/admin/assets')
export class AdminBlogAssetsController {
  constructor(private readonly assets: BlogAssetsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { files: 1, fileSize: envs.blogAssetMaxBytes },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadBlogAssetDto,
  ) {
    return this.assets.upload(file, dto.altText);
  }

  @Get()
  findAll() {
    return this.assets.findAll();
  }

  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.assets.delete(id);
  }
}

@Controller('blog/assets')
export class PublicBlogAssetsController {
  constructor(private readonly assets: BlogAssetsService) {}

  @Public()
  @Get(':id')
  async read(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const asset = await this.assets.read(id);
    response.set({
      'Content-Type': asset.mimeType,
      'Content-Length': String(asset.sizeBytes),
      'Cache-Control': asset.cacheControl,
      'X-Content-Type-Options': 'nosniff',
    });
    return new StreamableFile(asset.stream);
  }
}
