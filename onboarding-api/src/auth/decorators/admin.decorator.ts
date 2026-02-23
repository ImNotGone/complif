import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { RolesGuard } from '../guards/roles.guard';
import { Role } from '@prisma/client';
import { Roles } from './roles.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

export function AdminOnly() {
    return applyDecorators(
        UseGuards(JwtAuthGuard, RolesGuard),
        Roles(Role.ADMIN),
        ApiBearerAuth('access-token'),
        ApiForbiddenResponse({ description: 'Admin role required' }),
        ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
    );
}
