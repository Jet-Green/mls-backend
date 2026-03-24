import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type GalleryDocument = HydratedDocument<GalleryClass>;

@Schema()
export class GalleryClass {
  @Prop({ required: true })
  key: string;

  @Prop({ required: false, default: '' })
  caption: string;

  @Prop()
  url: string;
}

export const GallerySchema = SchemaFactory.createForClass(GalleryClass);
