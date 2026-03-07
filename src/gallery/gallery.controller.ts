import {
  Body, Controller, HttpCode, HttpStatus, Post, Get, Param, Query,
  UploadedFiles, UseInterceptors
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express'; import { GalleryService } from './gallery.service';

import YaCloud from 'src/s3/bucket';
import * as sharp from "sharp";
import { randomUUID } from 'crypto';
import ApiError from 'src/exceptions/errors/api-error';

@Controller('gallery')
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) { }

  @Post('add-photos')
  @UseInterceptors(AnyFilesInterceptor())
  async addProductVariant(
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const imageUrls: string[] = [];
    let index = 0;
    for (let file of files) {
      const processedBuffer = await sharp(file.buffer)
        // .resize(800, 800, { fit: 'inside' })
        .webp({ quality: 100 })
        .toBuffer();

      const uploadResult = await YaCloud.Upload({
        file: { ...file, buffer: processedBuffer },
        path: `photos`,
        fileName: `${randomUUID()}_${index}.webp`,
      });

      imageUrls.push(uploadResult.Location);
      index++;
    }

    return imageUrls
  }

  // @Get('get-all')
  // @HttpCode(HttpStatus.OK)
  // async getAllPhotos(
  //   @Query('folder') folder: string = 'photos',
  //   @Query('limit') limit: number = 50,
  //   @Query('continuationToken') continuationToken?: string,
  // ): Promise<any> {
  //   const maxKeys = Number(limit) > 0 ? Number(limit) : 50;

  //   return await YaCloud.listObjects({
  //     folder,
  //     limit: maxKeys,
  //     continuationToken,
  //   });
  // }

  @Get('get-all')
  @HttpCode(HttpStatus.OK)
  async getAllPhotos(
    @Query('folder') folder: string = 'photos',
    @Query('limit') limit: number = 50,
    @Query('continuationToken') continuationToken?: string,
    @Query('withUrls') withUrls: boolean = false, // флаг для генерации URL
  ): Promise<any> {

    const result = await YaCloud.listObjects({
      folder,
      limit: Number(limit) || 50,
      continuationToken,
    });

    // Если нужны presigned URLs для каждого объекта
    if (withUrls && result.items.length > 0) {
      const keys = result.items.map(item => item.key);
      const presignedUrls = await YaCloud.getPresignedUrls(keys, 3600);

      result.items = result.items.map((item, index) => ({
        ...item,
        presignedUrl: presignedUrls[index],
      }));
    }

    return result;
  }

  // Отдельный endpoint для получения presigned URL для конкретного файла
  @Get('presigned-url/:key(*)')
  async getPresignedUrl(@Param('key') key: string) {
    const url = await YaCloud.getPresignedUrl(key, 3600);
    return { url };
  }

  // Endpoint для получения нескольких presigned URL
  @Post('presigned-urls')
  async getPresignedUrls(@Body('keys') keys: string[]) {
    if (!Array.isArray(keys)) {
      throw ApiError.BadRequest("Не массив")
    }

    const urls = await YaCloud.getPresignedUrls(keys, 3600);
    return { urls };
  }
}
