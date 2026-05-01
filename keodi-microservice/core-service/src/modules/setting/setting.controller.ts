import { Controller } from '@nestjs/common';
import { SettingService } from './setting.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UpdateUserSettingDto } from 'src/shared/dtos/setting.dto';
import { SettingTopics } from 'src/shared/constants/topic.constant';

@Controller()
export class SettingController {
  constructor(private readonly settingService: SettingService) {}

  @MessagePattern(SettingTopics.Get)
  async get(@Payload() data: { userId: string }) {
    return await this.settingService.get(data.userId);
  }

  @MessagePattern(SettingTopics.Update)
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
