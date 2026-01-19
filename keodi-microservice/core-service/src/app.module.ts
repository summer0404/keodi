import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PlaceModule } from './modules/place/place.module';
import { PrismaModule } from './database/prisma.module';
import { UserModule } from './modules/user/user.module';
import { ImageModule } from './modules/image/image.module';
import { ReviewModule } from './modules/review/review.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PlaceModule,
    PrismaModule,
    UserModule,
    ImageModule,
    ReviewModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
