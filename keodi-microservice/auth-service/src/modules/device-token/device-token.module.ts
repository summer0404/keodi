import { Module } from '@nestjs/common';
import { DeviceTokenController } from './device-token.controller';
import { DeviceTokenService } from './device-token.service';

@Module({
  controllers: [DeviceTokenController],
  providers: [DeviceTokenService],
})
export class DeviceTokenModule {}
