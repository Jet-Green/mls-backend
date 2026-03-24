import {
  Body, Controller, HttpCode, HttpStatus, Post, Get, Param, Query,
  UploadedFiles, UseInterceptors
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express'; import { GalleryService } from './gallery.service';

import YaCloud from 'src/s3/bucket';
import * as sharp from "sharp";
import { randomUUID } from 'crypto';
import ApiError from 'src/exceptions/errors/api-error';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GalleryClass } from './schemas/gallery.schema';

@Controller('gallery')
export class GalleryController {
  constructor(
    private readonly galleryService: GalleryService,
    @InjectModel('Gallery') private galleryModel: Model<GalleryClass>,
  ) { }

  @Post('add-photos')
  @UseInterceptors(AnyFilesInterceptor())
  async addProductVariant(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('captions') captionsStr: string,
  ) {
    const captions = captionsStr ? JSON.parse(captionsStr) : [];
    const imageUrls: string[] = [];
    let index = 0;
    for (let file of files) {
      const processedBuffer = await sharp(file.buffer)
        .rotate()
        .webp({ quality: 100 })
        .toBuffer();

      const fileName = `${randomUUID()}_${index}.webp`;
      const uploadResult = await YaCloud.Upload({
        file: { ...file, buffer: processedBuffer },
        path: `photos`,
        fileName,
      });

      const key = `photos/${fileName}`;
      const caption = captions[index] || '';

      await this.galleryModel.create({
        key,
        url: uploadResult.Location,
        caption,
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
    @Query('withUrls') withUrls: boolean = false,
  ): Promise<any> {

    const result = await YaCloud.listObjects({
      folder,
      limit: Number(limit) || 50,
      continuationToken,
    });

    if (withUrls && result.items.length > 0) {
      const keys = result.items.map(item => item.key);
      const presignedUrls = await YaCloud.getPresignedUrls(keys, 3600);

      const galleryItems = await this.galleryModel.find({ key: { $in: keys } }).lean();

      result.items = result.items.map((item, index) => {
        const galleryItem = galleryItems.find(g => g.key === item.key);
        return {
          ...item,
          _id: galleryItem?._id?.toString() || '',
          presignedUrl: presignedUrls[index],
          caption: galleryItem?.caption || '',
        };
      });
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

  @Get('get-by-id/:id')
  async getById(@Param('id') id: string) {
    const item = await this.galleryModel.findById(id).lean();
    if (!item) {
      throw ApiError.NotFound('Фото не найдено');
    }
    const presignedUrl = await YaCloud.getPresignedUrl(item.key, 3600);
    return {
      ...item,
      _id: item._id.toString(),
      presignedUrl,
    };
  }

  @Post('update-caption')
  async updateCaption(@Body() body: { id: string; caption: string }) {
    if (!body?.id) {
      throw ApiError.BadRequest("ID обязателен")
    }

    await this.galleryModel.findByIdAndUpdate(
      body.id,
      { caption: body.caption || '' }
    );

    return { success: true };
  }
}
