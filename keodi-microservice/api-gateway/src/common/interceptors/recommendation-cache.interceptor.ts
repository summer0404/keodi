import { CacheInterceptor } from "@nestjs/cache-manager";
import { ExecutionContext, Injectable } from "@nestjs/common";

@Injectable()
export class RecommendationCacheInterceptor extends CacheInterceptor {
    protected trackBy(context: ExecutionContext): string | undefined {
        const request = context.switchToHttp().getRequest();
        const routePath = request?.route?.path ?? '';
        const userId = request?.user?.id;

        if(routePath.includes('for-you') && userId) {
            return `place:foryou:${userId}`;
        }

        if(routePath.includes('trending') && userId) {
            return `place:trending:${userId}`;
        }

        if(routePath.includes('recommendations')) {
            const sessionId = request.params.sessionId;
            return `group-session:${sessionId}:recommendations`;
        }

        return undefined
    }
}
