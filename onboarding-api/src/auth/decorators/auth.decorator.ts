import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

export function AuthenticatedOnly() {
  return applyDecorators(
    UseGuards(JwtAuthGuard),
    ApiBearerAuth('access-token'),
    ApiUnauthorizedResponse({ description: 'JWT missing or invalid' }),
  );
}
