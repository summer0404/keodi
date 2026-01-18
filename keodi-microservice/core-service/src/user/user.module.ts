import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { S3Module } from 'src/s3/s3.module';

@Module({
  controllers: [UserController],
  providers: [UserService],
  imports: [
    S3Module
  ],
})
export class UserModule {}
