import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './database/prisma.module';
import { AttributeModule } from './modules/attribute/attribute.module';
import { CategoryModule } from './modules/category/category.module';
import { FavoriteModule } from './modules/favorite/favorite.module';
import { FriendModule } from './modules/friend/friend.module';
import { GroupSessionModule } from './modules/group-session/group-session.module';
import { ImageModule } from './modules/image/image.module';
import { PlaceModule } from './modules/place/place.module';
import { ReviewModule } from './modules/review/review.module';
import { SearchModule } from './modules/search/search.module';
import { ScheduleModule } from '@nestjs/schedule';
import { RecommendationModule } from './modules/recommendation/recommendation.module';
import { UserModule } from './modules/user/user.module';
import { KafkaModule } from './providers/kafka/kafka.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    KafkaModule,
    PlaceModule,
    PrismaModule,
    UserModule,
    ImageModule,
    ReviewModule,
    CategoryModule,
    FavoriteModule,
    FriendModule,
    AttributeModule,
    GroupSessionModule,
    SearchModule,
    RecommendationModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
