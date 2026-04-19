import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLE_KEY } from 'src/common/decorators/role.decorator';
import { ApiErrorMessages } from 'src/shared/constants/error.constant';
import { Role } from 'src/shared/enums/role.enum';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) return true;

    const request = context.switchToHttp().getRequest();
    const userRole = request?.user?.role as Role | undefined;

    if (!userRole)
      throw new ForbiddenException(ApiErrorMessages.USER_ROLE_REQUIRED);

    if (!requiredRoles.includes(userRole))
      throw new ForbiddenException(ApiErrorMessages.INSUFFICIENT_ROLE_PERMISSION);

    return true;
  }
}
