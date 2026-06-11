import { Module } from '@nestjs/common';
import { StockTransfersController } from './stock-transfers.controller';
import { StockTransfersService } from './stock-transfers.service';
import { StockTransfersRepository } from './stock-transfers.repository';
import { OutletsModule } from '../outlets/outlets.module';

@Module({
  imports: [OutletsModule],
  controllers: [StockTransfersController],
  providers: [StockTransfersService, StockTransfersRepository],
})
export class StockTransfersModule {}
