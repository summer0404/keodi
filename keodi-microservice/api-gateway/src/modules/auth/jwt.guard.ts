import { Injectable, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { IS_PUBLIC_KEY } from "src/common/decorators/skip-auth.decorator";
import { RedisService } from "src/providers/redis/redis.service";

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(
        private reflector: Reflector,
        private readonly redisService: RedisService
    ) {
        super()
    }

    handleRequest<TUser = any>(err: any, user: any, info: any, context: ExecutionContext, status?: any): TUser {
        if (err || !user) {
            let message = 'Unauthorized'

            switch (info?.name) {
                case 'TokenExpiredError':
                    message = 'Token has expired'
                    break
                case 'JsonWebTokenError':
                    message = 'Invalid token'
                    break
                case 'NotBeforeError':
                    message = 'Token not active'
                    break
                default:
                    message = 'Token not provided'
                    break
            }

            throw new UnauthorizedException(message)
        }

        return user
    }

    canActivate(context: ExecutionContext) {
        /*--------Check that api is public --------*/
        const skipAuth = this.reflector.getAllAndOverride<boolean>(
            IS_PUBLIC_KEY,
            [
                context.getHandler(),
                context.getClass()
            ],
        )
        if (skipAuth) {
            return true
        }
        /*-----------------------------------------*/


        /*-------- Check if token is blacklisted --------*/
        const request = context.switchToHttp().getRequest();
        const token = request.headers['authorization']?.split(' ')[1];

        if (token) {
            return this.redisService.has(`blacklist_token:${token}`).then(isBlacklisted => {
                if (isBlacklisted) {
                    throw new UnauthorizedException('Token has been revoked');
                }
                return super.canActivate(context) as Promise<boolean>;
            });
        }
        /*------------------------------------------------*/

        return super.canActivate(context)
    }
}