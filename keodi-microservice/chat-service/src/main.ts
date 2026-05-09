import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(AppModule, {
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'chat-client',
        brokers: [process.env.KAFKA_BROKER],
      },
      consumer: {
        groupId: 'chat-consumer',
      },
    },
  });

  await app.listen();
}
bootstrap();
