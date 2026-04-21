import { Body, Controller, HttpCode, HttpStatus, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UpsertDeviceTokenDto } from 'src/shared/dtos/device-token.dto';
import { CurrentUserDto } from 'src/shared/dtos/user.dto';
import { DeviceTokenService } from './device-token.service';
import { ApiUpsertDeviceToken } from './device-token.swagger';

@ApiTags('Device Tokens')
@Controller('device-tokens')
@ApiBearerAuth('access-token')
export class DeviceTokenController {
  constructor(private readonly deviceTokenService: DeviceTokenService) {}

  @Put()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiUpsertDeviceToken()
  upsert(
    @CurrentUser() user: CurrentUserDto,
    @Body() upsertDeviceTokenDto: UpsertDeviceTokenDto,
  ) {
    return this.deviceTokenService.upsert(user.id, upsertDeviceTokenDto);
  }
}
