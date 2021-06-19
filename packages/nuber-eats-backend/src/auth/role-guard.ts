import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';
import { User } from 'src/users/entities/user.entity';

@Injectable()
export class RoleGuard implements CanActivate {
  private static _allowedRoles: string[] = [];

  static setAllowedRoles(allowedRoles: string[]) {
    this._allowedRoles = allowedRoles;
    return this;
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // the context here is http context, wen can convert it to gqlContext
    const gqlContext = GqlExecutionContext.create(context).getContext();
    // the req['user'] will be now available from gqlContext
    const user: User = gqlContext['user'];
    return RoleGuard._allowedRoles.includes(user.role); // if user is undefined then block the request
  }
}
