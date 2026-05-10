import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { ImageModule } from 'src/modules/image/image.module';

@Module({
  controllers: [UserController],
  providers: [UserService],
  imports: [ImageModule],
})
export class UserModule {}
