import { Module } from '@nestjs/common';
import { VehicleCategoriesService } from './vehicle-categories.service';
import { VehicleCategoriesController } from './vehicle-categories.controller';

@Module({
  providers: [VehicleCategoriesService],
  controllers: [VehicleCategoriesController],
  exports: [VehicleCategoriesService],
})
export class VehicleCategoriesModule {}
