import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.provider'

/** Maximum number of failed login attempts before the IP is blocked. */
const MAX_ATTEMPTS = 15;

/** Sliding-window duration in seconds (5 minutes). */
const WINDOW_SECONDS = 5 * 60;

@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(LoginRateLimitGuard.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const ip = this.extractIp(req);
    const key = `rate_limit:login:${ip}`;

    let attempts: number;

    try {
      attempts = await this.incrementAttempts(key);
    } catch (err) {
      // If Redis is unavailable, log the error but allow the request through
      // to avoid a hard dependency outage blocking all logins.
      this.logger.error(`Redis unavailable in LoginRateLimitGuard: ${err}`);
      return true;
    }

    if (attempts > MAX_ATTEMPTS) {
      const ttl = await this.redis.ttl(key);
      this.logger.warn(
        `Login rate limit exceeded for IP ${ip} — attempt ${attempts}. Retry in ${ttl}s.`,
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Too many login attempts. Please try again in ${Math.ceil(ttl / 60)} minute(s).`,
          retryAfter: ttl,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * Atomically increments the attempt counter and sets the expiry on first
   * write so the window is always anchored to the first attempt.
   */
  private async incrementAttempts(key: string): Promise<number> {
    const pipeline = this.redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, WINDOW_SECONDS, 'NX'); // only set TTL on first write
    const results = await pipeline.exec();
    // results[0] = [error, newCount]
    return results![0][1] as number;
  }

  private extractIp(req: Request): string {
    // Respect X-Forwarded-For when behind a proxy/load-balancer.
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return (Array.isArray(forwarded) ? forwarded[0] : forwarded)
        .split(',')[0]
        .trim();
    }
    return req.ip ?? 'unknown';
  }
}
