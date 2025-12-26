import { Global, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { KafkaService } from './kafka.service';

@Global()
@Module({
    imports: [
        ClientsModule.registerAsync([
            {
                name: 'AUTH_SERVICE',
                inject: [ConfigService],
                useFactory: async (config: ConfigService) => {
                    const brokersString = config.get<string>('KAFKA_BROKER');
                    const brokers = brokersString ? brokersString.split(',') : [];

                    return {
                        transport: Transport.KAFKA,
                        options: {
                            client: {
                                clientId: 'api-gateway-auth-client',
                                brokers,
                            },
                            consumer: {
                                groupId: 'api-gateway-auth-consumer',
                                allowAutoTopicCreation: true,
                            },
                            subscribe: {
                                fromBeginning: false,
                            },
                        },
                    };
                },
            },
            {
                name: 'CORE_SERVICE',
                inject: [ConfigService],
                useFactory: async (config: ConfigService) => {
                    const brokersString = config.get<string>('KAFKA_BROKER');
                    const brokers = brokersString ? brokersString.split(',') : [];
                    
                    return {
                        transport: Transport.KAFKA,
                        options: {
                            client: {
                                clientId: 'api-gateway-core-client',
                                brokers,
                            },
                            consumer: {
                                groupId: 'api-gateway-core-consumer',
                                allowAutoTopicCreation: true,
                            },
                            subscribe: {
                                fromBeginning: false,
                            },
                        },
                    };
                }
            }
        ]),
    ],
    providers: [KafkaService],
    exports: [ClientsModule, KafkaService],
})
export class KafkaModule { }
