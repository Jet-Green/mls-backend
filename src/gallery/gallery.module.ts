import { Module } from '@nestjs/common';
import { GalleryService } from './gallery.service';
import { GalleryController } from './gallery.controller';
import { GalleryModel } from './models/gallery.model';

@Module({
  imports: [GalleryModel],
  controllers: [GalleryController],
  providers: [GalleryService],
})
export class GalleryModule {}
