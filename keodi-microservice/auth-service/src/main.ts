import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport } from '@nestjs/microservices';
import * as dotenv from "dotenv"

async function bootstrap() {

  dotenv.config(); 


  const app = await NestFactory.createMicroservice(
    AppModule,
    {
      name: 'AUTH_SERVICE',
      transport: Transport.KAFKA,
      options:{
        client: {
          clientId: 'auth-client',
          brokers: [process.env.KAFKA_BROKER],
        },
        consumer: {
          groupId: 'auth-consumer'
        }
      }
    }
  )

  await app.listen()
}
bootstrap();
