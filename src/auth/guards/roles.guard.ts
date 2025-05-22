import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { USER_KEY } from '../constants/auth.constant';
import { ROLES_KEY, RoleLevel } from '../decorators/roles.decorator';
import { Request } from 'express';
import { TokenPayload } from 'src/shared/types/jwt.type';

interface RequestWithUser extends Request {
  [USER_KEY]?: TokenPayload;
}

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
