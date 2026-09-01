import { Module } from '@nestjs/common';
import { CorporateService } from './corporate.service';
import { CorporateController, PlatformRouteEditConfigController } from './corporate.controller';

@Module({
  providers: [CorporateService],
  controllers: [CorporateController, PlatformRouteEditConfigController],
  exports: [CorporateService],
})
export class CorporateModule {}
