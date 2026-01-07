import { Module } from '@nestjs/common';
import { PlaceService } from './place.service';
import { PlaceController } from './place.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [PlaceController],
  providers: [PlaceService],
  imports: [PrismaModule],
})
export class PlaceModule {}
