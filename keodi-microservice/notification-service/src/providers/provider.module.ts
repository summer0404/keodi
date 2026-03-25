import { Global, Module } from '@nestjs/common';
import { EmailService } from './email/email.service';
import { FcmService } from './fcm/fcm.service';
import { KafkaModule } from './kafka/kafka.module';
import { RedisService } from './redis/redis.service';

@Global()
@Module({
  imports: [KafkaModule],
  providers: [EmailService, FcmService, RedisService],
  exports: [EmailService, FcmService, RedisService, KafkaModule],
})
export class ProviderModule {}
