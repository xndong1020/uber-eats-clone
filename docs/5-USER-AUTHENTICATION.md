#### implement jwt

```
yarn add jsonwebtoken
yarn add -D @types/jsonwebtoken
```

The simplest way is to put a HS256 secret in env

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=root
DB_PASSWORD=root
DB_NAME=nuber-eats
SECRET_KEY=ru8BQHkXwR85dpnqnLlmysR8xllkh1mZ
```

Then get the value from `process.env.SECRET_KEY`

Then you can use this secret to encrypt the jwt

```ts
jwt.sign({ id: userInDb.id }, process.env.SECRET_KEY);
```

However, if we don't want to put this secret in process.env.SECRET_KEY. There is another way

Firstly, inject `ConfigService` into `users.module.ts`

```ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), ConfigService],
  providers: [UsersService, UsersResolver],
})
export class UsersModule {}
```

Then from the `UsersService`

```ts
constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

..... other code

    return [
      true,
      null,
      jwt.sign({ id: userInDb.id }, this.configService.get('SECRET_KEY')),
    ];
```

Some background information for `secret` and `private/public key`.

Note: the reason of having the `secret` or `private/public key` is to **verify is a token has been modified, not to hide secret information**. So don't put sensitive information inside of your token.

> The algorithm (HS256) used to sign the JWT means that the secret is a symmetric key that is known by both the sender and the receiver. It is negotiated and distributed out of band. Hence, if you're the intended recipient of the token, the sender should have provided you with the secret out of band.

> Both choices refer to what algorithm the identity provider uses to sign the JWT. Signing is a cryptographic operation that generates a “signature” (part of the JWT) that the recipient of the token can validate to ensure that the token has not been tampered with.

> RS256 (RSA Signature with SHA-256) is an asymmetric algorithm, and it uses a public/private key pair: the identity provider has a private (secret) key used to generate the signature, and the consumer of the JWT gets a public key to validate the signature. Since the public key, as opposed to the private key, doesn’t need to be kept secured, most identity providers make it easily available for consumers to obtain and use (usually through a metadata URL).
> HS256 (HMAC with SHA-256), on the other hand, is a symmetric algorithm, with only one (secret) key that is shared between the two parties. Since the same key is used both to generate the signature and to validate it, care must be taken to ensure that the key is not compromised.
> If you will be developing the application consuming the JWTs, you can safely use HS256, because you will have control on who uses the secret keys. If, on the other hand, you don’t have control over the client, or you have no way of securing a secret key, RS256 will be a better fit, since the consumer only needs to know the public (shared) key.
> Since the public key is usually made available from metadata endpoints, clients can be programmed to retrieve the public key automatically. If this is the case (as it is with the .Net Core libraries), you will have less work to do on configuration (the libraries will fetch the public key from the server). Symmetric keys, on the other hand, need to be exchanged out of band (ensuring a secure communication channel), and manually updated if there is a signing key rollover.

> Auth0 provides metadata endpoints for the OIDC, SAML and WS-Fed protocols, where the public keys can be retrieved. You can see those endpoints under the “Advanced Settings” of a client.

> The OIDC metadata endpoint, for example, takes the form of https://{account domain}/.well-known/openid-configuration. If you browse to that URL, you will see a JSON object with a reference to https://{account domain}/.well-known/jwks.json, which contains the public key (or keys) of the account.

> If you look at the RS256 samples, you will see that you don’t need to configure the public key anywhere: it’s retrieved automatically by the framework.

#### Creating our own jwt module

```
nest g mo jwt
```

Unlike the `UsersModule` and `CommonModule`, they are static modules, which means it doesn't take any configuration like `forRoot()`, whereas `dynamicModule` is module which can take configuration method like `forRoot()`, and return type is `DynamicModule`.

If you look at the forRoot() method, you will notice:

1. it is a static method
2. its return type is `DynamicModule`. `DynamicModule` is a module that returns an other module, and a module will return a service.

```ts
import { DynamicModule, Module } from '@nestjs/common';
import { JwtService } from './jwt.service';

