import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.use(cookieParser())

  const config = new DocumentBuilder()
    .setTitle('API Document')
    .setDescription('List of APIs for KEODI')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'access-token',
    )
    .build();

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
  }))
  app.enableCors();

  const document = SwaggerModule.createDocument(app, config)

  SwaggerModule.setup('api/documents', app, document)

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
