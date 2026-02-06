import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from './roles.decorator';
import { Role } from '@prisma/client';

export function AuthenticatedOnly(...roles: Role[]) {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    Roles(...roles),
  );
}
