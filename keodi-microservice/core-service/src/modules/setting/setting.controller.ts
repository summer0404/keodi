import { Controller } from '@nestjs/common';
import { SettingService } from './setting.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UpdateUserSettingDto } from 'src/shared/dtos/setting.dto';

@Controller()
export class SettingController {
  constructor(private readonly settingService: SettingService) {}

  @MessagePattern('setting.get')
  async get(@Payload() userId: string) {
    return await this.settingService.get(userId);
  }

  @MessagePattern('setting.update')
  async update(
    @Payload()
    data: {
      userId: string;
      updateUserSettingDto: UpdateUserSettingDto;
    },
  ) {
    return await this.settingService.update(
      data.userId,
      data.updateUserSettingDto,
    );
  }
}
