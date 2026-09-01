import { Module } from '@nestjs/common';
import { TripsService } from './trips.service';
import { TripsController } from './trips.controller';
import { PricingModule } from '../pricing/pricing.module';
import { CommissionModule } from '../commission/commission.module';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [PricingModule, CommissionModule, TrackingModule],
  providers: [TripsService],
  controllers: [TripsController],
  exports: [TripsService],
})
export class TripsModule {}
