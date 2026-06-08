import { Module } from '@nestjs/common';
import { BrandsController } from './brands.controller';
import { BrandsService } from './brands.service';
import { BrandsRepository } from './brands.repository';
import { ImageProcessingModule } from '../../infrastructure/image-processing/image-processing.module';

@Module({
  imports: [ImageProcessingModule],
  controllers: [BrandsController],
  providers: [BrandsService, BrandsRepository],
})
export class BrandsModule {}
