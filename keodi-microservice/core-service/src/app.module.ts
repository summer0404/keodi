import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './database/prisma.module';
import { CategoryModule } from './modules/category/category.module';
import { FavoriteModule } from './modules/favorite/favorite.module';
import { FriendModule } from './modules/friend/friend.module';
import { ImageModule } from './modules/image/image.module';
import { PlaceModule } from './modules/place/place.module';
import { ReviewModule } from './modules/review/review.module';
import { UserModule } from './modules/user/user.module';
import { AttributeModule } from './modules/attribute/attribute.module';
import { GroupSessionModule } from './modules/group-session/group-session.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PlaceModule,
    PrismaModule,
    UserModule,
    ImageModule,
    ReviewModule,
    CategoryModule,
    FavoriteModule,
    FriendModule,
    AttributeModule
    GroupSessionModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
