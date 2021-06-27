import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';
import { UsersService } from 'src/users/users.service';
import { JwtService } from './jwt.service';

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}
  async use(req: Request, res: Response, next: () => void) {
    // IntrospectionQuery is from Graphql playground auto schema polling
    if (req.body.operationName === 'IntrospectionQuery') {
      next();
      return;
    }

    if (
      !['createUser', 'loginUser', 'verifyEmail'].includes(
        req.body.operationName,
      )
    ) {
      const bearerHeader = req.headers['authorization'];
      if (!bearerHeader) throw new Error('Unauthorized.');

      const bearer = bearerHeader.split(' ');
      const bearerToken = bearer[1];
      const decoded = this.jwtService.verify(bearerToken);
      if (typeof decoded === 'object' && 'id' in decoded) {
        console.log('decoded 1', decoded['id']);
        try {
          const user = await this.usersService.getOne({ id: decoded['id'] });
          req['user'] = user; // add user object to the request object
        } catch (e) {
          console.error('error', e);
          throw new Error('Unauthorized.');
        }
      }
    }

    next();
  }
}
