import { USER_KEY } from '@/auth/constants/auth.constant';
import { ROLES_KEY, RoleLevel } from '@/auth/decorators/roles.decorator';
import { RequestWithUser } from '@/shared/types/request.types';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request[USER_KEY];

    if (!user) {
      throw new UnauthorizedException('User not found in request');
    }

    if (requiredRoles.some((role) => RoleLevel[user.role] >= RoleLevel[role])) {
      return true;
    }

    throw new UnauthorizedException('Insufficient permissions');
  }
}
