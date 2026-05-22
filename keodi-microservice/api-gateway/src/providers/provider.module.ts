import { Global, Module } from "@nestjs/common";
import { RedisService } from "./redis/redis.service";
import { GoogleService } from "./google/google.service";
import { ImageService } from "./image/image.service";
import { KafkaModule } from "./kafka/kafka.module";

@Global()
@Module({
    imports: [KafkaModule],
    providers: [RedisService, GoogleService, ImageService],
    exports: [RedisService, GoogleService, ImageService, KafkaModule],
})
export class ProviderModule {}