#### Create user module

Firstly, generate `users` module and `common` module using cli

```
nest g mo users
nest g mo common
```

Within `common` module, add common entity class, which will be a base class for most of our entity classes.

```ts
import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class CoreEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

within `user` module, add User entity class

```ts
import { CoreEntity } from 'src/common/entities/core.entity';
import { Column, Entity } from 'typeorm';

type UserRole = 'client' | 'owner' | 'delivery';

@Entity({ name: 'users' })
export class User extends CoreEntity {
  @Column()
  email: string;

  @Column()
  password: string;

  @Column()
  role: UserRole;
}
```

And register the `User` entity class to app.module.ts

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
    UsersModule,
    CommonModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

and modify the init.sql

```sql
DROP TABLE IF EXISTS "users";

CREATE TABLE "users"
(
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    "email" character varying NOT NULL,
    "password" character varying NOT NULL,
    "role" character varying NOT NULL,
    CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id")
);

INSERT INTO "users"(email, password, role) VALUES
('Jeremy Gu', '1234', 'owner'),
('Nicole Dong', '5678', 'owner');
```

#### User Resolver and Service

Step 2: Create a `UsersService` service class

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async getAll(): Promise<User[]> {
    return this.usersRepository.find({});
  }
}
```

Step 2: Create a `UsersResolver` resolver class

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async getAll(): Promise<User[]> {
    return this.usersRepository.find({});
  }
}
```

Step 3: Register in users.module.ts

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

Step 4: Add `ObjectType` and `Field` decorators to entity classes, so Graphql can recognize

```ts
import { Field, ObjectType } from '@nestjs/graphql';
import { IsEmail, IsString, Length } from 'class-validator';
import { CoreEntity } from 'src/common/entities/core.entity';
import { Column, Entity } from 'typeorm';

type UserRole = 'client' | 'owner' | 'delivery';

@ObjectType()
@Entity({ name: 'users' })
export class User extends CoreEntity {
  @Field()
  @Column()
  @IsEmail()
  email: string;

  @Field()
  @Column()
  @IsString()
  @Length(6, 10)
  password: string;

