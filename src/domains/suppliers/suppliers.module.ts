import { Module } from '@nestjs/common';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { SuppliersRepository } from './suppliers.repository';

@Module({
  controllers: [SuppliersController],
  providers: [SuppliersService, SuppliersRepository],
  // Repository dipakai purchase-orders (validasi supplier).
  exports: [SuppliersRepository],
})
export class SuppliersModule {}
