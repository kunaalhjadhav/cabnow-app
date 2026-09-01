import { Module } from '@nestjs/common';
import { RouteChangesService } from './route-changes.service';
import { RouteChangesController } from './route-changes.controller';
import { MapsModule } from '../maps/maps.module';
import { PricingModule } from '../pricing/pricing.module';
import { CorporateModule } from '../corporate/corporate.module';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [MapsModule, PricingModule, CorporateModule, TrackingModule],
  providers: [RouteChangesService],
  controllers: [RouteChangesController],
})
export class RouteChangesModule {}
