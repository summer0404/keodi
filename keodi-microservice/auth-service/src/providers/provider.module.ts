import { Global, Module } from "@nestjs/common";
import { RedisService } from "./redis/redis.service";
import { KafkaModule } from "./kafka/kafka.module";

@Global()
@Module({
    imports: [KafkaModule],
    providers: [RedisService],
    exports: [RedisService, KafkaModule],
})
export class ProviderModule {}