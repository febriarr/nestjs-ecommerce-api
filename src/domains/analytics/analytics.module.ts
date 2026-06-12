import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { EventsController } from './events.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsRepository } from './analytics.repository';

@Module({
  controllers: [AnalyticsController, EventsController],
  providers: [AnalyticsService, AnalyticsRepository],
})
export class AnalyticsModule {}
