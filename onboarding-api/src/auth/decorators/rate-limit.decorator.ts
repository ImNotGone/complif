import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiTooManyRequestsResponse } from '@nestjs/swagger';
import { LoginRateLimitGuard } from '../guards/login-rate-limit.guard';

export const RATE_LIMIT_KEY = 'rate_limit';

export function RateLimit() {
  return applyDecorators(
    SetMetadata(RATE_LIMIT_KEY, true),
    UseGuards(LoginRateLimitGuard),
    ApiTooManyRequestsResponse({
      description: 'Too many requests — rate limit exceeded',
    }),
  );
}
