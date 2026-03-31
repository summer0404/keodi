import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UpdateUserSettingDto } from 'src/shared/dtos/setting.dto';
import { CurrentUserDto } from 'src/shared/dtos/user.dto';
import { SettingService } from './setting.service';
import { ApiGetSettings, ApiUpdateSettings } from './setting.swagger';

@ApiTags('Settings')
@Controller('settings')
@ApiBearerAuth('access-token')
export class SettingController {
  constructor(private readonly settingService: SettingService) {}

  @Get()
  @ApiGetSettings()
  async get(@CurrentUser() user: CurrentUserDto) {
    return await this.settingService.get(user.id);
  }

  @Patch()
  @ApiUpdateSettings()
  async update(
    @CurrentUser() user: CurrentUserDto,
    @Body() updateUserSettingDto: UpdateUserSettingDto,
  ) {
    return await this.settingService.update(user.id, updateUserSettingDto);
  }
}
