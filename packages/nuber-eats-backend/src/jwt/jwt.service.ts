import { Inject, Injectable } from '@nestjs/common';
import { compare, genSalt, hash } from 'bcrypt';
import { sign, verify } from 'jsonwebtoken';

import { JWT_CONFIG_OPTIONS } from './constants/jwt.constants';
import { JwtModuleOptions } from './interfaces/jwt-module-options.interface';

@Injectable()
export class JwtService {
  constructor(
    @Inject(JWT_CONFIG_OPTIONS) private readonly options: JwtModuleOptions,
  ) {}
  async sign(payload: object): Promise<string> {
    return await sign(payload, this.options.secretKey);
  }
  // to return the decoded token, hence the return type is string | object
  verify(target: string) {
    return verify(target, this.options.secretKey);
  }
  async hashPassword(password): Promise<string> {
    const salt = await genSalt(10); // 10 rounds processing
    return await hash(password, salt);
  }

  async validatePassword(password, passwordHashed): Promise<boolean> {
    return await compare(password, passwordHashed);
  }
}
