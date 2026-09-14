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
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';

import {
  ApiAdminDocumentation,
  ApiPublicNotFoundDocumentation,
  ApiSuccessResponse,
} from '@/common/swagger/api-response';
import { envs } from '@config/index';
import { Public } from '@/modules/api-keys/decorators/public.decorator';
import { RequireScopes } from '@/modules/api-keys/decorators/require-scopes.decorator';
import {
  BlogAssetResponseDto,
  DeletedResponseDto,
  UploadBlogAssetDto,
} from '../dto';
import { BlogAssetsService } from './blog-assets.service';

@ApiTags('blog-admin-assets')
@ApiAdminDocumentation()
@RequireScopes('blog:admin')
@Controller('blog/admin/assets')
export class AdminBlogAssetsController {
  constructor(private readonly assets: BlogAssetsService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'altText'],
      properties: {
        file: { type: 'string', format: 'binary' },
        altText: { type: 'string', minLength: 1, maxLength: 300 },
      },
    },
  })
  @ApiSuccessResponse(BlogAssetResponseDto, { status: 201 })
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
  @ApiSuccessResponse(BlogAssetResponseDto, { isArray: true })
  findAll() {
    return this.assets.findAll();
  }

  @Delete(':id')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiSuccessResponse(DeletedResponseDto)
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.assets.delete(id);
  }
}

@ApiTags('blog-assets')
@ApiPublicNotFoundDocumentation()
@Controller('blog/assets')
export class PublicBlogAssetsController {
  constructor(private readonly assets: BlogAssetsService) {}

  @Public()
  @Get(':id')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiBadRequestResponse({ description: 'The asset id is not a UUID' })
  @ApiNotFoundResponse({ description: 'Asset not found' })
  @ApiOkResponse({
    description: 'Binary image content',
    content: {
      'image/*': { schema: { type: 'string', format: 'binary' } },
    },
  })
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
