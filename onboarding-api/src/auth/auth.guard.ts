import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const IS_PUBLIC_KEY = 'isPublic';

@Injectable()
export class AppAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1️⃣ Public route → allow
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // 2️⃣ JWT validation
    const isAuthenticated = (await super.canActivate(context)) as boolean;
    if (!isAuthenticated) {
      throw new UnauthorizedException();
    }

    // 3️⃣ Role check (optional)
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // logged-in user is enough
    }

    const { user } = context.switchToHttp().getRequest();
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }
}
