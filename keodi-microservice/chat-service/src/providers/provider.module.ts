import { Global, Module } from '@nestjs/common';
import { KafkaModule } from './kafka/kafka.module';
import { RedisService } from './redis/redis.service';

@Global()
@Module({
  imports: [KafkaModule],
  providers: [RedisService],
  exports: [RedisService, KafkaModule],
})
export class ProviderModule {}
