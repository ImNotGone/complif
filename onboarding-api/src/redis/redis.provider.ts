import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

/**
 * Shared Redis client for general-purpose commands (e.g. rate limiting).
 * Uses the same REDIS_URL as EventsService so both share one Redis instance
 * without any key conflicts — each feature uses its own key prefix.
 */
export const RedisProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService): Redis => {
    const url = config.get<string>('REDIS_URL', 'redis://localhost:6379');
    return new Redis(url);
  },
};
