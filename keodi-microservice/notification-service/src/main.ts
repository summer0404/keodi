import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport } from '@nestjs/microservices'

async function bootstrap() {
  const app = await NestFactory.createMicroservice(
    AppModule,
    {
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
