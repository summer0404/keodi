import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis/redis.service';
import { S3Service } from './s3/s3.service';
import { KafkaModule } from './kafka/kafka.module';

@Global()
@Module({
  imports: [KafkaModule],
  providers: [RedisService, S3Service],
  exports: [RedisService, S3Service, KafkaModule],
})
export class ProviderModule {}