@Module({})
export class JwtModule {
  static forRoot({ isGlobal }): DynamicModule {
    return {
      module: JwtModule,
      exports: [JwtService],
      providers: [JwtService],
    };
  }
}
```

`module: JwtModule` is module reference

`exports: [JwtService]` means this dynamic module is the one that is going to export a service `JwtService`, which means it can be imported by other modules.

`providers: [JwtService]` is a Optional list of providers that will be instantiated by the Nest injector.

`global: true` makes a module global-scoped.

Once imported into any module, a global-scoped module will be visible in all modules. Thereafter, modules that wish to inject a service exported from a global module do not need to import the provider module.

```ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtService {
  sayHello() {
    console.log('sayHello');
  }
}
```

Then from the app.module.ts, we need to register it as a dynamic module

```ts
JwtModule.forRoot();
```

As of now, it doesn't accept any configurations, and it is not a global module. So, if you want to use it in other modules, you need to register it from that module

users.module.ts

```ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtService } from 'src/jwt/jwt.service';
import { User } from './entities/user.entity';
import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), ConfigService, JwtService],
  providers: [UsersService, UsersResolver],
})
export class UsersModule {}
```

Then you can inject in into the `UsersService` of this `UsersModule`

```ts
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.jwtService.sayHello(); // test & see if it is working
  }
```

Or, we can make it a global module, so we don't need to import it from other modules. we can just inject it into the service class.

```ts
import { DynamicModule, Module } from '@nestjs/common';
import { JwtService } from './jwt.service';

@Module({})
export class JwtModule {
  static forRoot({ isGlobal }): DynamicModule {
    return {
      module: JwtModule,
      exports: [JwtService],
      providers: [JwtService],
      global: true,
    };
  }
}
```

or

```ts
import { DynamicModule, Global, Module } from '@nestjs/common';
import { JwtService } from './jwt.service';

@Module({})
@Global()
export class JwtModule {
  static forRoot({ isGlobal }): DynamicModule {
    return {
      module: JwtModule,
      exports: [JwtService],
      providers: [JwtService],
    };
  }
}
```

Then from the `UsersModule`, we don't need to import it explicitly. (for the same reason, we don't need to import `ConfigService` because we configured it as a global module too)

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService, UsersResolver],
})
export class UsersModule {}
```

#### Options for dynamic module

Firstly we create an interface for the options of `JwtModule`

jwt/interfaces/jwt-module-options.interface.ts

```ts
export interface JwtModuleOptions {
  secretKey: string;
  isGlobal: boolean;
}
```

Then use it from the jwt.module.ts

```ts
import { DynamicModule, Global, Module } from '@nestjs/common';
import { JwtModuleOptions } from './interfaces/jwt-module-options.interface';
import { JwtService } from './jwt.service';

@Module({})
export class JwtModule {
  static forRoot(options: JwtModuleOptions): DynamicModule {
    return {
      module: JwtModule,
      exports: [JwtService],
      providers: [JwtService],
      global: options.isGlobal,
    };
  }
}
```

also from the app.module.ts

```ts
import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { CommonModule } from './common/common.module';

import joi from 'joi';
import { User } from './users/entities/user.entity';
import { JwtModule } from './jwt/jwt.module';

@Module({
  imports: [
    GraphQLModule.forRoot({
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV}`,
      ignoreEnvFile: process.env.NODE_ENV === 'prod',
      validationSchema: joi.object({
        NODE_ENV: joi.string().valid('dev', 'prod', 'test'),
        DB_HOST: joi.string().required(),
        DB_PORT: joi.string().required(),
        DB_USERNAME: joi.string().required(),
        DB_PASSWORD: joi.string().required(),
        DB_NAME: joi.string().required(),
        SECRET_KEY: joi.string().required(),
      }),
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [User],
      synchronize: false,
      logging: ['error', 'query'],
    }),
    JwtModule.forRoot({
      isGlobal: true,
      secretKey: process.env.SECRET_KEY,
    }),
    UsersModule,
    CommonModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

As we can use, the options interface has a `secretKey` property, but how do we use its value from services?

Well, firstly we need to register it as an provider from the jwt.module.ts

