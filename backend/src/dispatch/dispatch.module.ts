import { Module } from '@nestjs/common';
import { DispatchService } from './dispatch.service';
import { MapsModule } from '../maps/maps.module';

@Module({
  imports: [MapsModule],
  providers: [DispatchService],
  exports: [DispatchService],
})
export class DispatchModule {}
