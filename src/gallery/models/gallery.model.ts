import { MongooseModule } from "@nestjs/mongoose";
import { GallerySchema, GalleryClass } from "../schemas/gallery.schema";

export const GalleryModel = MongooseModule.forFeature([{ name: 'Gallery', schema: GallerySchema, collection: 'gallery' }])