  @Field()
  @Column()
  @IsString()
  role: UserRole;
}
```

and the base entity class.

Note: We add `@ObjectType({ isAbstract: true })` to make it abstract.

```ts
import { Field, ObjectType } from '@nestjs/graphql';
import {
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@ObjectType({ isAbstract: true })
@Entity()
export class CoreEntity {
  @PrimaryGeneratedColumn()
  @Field()
  id: number;

  @CreateDateColumn()
  @Field({ nullable: true })
  createdAt: Date;

  @UpdateDateColumn()
  @Field({ nullable: true })
  updatedAt: Date;
}
```

The auto-generated schema file

```gql
# ------------------------------------------------------
# THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
# ------------------------------------------------------

type User {
  id: Float!
  createdAt: DateTime!
  updatedAt: DateTime!
  email: String!
  password: String!
  role: String!
}

"""
A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format.
"""
scalar DateTime

type Query {
  getUsers: [User!]!
}
```

Test with a query

```
{
  getUsers {
    email
    createdAt
  }
}
```

result

```json
{
  "data": {
    "getUsers": [
      {
        "email": "User A",
        "createdAt": "2021-06-15T04:34:35.727Z"
      },
      {
        "email": "User B",
        "createdAt": "2021-06-15T04:34:35.727Z"
      }
    ]
  }
}
```

#### Add mutations

1. Create input/dto and output/response class

`CreateUserDto`

```ts
import { InputType, PickType } from '@nestjs/graphql';
import { User } from '../entities/user.entity';

@InputType()
export class CreateUserDto extends PickType(User, [
  'email',
  'password',
  'role',
] as const) {}
```

`CreateUserResponse`

```ts
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CreateUserResponse {
  @Field({ nullable: true })
  error?: string;

  @Field((type) => Boolean)
  ok: boolean;
}
```

2. Create User Service class

`UsersService`

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dtos/create-user.dto';
import { CreateUserResponse } from './dtos/create-user.response';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async getAll(): Promise<User[]> {
    return this.usersRepository.find({});
  }

  async createUser(newUser: CreateUserDto): Promise<CreateUserResponse> {
    try {
      await this.usersRepository.save(newUser);
      return { ok: true };
    } catch (e) {
      console.error(e);
      return { error: e.message, ok: false };
    }
  }
}
```

3. Create `UsersResolver` resolver class

```ts
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CreateUserDto } from './dtos/create-user.dto';
import { CreateUserResponse } from './dtos/create-user.response';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

@Resolver((of) => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query((returns) => [User])
  async getUsers(): Promise<User[]> {
    return await this.usersService.getAll();
  }

  @Mutation((returns) => CreateUserResponse)
  async createUser(
    @Args('newUser') newUser: CreateUserDto,
  ): Promise<CreateUserResponse> {
    return this.usersService.createUser(newUser);
  }
}
```

4. Test query

```
mutation createUser($newUser: CreateUserDto!) {
  createUser(newUser:$newUser) {
    ok
    error
  }
}
```

Query Variables

```
{
  "newUser": {
    "email": "1@test.com",
    "password": "334132131",
    "role": "client"
  }
}
```

Result

```json
{
  "data": {
    "createUser": {
      "ok": true,
      "error": null
    }
  }
}
```

#### Create & user enum

Previously, we have a type `UserRole` as `type UserRole = 'client' | 'owner' | 'delivery';` Now we convert it to an enum

Step 1: Define the enum

```ts
enum UserRole {
  CLIENT = 'client',
  OWNER = 'owner',
  DELIVERY = 'delivery',
}
```

Step 2: use enum type for the `role` column

```ts
  @Field()
  @Column({ type: 'enum', enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;
```

Step 3: Now if you look at the `@Field` decorator, in Graphql, the data type of `role` is still string. If you change it to `UserRole` as return type, you will get an error, because we need to register this enum with Graphql, so Graphql will recognize it.

```ts
registerEnumType(UserRole, { name: 'UserRole' });
```

Then you can mark the Graphql type as `UserRole`

```ts
  @Field(type => UserRole)
  @Column({ type: 'enum', enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;
```

Now if you look at the auto-generated schema file

```gql
type User {
  id: Float!
  createdAt: DateTime
  updatedAt: DateTime
  email: String!
  password: String!
  role: UserRole!
}

enum UserRole {
  CLIENT
  OWNER
  DELIVERY
}
```

Now if you test the mutation `createUser`, you can't pass `client` or `owner` or `delivery` to `role` field. The value has to be a value in the `UserRole` enum, namely `CLIENT`, `OWNER` OR `DELIVERY`.

```
"errors": [
      {
        "message": "Variable \"$newUser\" got invalid value \"client\" at \"newUser.role\"; Value \"client\" does not exist in \"UserRole\" enum. Did you mean the enum value \"CLIENT\"?"]
```

Correct Query Parameters

```
{
  "newUser": {
    "email": "1@test.com",
    "password": "334132131",
    "role": "CLIENT"
  }
}
```

#### Check if email is already in use

in `UsersService`class

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dtos/create-user.dto';
import { CreateUserResponse } from './dtos/create-user.response';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async getAll(): Promise<User[]> {
    return this.usersRepository.find({});
  }

  async createUser(newUserDto: CreateUserDto): Promise<CreateUserResponse> {
    try {
      const userInDb = await this.usersRepository.findOne({
        email: newUserDto.email,
      });

      if (userInDb) throw new Error('Email already registered');

      const newUser = this.usersRepository.create(newUserDto);
      await this.usersRepository.save(newUser);
      return { ok: true };
    } catch (e) {
      console.error(e);
      return { error: e.message, ok: false };
    }
  }
}
```

query result for register email

```json
{
  "data": {
    "createUser": {
      "ok": false,
      "error": "Email already registered"
    }
  }
}
```

#### Create user refactor

For `createUser` method, instead of returning `CreateUserResponse`, we return `Promise<string | undefined>`, hence this method is more generic, and can be used in different resolvers/other services.

```ts
  async createUser(newUserDto: CreateUserDto): Promise<string | undefined> {
    try {
      const userInDb = await this.usersRepository.findOne({
        email: newUserDto.email,
      });

      if (userInDb) throw new Error('Email already registered');

      const newUser = this.usersRepository.create(newUserDto);
      await this.usersRepository.save(newUser);
      return;
    } catch (e) {
      console.error('error', e);
      return e.message;
    }
  }
