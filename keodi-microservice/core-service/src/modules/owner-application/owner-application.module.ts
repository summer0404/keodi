import { Module } from '@nestjs/common';
import { OwnerApplicationController } from './owner-application.controller';
import { OwnerApplicationService } from './owner-application.service';

@Module({
  controllers: [OwnerApplicationController],
  providers: [OwnerApplicationService],
})
export class OwnerApplicationModule {}
