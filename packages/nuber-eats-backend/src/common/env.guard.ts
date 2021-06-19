import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';

@Injectable()
export class EnvGuard implements CanActivate {
  private static _allowedEnvs: string[] = [];
  constructor(private readonly configService: ConfigService) {}

  static setAllowedEnvs(allowedEnvs: string[]) {
    this._allowedEnvs = allowedEnvs;
    return this;
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const currentEnv = this.configService.get('NODE_ENV');
    console.log('EnvGuard._allowedEnvs', EnvGuard._allowedEnvs);
    return EnvGuard._allowedEnvs.includes(currentEnv);
  }
}