```

And the resolver will become

```ts
  @Mutation(returns => CreateUserResponse)
  async createUser(
    @Args('newUser') newUser: CreateUserDto,
  ): Promise<CreateUserResponse> {
    const error = await this.usersService.createUser(newUser);
    if (error) return { error, ok: false };

    return { ok: true };
  }
```

Or, we can user tuple as the return type for `createUser`

```ts
  async createUser(newUserDto: CreateUserDto): Promise<[boolean, string?]> {
    try {
      const userInDb = await this.usersRepository.findOne({
        email: newUserDto.email,
      });

      if (userInDb) throw new Error('Email already registered');

      const newUser = this.usersRepository.create(newUserDto);
      await this.usersRepository.save(newUser);
      return [true];
    } catch (e) {
      console.error('error', e);
      return [false, e.message];
    }
  }
```

and the resolver becomes

```ts
  @Mutation(returns => CreateUserResponse)
  async createUser(
    @Args('newUser') newUser: CreateUserDto,
  ): Promise<CreateUserResponse> {
    const [ok, error] = await this.usersService.createUser(newUser);
    return { ok, error };
  }
```

#### Use Typeorm' Entity Listener to hash password

Typeorm documentation: [Entity Listeners and Subscribers](https://typeorm.io/#/listeners-and-subscribers)

What we need is the `@beforeInsert` listener

Firstly install the package for hashing password

```
yarn add bcrypt
yarn add -D @types/bcrypt
```

Then add the `@BeforeInsert` entity listener to `User` entity class

```ts
import {
  Field,
  InputType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import { BeforeInsert, Column, Entity } from 'typeorm';
import { genSalt, hash } from 'bcrypt';
import { IsEmail, IsEnum, IsString, Length } from 'class-validator';
import { CoreEntity } from 'src/common/entities/core.entity';

enum UserRole {
  CLIENT = 'client',
  OWNER = 'owner',
  DELIVERY = 'delivery',
}

registerEnumType(UserRole, { name: 'UserRole' });

@InputType({ isAbstract: true })
@ObjectType()
@Entity({ name: 'users' })
export class User extends CoreEntity {
  @Field()
  @Column()
  @IsEmail()
  email: string;

  @Field()
  @Column()
  @IsString()
  @Length(6, 10)
  password: string;

  @Field((type) => UserRole)
  @Column({ type: 'enum', enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;

  @BeforeInsert()
  async hashPassword() {
    const salt = await genSalt(10); // do 10 rounds
    this.password = await hash(this.password, salt);
  }
}
```

#### Log in

Firstly, we will return { ok, error } from `loginUser` as well. Hence we can extract it to a base class for other response classes

common/dtos/core.response.ts

```ts
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType({ isAbstract: true })
export class CoreResponse {
  @Field({ nullable: true })
  error?: string;

  @Field((type) => Boolean)
  ok: boolean;
}
```

And other response classes can inherit it

```ts
import { ObjectType } from '@nestjs/graphql';
import { CoreResponse } from 'src/common/dtos/core.response';

@ObjectType()
export class CreateUserResponse extends CoreResponse {}
```

Same for `LoginUserResponse`

```ts
import { ObjectType } from '@nestjs/graphql';
import { CoreResponse } from 'src/common/dtos/core.response';

@ObjectType()
export class LoginUserResponse extends CoreResponse {}
```

And `LoginUserDto` as InputType

```ts
import { InputType, PickType } from '@nestjs/graphql';
import { User } from '../entities/user.entity';

@InputType()
export class LoginUserDto extends PickType(User, [
  'email',
  'password',
] as const) {}
```

Now we can write our `loginUser` method is `UsersService`.

Note: we can extract the tuple `[boolean, string?]` to a type `type QueryResult = [boolean, string?];`

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { compare } from 'bcrypt';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dtos/create-user.dto';
import { LoginUserDto } from './dtos/login-user.dto';
import { User } from './entities/user.entity';

type QueryResult = [boolean, string?];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  [... other methods]

  async loginUser({ email, password }: LoginUserDto): Promise<QueryResult> {
    try {
      const userInDb = await this.usersRepository.findOne({ email });

      if (!userInDb) throw new Error('Invalid email/password');

      const isPasswordMatch = await compare(password, userInDb.password);
      if (!isPasswordMatch) throw new Error('Invalid email/password');

      return [true];
    } catch (e) {
      console.error(e);
      return [false, e.message];
    }
  }
}

```

And resolver use it like below:

```ts
  @Mutation(returns => LoginUserResponse)
  async loginUser(
    @Args('loginUser') loginUser: LoginUserDto,
  ): Promise<LoginUserResponse> {
    const [ok, error] = await this.usersService.loginUser(loginUser);
    return { ok, error };
  }
```

Also we can extract the password hashing logic to a separate util class in common module.

common/utils/password-helper.util.ts

```ts
import { compare, genSalt, hash } from 'bcrypt';

export class PasswordHelper {
  static async hashPassword(password): Promise<string> {
    const salt = await genSalt(10); // 10 rounds processing
    return await hash(password, salt);
  }

  static async validatePassword(password, passwordHashed): Promise<boolean> {
    return await compare(password, passwordHashed);
  }
}
```

Then use it in the `@BeforeInsert` entity listener from `User` entity class

```ts
  @BeforeInsert()
  async hashPassword() {
    this.password = await PasswordHelper.hashPassword(this.password);
  }
```

And in the `UsersService`

```ts
  async loginUser({ email, password }: LoginUserDto): Promise<QueryResult> {
    try {
      const userInDb = await this.usersRepository.findOne({ email });

      if (!userInDb) throw new Error('Invalid email/password');

      const isPasswordMatch = await PasswordHelper.validatePassword(
        password,
        userInDb.password,
      );
      if (!isPasswordMatch) throw new Error('Invalid email/password');

      return [true];
    } catch (e) {
      console.error(e);
      return [false, e.message];
    }
  }
```

Lastly, the `loginUser` method should return token if login is successful.

the `LoginUserResponse` class add `Field` token

```ts
import { Field, ObjectType } from '@nestjs/graphql';
import { CoreResponse } from 'src/common/dtos/core.response';

@ObjectType()
export class LoginUserResponse extends CoreResponse {
  @Field({ nullable: true })
  token?: string;
}
```

```ts
  async loginUser({
    email,
    password,
  }: LoginUserDto): Promise<[boolean, string?, string?]> {
    try {
      const userInDb = await this.usersRepository.findOne({ email });

      if (!userInDb) throw new Error('Invalid email/password');

      const isPasswordMatch = await PasswordHelper.validatePassword(
        password,
        userInDb.password,
      );
      if (!isPasswordMatch) throw new Error('Invalid email/password');

      return [true, null, 'lalala']; // lalala is the mock token atm
    } catch (e) {
      console.error(e);
      return [false, e.message];
    }
  }
```

and the resolver

```ts
  @Mutation(returns => LoginUserResponse)
  async loginUser(
    @Args('loginUser') loginUser: LoginUserDto,
  ): Promise<LoginUserResponse> {
    const [ok, error, token] = await this.usersService.loginUser(loginUser);
    return { ok, error, token };
  }
```

Test query

```
mutation loginUser($loginUser: LoginUserDto!) {
  loginUser(loginUser:$loginUser) {
    error
    ok
    token
  }
}
```

Query Variables

```
{
  "loginUser": {
    "email": "10@test.com",
    "password": "334132131"
  }
}
```

Query result

```json
{
  "data": {
    "loginUser": {
      "error": null,
      "ok": true,
      "token": "lalala"
    }
  }
}
```
