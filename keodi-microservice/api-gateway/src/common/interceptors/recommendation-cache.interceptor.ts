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

        if(path.includes('places/for-you')) {
            return `place:foryou:${request.user.id}`;
        }

        if(path.includes('places/trending')) {
            return `place:trending:${request.user.id}`;
        }

        if(path.includes('group-sessions') && path.includes('recommendations')) {
            const sessionId = request.params.sessionId;
            return `group-session:${sessionId}:recommendations`;
        }

        return undefined
    }
}