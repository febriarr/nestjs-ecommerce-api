import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateAttributeValueDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }: { value: string }) => value.trim())
  value: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayValue?: string;

  /** Kode warna hex (#RRGGBB), relevan untuk attribute type `color`. */
  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: 'colorHex harus format #RRGGBB',
  })
  colorHex?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
