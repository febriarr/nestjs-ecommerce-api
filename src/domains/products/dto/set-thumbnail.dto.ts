import { IsInt } from 'class-validator';

export class SetThumbnailDTO {
  /** id product_media yang akan dijadikan thumbnail (harus milik product). */
  @IsInt()
  mediaId: number;
}
