import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);
  private readonly redis: Redis;
  private readonly subscriber: Redis;
  private expiredKeyListenerInitialized = false;
  private readonly expiredKeyHandlers: Array<
    (key: string) => void | Promise<void>
  > = [];

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST'),
      port: Number(this.configService.get<string>('REDIS_PORT')),
      password: this.configService.get<string>('REDIS_PASSWORD'),
    });
    this.subscriber = this.redis.duplicate();
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async has(key: string): Promise<boolean> {
    return (await this.redis.exists(key)) === 1;
  }

  async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.redis.zrevrange(key, start, stop);
  }

  async set(key: string, value: string): Promise<void> {
    await this.redis.set(key, value);
  }

  async setEx(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, value, 'EX', ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.redis.keys(pattern);
  }

  async subscribeToExpiredKeys(
    handler: (key: string) => void | Promise<void>,
  ): Promise<void> {
    this.expiredKeyHandlers.push(handler);

    if (this.expiredKeyListenerInitialized) {
      return;
    }

    this.expiredKeyListenerInitialized = true;

    try {
      await this.subscriber.config('SET', 'notify-keyspace-events', 'Ex');
    } catch (error: any) {
      this.logger.warn(
        `Could not configure Redis keyspace notifications: ${error?.message ?? 'unknown error'}`,
      );
    }

    await this.subscriber.psubscribe('__keyevent@*__:expired');

    this.subscriber.on('pmessage', (_pattern, _channel, key: string) => {
      for (const expiredKeyHandler of this.expiredKeyHandlers) {
        void Promise.resolve(expiredKeyHandler(key)).catch((error: any) => {
          this.logger.error(
            `Error handling expired Redis key event: ${error?.message ?? 'unknown error'}`,
          );
        });
      }
    });
  }

  async onModuleDestroy() {
    await this.subscriber.quit();
    await this.redis.quit();
  }
}
