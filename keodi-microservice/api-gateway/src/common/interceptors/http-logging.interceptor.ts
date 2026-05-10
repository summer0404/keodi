import {
    CallHandler,
    ExecutionContext,
    Injectable,
    Logger,
    NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
    LOG_MAX_BODY_LENGTH,
    LOGGING_SENSITIVE_KEYS,
} from 'src/shared/constants/logging.constant';
import {
    ErrorLogDto,
    RequestLogDto,
    ResponseLogDto,
} from 'src/shared/dtos/logging.dto';

function sanitize(obj: unknown): unknown {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitize);

    return Object.fromEntries(
        Object.entries(obj as Record<string, unknown>).map(([key, value]) => [
            key,
            LOGGING_SENSITIVE_KEYS.has(key) ? '***' : sanitize(value),
        ]),
    );
}

function truncate(value: unknown): unknown {
    const raw = JSON.stringify(value);
    if (raw.length <= LOG_MAX_BODY_LENGTH) return value;
    return `[truncated ${raw.length} chars]`;
}

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger(HttpLoggingInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const req = context.switchToHttp().getRequest();
        const res = context.switchToHttp().getResponse();

        const { method, originalUrl, ip, headers, query, params, body, user } = req;

        const userAgent = (headers['user-agent'] as string) ?? 'unknown';
        const forwardedFor = headers['x-forwarded-for'] as string | undefined;
        const clientIp = forwardedFor?.split(',')[0]?.trim() ?? ip;
        const requestId = (headers['x-request-id'] as string) ?? randomUUID();

        const userId: string | null = user?.id ?? null;
        const role: string | null = user?.role ?? null;

        const startTime = Date.now();

        const requestLog: RequestLogDto = {
            type: 'REQUEST',
            requestId,
            method,
            url: originalUrl,
            ip: clientIp,
            userAgent,
            userId,
            role,
            ...(query && Object.keys(query).length && { query }),
            ...(params && Object.keys(params).length && { params }),
            ...(body && Object.keys(body).length && { body: truncate(sanitize(body)) }),
        };

        this.logger.log(JSON.stringify(requestLog));

        return next.handle().pipe(
            tap({
                next: (responseBody: unknown) => {
                    const responseLog: ResponseLogDto = {
                        type: 'RESPONSE',
                        requestId,
                        method,
                        url: originalUrl,
                        statusCode: res.statusCode,
                        duration: `${Date.now() - startTime}ms`,
                        userId,
                        role,
                        body: truncate(sanitize(responseBody)),
                    };

                    this.logger.log(JSON.stringify(responseLog));
                },
                error: (err: unknown) => {
                    const error = err as Record<string, unknown>;
                    const errorLog: ErrorLogDto = {
                        type: 'RESPONSE_ERROR',
                        requestId,
                        method,
                        url: originalUrl,
                        duration: `${Date.now() - startTime}ms`,
                        userId,
                        role,
                        error: error?.message as string | undefined,
                        statusCode:
                            ((error?.response as Record<string, unknown>)?.statusCode as number | undefined)
                            ?? (error?.status as number | undefined),
                    };

                    this.logger.error(JSON.stringify(errorLog));
                },
            }),
        );
    }
}
