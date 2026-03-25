import { CacheInterceptor } from "@nestjs/cache-manager";
import { ExecutionContext, Injectable } from "@nestjs/common";

@Injectable()
export class RecommendationCacheInterceptor extends CacheInterceptor {
    protected trackBy(context: ExecutionContext): string | undefined {
        const request = context.switchToHttp().getRequest();

        if (!request.user) {
            return undefined
        }

        const path = request.route.path;

        if(path.includes('for-you')) {
            return `foryou:${request.user.id}`;
        }

        if(path.includes('trending')) {
            return `trending:${request.user.id}`;
        }

        return undefined
    }
}