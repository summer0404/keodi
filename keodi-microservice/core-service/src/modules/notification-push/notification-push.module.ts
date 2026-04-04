import { Module } from '@nestjs/common';
import { PlaceModule } from 'src/modules/place/place.module';
import { RecommendationModule } from 'src/modules/recommendation/recommendation.module';
import { SettingModule } from 'src/modules/setting/setting.module';
import { NotificationPushScheduler } from './notification-push.scheduler';

@Module({
  imports: [SettingModule, RecommendationModule, PlaceModule],
  providers: [NotificationPushScheduler],
})
export class NotificationPushModule {}