```ts
import { DynamicModule, Global, Module } from '@nestjs/common';
import { JwtModuleOptions } from './interfaces/jwt-module-options.interface';
import { JwtService } from './jwt.service';

@Module({})
export class JwtModule {
  static forRoot(options: JwtModuleOptions): DynamicModule {
    return {
      module: JwtModule,
      exports: [JwtService],
      providers: [
        {
          provide: JwtService,
          useClass: JwtService,
        },
        {
          provide: 'JwtModuleOptions',
          useValue: options,
        },
      ],
      global: options.isGlobal,
    };
  }
}
```

Note:
`providers: [JwtService]` is the shortcut of ` { provide: JwtService, useClass: JwtService, }`.

As we put `{ { provide: 'JwtModuleOptions', useValue: options, } }` inside of the providers list, it means it is injectable into other service, like below:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { JwtModuleOptions } from './interfaces/jwt-module-options.interface';

@Injectable()
export class JwtService {
  constructor(
    @Inject('JwtModuleOptions') private readonly options: JwtModuleOptions,
  ) {}
  sayHello() {
    console.log('sayHello', this.options.secretKey);
  }
}
```

#### Add business logic in JwtService

```ts
import { Inject, Injectable } from '@nestjs/common';
import { compare, genSalt, hash } from 'bcrypt';

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
  async hashPassword(password): Promise<string> {
    const salt = await genSalt(10); // 10 rounds processing
    return await hash(password, salt);
  }

  async validatePassword(password, passwordHashed): Promise<boolean> {
    return await compare(password, passwordHashed);
  }
}
```

then, use it in the `UsersService` class

```ts
  async loginUser({
    email,
    password,
  }: LoginUserDto): Promise<[boolean, string?, string?]> {
    try {
      const userInDb = await this.usersRepository.findOne({ email });

      if (!userInDb) throw new Error('Invalid email/password');

      const isPasswordMatch = await this.jwtService.validatePassword(
        password,
        userInDb.password,
      );
      if (!isPasswordMatch) throw new Error('Invalid email/password');

      return [true, null, await this.jwtService.sign({ id: userInDb.id })];
    } catch (e) {
      console.error(e);
      return [false, e.message];
    }
  }
```

#### Middlewares

In nest.js, middlewares are pretty much the same as we use in Express. But you can choose to define middilewares as a class or a function.

You can define middleware as a class and implement the `NestMiddleware` interface

```ts
import { NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';

export class JwtMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: () => void) {
    const bearerHeader = req.headers['authorization'];
    if (!bearerHeader) throw new Error('Unauthorized.');

    const bearer = bearerHeader.split(' ');
    const bearerToken = bearer[1];
    console.log('bearerToken', bearerToken);
    next();
  }
}
```

Then you need to register it in a specific module, or in `app.module` to make it globally available to all modules.

previously, it was `export class AppModule {}`. To register middleware, the `AppModule` has to implement the `NestModule` interface

```ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes({
      path: 'graphql',
      method: RequestMethod.POST,
    });
  }
}
```

Note:
if you want to use the middleware for all routes and all http methods

```ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).forRoutes({
      path: '*',
      method: RequestMethod.ALL,
    });
  }
}
```

Also, We can excludes paths as well

```ts
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(JwtMiddleware).exclude({
      path: 'graphql',
      method: RequestMethod.POST,
    });
  }
}
```

The middleware can be function as well

```ts
export const jwtMiddleware = (
  req: Request,
  res: Response,
  next: () => void,
) => {
  const bearerHeader = req.headers['authorization'];
  if (!bearerHeader) throw new Error('Unauthorized.');

  const bearer = bearerHeader.split(' ');
  const bearerToken = bearer[1];
  console.log('bearerToken', bearerToken);
  next();
};
```

Or, if you want to use it globally for all routes, you can simply put in the `main.ts`, and use it like you would in Express application.

```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { jwtMiddleware } from './jwt/jwt.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(jwtMiddleware);
  await app.listen(3001);
}
bootstrap();
```

Test it:

```
{
  me {
    id
    email
  }
}
```

HTTP Headers:

```
{
  "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OSwiaWF0IjoxNjI0MDU3MTY3fQ.KkOj0wec33CN9P9FlX5Uwo4MeQKvf6B51thoRL0g-YQ"
}
```

However, if you want to inject something into the middleware, you must use class not function, and mark this class as `@Injectable`, otherwise you can't inject anything into this middleware

```ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtService } from './jwt.service';

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}
  use(req: Request, res: Response, next: () => void) {
    const bearerHeader = req.headers['authorization'];
    if (!bearerHeader) throw new Error('Unauthorized.');

    const bearer = bearerHeader.split(' ');
    const bearerToken = bearer[1];
    const decoded = this.jwtService.verify(bearerToken);
    if (typeof decoded === 'object' && 'id' in decoded) {
      console.log('decoded 1', decoded['id']);
    }
    next();
  }
}
```

Now we need to lookup the user by using `UsersService`.

```ts
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
        console.log('error', e);
        throw new Error('Unauthorized.');
      }
    }
    next();
  }
}
```

But, you will get an error, `UsersService` is not found!

This is because previously when we created the `UsersService`, we didn't export it from the `UsersModule`, like we did for `JwtService`.

We need to put it in `exports: [UsersService]` to make it available for other modules

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService, UsersResolver],
  exports: [UsersService],
})
export class UsersModule {}
```

