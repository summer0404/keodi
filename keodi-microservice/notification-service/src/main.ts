import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport } from '@nestjs/microservices'
import * as dotenv from 'dotenv'

async function bootstrap() {
  dotenv.config()
  
  const app = await NestFactory.createMicroservice(
    AppModule,
    {
      name: 'NOTIFICATION_SERVICE',
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: 'notification-client',
          brokers: [process.env.KAFKA_BROKER]
        },
        consumer: {
          groupId: 'notification-consumer'
        }
      }
    });

  await app.listen();
}
bootstrap();
