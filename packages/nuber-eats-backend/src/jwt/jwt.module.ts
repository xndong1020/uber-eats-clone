import { DynamicModule, Global, Module } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { JWT_CONFIG_OPTIONS } from './constants/jwt.constants';
import { JwtModuleOptions } from './interfaces/jwt-module-options.interface';
import { JwtService } from './jwt.service';

@Module({})
export class JwtModule {
  static forRoot(options: JwtModuleOptions): DynamicModule {
    return {
      module: JwtModule,
      exports: [JwtService],
      providers: [
        JwtService,
        {
          provide: JWT_CONFIG_OPTIONS,
          useValue: options,
        },
      ],
      global: options.isGlobal,
    };
  }
}
