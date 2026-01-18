import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { RedisModule } from 'src/redis/redis.module';
import { KafkaModule } from 'src/kafka/kafka.module';

@Module({
  controllers: [UserController],
  providers: [UserService],
  imports: [
    RedisModule,
    KafkaModule
  ],
  exports: [UserService]
})
export class UserModule {}
