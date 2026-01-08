import { Injectable, ExecutionContext, UnauthorizedException  } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { IS_PUBLIC_KEY } from "src/decorators/skip-auth.decorator";

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') { 
    constructor(private reflector: Reflector){
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

    canActivate(context: ExecutionContext){
        const skipAuth = this.reflector.getAllAndOverride<boolean>(
            IS_PUBLIC_KEY,
            [
                context.getHandler(),
                context.getClass()
            ],
        )

        if(skipAuth){
            return true
        }

        return super.canActivate(context)
    }
}