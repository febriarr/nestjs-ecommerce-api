import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CategoriesRepository } from './categories.repository';
import { ImageProcessingModule } from '../../infrastructure/image-processing/image-processing.module';

@Module({
  imports: [ImageProcessingModule],
  controllers: [CategoriesController],
  providers: [CategoriesService, CategoriesRepository],
})
export class CategoriesModule {}
