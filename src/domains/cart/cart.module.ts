import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CartRepository } from './cart.repository';
import { OutletsModule } from '../outlets/outlets.module';
import { ImageProcessingModule } from '../../infrastructure/image-processing/image-processing.module';

@Module({
  imports: [OutletsModule, ImageProcessingModule],
  controllers: [CartController],
  providers: [CartService, CartRepository],
  // CartRepository dipakai OrdersService (baca item & clear cart saat checkout).
  exports: [CartService, CartRepository],
})
export class CartModule {}
