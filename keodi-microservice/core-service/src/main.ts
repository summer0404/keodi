import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport } from '@nestjs/microservices';
import { PlaceService } from './place/place.service';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(
    AppModule,
    {
      transport: Transport.KAFKA,
      options: {
        name: 'CORE_SERVICE',
        client: {
          clientId: 'core-client',
          brokers: [process.env.KAFKA_BROKER],
        },
        consumer: {
          groupId: 'core-consumer'
        }
      }
    }
  );
  await app.listen();
}
bootstrap();
