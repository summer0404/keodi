import { Module } from "@nestjs/common";
import { PrismaModule } from "src/database/prisma.module";
import { FavoriteController } from "./favorite.controller";
import { FavoriteService } from "./favorite.service";

@Module({
    imports: [PrismaModule],
    controllers: [FavoriteController],
    providers: [FavoriteService],
})

export class FavoriteModule { }