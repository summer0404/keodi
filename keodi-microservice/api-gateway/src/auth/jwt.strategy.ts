import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RedisService } from "src/redis/redis.service";


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {

    constructor(
        configService: ConfigService,
        private readonly redisService: RedisService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET')
        })
    }

    async validate(req: any, payload: any) {
        const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);

        const isBlacklisted = await this.redisService.has(`blacklist_token:${token}`);
        if (isBlacklisted) {
            throw new UnauthorizedException('Token has been revoked');
        }

        return { 
            id: payload.sub, 
            username: payload.username, 
            email: payload.email
        };
    }
}