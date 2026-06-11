import { Module } from '@nestjs/common';
import { OutletsController } from './outlets.controller';
import { OutletsService } from './outlets.service';
import { OutletsRepository } from './outlets.repository';

@Module({
  controllers: [OutletsController],
  providers: [OutletsService, OutletsRepository],
  // Repository di-export untuk dipakai cart (validasi stok) & orders
  // (reservasi/finalisasi stok dalam transaksi checkout).
  exports: [OutletsService, OutletsRepository],
})
export class OutletsModule {}
