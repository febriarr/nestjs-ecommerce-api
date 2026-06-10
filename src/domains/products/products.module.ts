import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductVariantsController } from './product-variants.controller';
import { ProductDiscountsController } from './product-discounts.controller';
import { ProductsService } from './products.service';
import { ProductVariantsService } from './product-variants.service';
import { ProductDiscountsService } from './product-discounts.service';
import { ProductsRepository } from './products.repository';
import { ProductVariantsRepository } from './product-variants.repository';
import { ProductDiscountsRepository } from './product-discounts.repository';
import { ImageProcessingModule } from '../../infrastructure/image-processing/image-processing.module';

@Module({
  imports: [ImageProcessingModule],
  controllers: [
    ProductsController,
    ProductVariantsController,
    ProductDiscountsController,
  ],
  providers: [
    ProductsService,
    ProductVariantsService,
    ProductDiscountsService,
    ProductsRepository,
    ProductVariantsRepository,
    ProductDiscountsRepository,
  ],
})
export class ProductsModule {}
