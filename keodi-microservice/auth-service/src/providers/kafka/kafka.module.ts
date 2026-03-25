
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { KafkaService } from "./kafka.service";

@Module({
    imports: [
        ClientsModule.registerAsync([
            {
                name: 'KAFKA_SERVICE',
                inject: [ConfigService],
                useFactory: async (configService: ConfigService) => {
                    const brokersString = configService.get<string>('KAFKA_BROKER');
                    const brokers = brokersString ? brokersString.split(',') : [];
                    return {
                        transport: Transport.KAFKA,
                        options: {
                            client: {
                                clientId: 'auth-client',
                                brokers,
                            },
                            consumer: {
                                groupId: 'auth-consumer',
                                allowAutoTopicCreation: true,
                            },
                            subscribe: {
                                fromBeginning: false,
                            },
                        },
                    };
                }
            }
        ])
    ],
    providers: [KafkaService],
    exports: [KafkaService],
})
export class KafkaModule { }