#### Save `user` object on Graphql `context`

Now we have `req['user'] = user`, but how do we pass it to other resolvers?

Because `nest.js` is using `Apollo-server` behind the scene, and `apollo-server` has `context` in its `Schema options`.

What is `context`?
Context is an object (or a function that creates an object) that's passed to every resolver that executes for a particular operation. This enables resolvers to share helpful context, such as a database connection.

so, when defining the Graphql schema, we can save any custom value to the Graphql context, and the context will be passed to other resolvers

```ts
    GraphQLModule.forRoot({
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      context: ({ req }) => ({
        user: req['user'],
      }),
    }),
```

And we can access it from `UsersResolver`

```ts
  @Query(returns => User)
  async me(@Context() context: any): Promise<User> {
    return context.user;
  }
```

The type of context is `any`, because it can have any custom field(s), in our case, the 'user' property.

#### Auth guard

Auth guard is a function to decide if your request can continue or not.

```ts
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable } from 'rxjs';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // the context here is http context, wen can convert it to gqlContext
    const gqlContext = GqlExecutionContext.create(context).getContext();
    // the req['user'] will be now available from gqlContext
    const user = gqlContext['user'];
    return !!user; // if user is undefined then block the request
  }
}
```

Then from resolvers, you can protect an resource by using `@UseGuards()`

```ts
  @Query(returns => User)
  @UseGuards(AuthGuard, new EnvGuard('DEV'))
  async me(@Context() context: any): Promise<User> {
    return context.user;
  }
```

Similarly we can create other useful Guard, like `EnvGuard`

```ts
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
    return EnvGuard._allowedEnvs.includes(currentEnv);
  }
}
```

Then use it like

```ts
  @Query(returns => User)
  @UseGuards(AuthGuard, EnvGuard.setAllowedEnvs([NODE_ENV.DEV, NODE_ENV.SIT]))
  async me(@Context() context: any): Promise<User> {
    return context.user;
  }
```

And we can create `RoleGuard`

```ts
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
```

And use it

```ts
  @Query(returns => User)
  @UseGuards(
    AuthGuard,
    EnvGuard.setAllowedEnvs([NODE_ENV.DEV, NODE_ENV.SIT]),
    RoleGuard.setAllowedRoles([UserRole.CLIENT]),
  )
  async me(@Context() context: any): Promise<User> {
    return context.user;
  }
```

#### Create your own graphql decorator function

We can create our own Graphql decorator function like below `AuthUser` decorator function.

[Custom route decorators](https://docs.nestjs.com/custom-decorators)

```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { User } from 'src/users/entities/user.entity';

export const AuthUser = createParamDecorator(
  (data: unknown, context: ExecutionContext): User => {
    const gqlContext = GqlExecutionContext.create(context).getContext();
    return gqlContext['user'];
  },
);
```

Then use this decorator function from resolver

```ts
  @Query(returns => User)
  @UseGuards(AuthGuard, EnvGuard.setAllowedEnvs([NODE_ENV.DEV, NODE_ENV.SIT]))
  async me(@AuthUser() authUser: User): Promise<User> {
    return authUser;
  }
```
