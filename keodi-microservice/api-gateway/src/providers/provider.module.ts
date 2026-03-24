import { Global, Module } from "@nestjs/common";
import { RedisService } from "./redis/redis.service";
import { GoogleService } from "./google/google.service";
import { KafkaModule } from "./kafka/kafka.module";

@Global()
@Module({
    imports: [KafkaModule],
    providers: [RedisService, GoogleService],
    exports: [RedisService, GoogleService, KafkaModule],
})
export class ProviderModule {}