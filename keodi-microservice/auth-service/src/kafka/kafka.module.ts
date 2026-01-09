import { Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";

@Module({
    imports: [
        ClientsModule.register([
            {
                name: 'KAFKA_SERVICE',
                transport: Transport.KAFKA,
                options: {
                    client: {
                        clientId: 'auth-client',
                        brokers: [process.env.KAFKA_BROKER as string].filter((broker): broker is string => typeof broker === 'string')
                    }
                }
            }
        ]),
    ],
    exports: [ClientsModule]
})
export class KafkaModule { }