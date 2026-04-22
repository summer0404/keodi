import { CacheInterceptor } from "@nestjs/cache-manager";
import { ExecutionContext, Injectable } from "@nestjs/common";
import { RedisKeys } from "src/shared/constants/redis.constant";

@Injectable()
export class RecommendationCacheInterceptor extends CacheInterceptor {
    protected trackBy(context: ExecutionContext): string | undefined {
        const request = context.switchToHttp().getRequest();
        const routePath = request?.route?.path ?? '';
        const userId = request?.user?.id;

        if(routePath.includes('for-you') && userId) {
            return RedisKeys.RECOMMENDATION.FOR_YOU(userId);
        }

        if(routePath.includes('trending') && userId) {
            return RedisKeys.RECOMMENDATION.TRENDING(userId);
        }

        if(routePath.includes('recommendations')) {
            const sessionId = request.params.sessionId;
            return RedisKeys.RECOMMENDATION.GROUP_SESSION_RECOMMENDATIONS(sessionId);
        }

        return undefined
    }
}
