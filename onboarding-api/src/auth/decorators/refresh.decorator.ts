import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtRefreshGuard } from '../guards/jwt-refresh.guard';
import { Public } from './public.decorator';
export function RefreshTokenOnly() {
    return applyDecorators(
        Public(), // remove jwt-auth-requirement
        UseGuards(JwtRefreshGuard),
        ApiBearerAuth('access-token'),
        ApiUnauthorizedResponse({ description: 'Missing or invalid Refresh JWT token' })
    );
}