#### Create an `Verification` Entity

We create a new entity class `Verification`

```ts
import { Field, ObjectType } from '@nestjs/graphql';
import { IsString } from 'class-validator';
import { CoreEntity } from 'src/common/entities/core.entity';
import { Column, Entity, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@ObjectType()
@Entity()
export class Verification extends CoreEntity {
  @Column()
  @Field()
  @IsString()
  code: string;

  @OneToOne((type) => User)
  @JoinColumn()
  user: User;
}
```

### One-to-one relations

One-to-one is a relation where A contains only one instance of B, and B contains only one instance of A.

### @JoinColumn options

@JoinColumn not only defines which side of the relation contains the join column with a foreign key, but also allows you to customize join column name and referenced column name.

When we set @JoinColumn, it automatically creates a column in the database named `propertyName` + `referencedColumnName`. In our example, This code will create a `userId` column in the database. If you want to change this name in the database you can specify a custom join column name:

```ts
  @OneToOne(type => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
```

By default your relation always refers to the **primary column of the related entity**. If you want to create relation with other columns of the related entity - you can specify them in @JoinColumn as well:

```ts
  @OneToOne(type => User)
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user: User;
```

Once we have a new entity, we MUST register it with typeorm

app.module.ts

```ts
TypeOrmModule.forRoot({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: +process.env.DB_PORT,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [User, Verification],
  synchronize: false,
  logging: ['error', 'query'],
});
```

#### `Verification` repository

We need to register it to `UsersModule`, before we can inject it as a service into `UsersService`.

`users.module.ts`

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Verification } from './entities/verification.entity';
import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Verification])],
  providers: [UsersService, UsersResolver],
  exports: [UsersService],
})
export class UsersModule {}
```

Then we can inject `Verification` repository to `UsersService`

```ts
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Verification)
    private readonly verificationRepository: Repository<Verification>,
    private readonly jwtService: JwtService,
  ) {}
  ...
}
```

Add verification logic in `createUser`

```ts
  async createUser(newUserDto: CreateUserDto): Promise<QueryResult> {
    try {
      const userInDb = await this.usersRepository.findOne({
        email: newUserDto.email,
      });

      if (userInDb) throw new Error('Email already registered');

      const newUser = this.usersRepository.create(newUserDto);
      await this.usersRepository.save(newUser);

      const verification = this.verificationRepository.create({
        user: newUser,
      });
      await this.verificationRepository.save(verification);

      return [true];
    } catch (e) {
      console.error('error', e);
      return [false, e.message];
    }
  }
```

And we add random code generation logic in `Verification` class

```ts
import { Field, ObjectType } from '@nestjs/graphql';
import { v4 as uuid } from 'uuid';
import { IsString } from 'class-validator';
import { CoreEntity } from 'src/common/entities/core.entity';
import { BeforeInsert, Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { User } from './user.entity';

@ObjectType()
@Entity()
export class Verification extends CoreEntity {
  @Column()
  @Field()
  @IsString()
  code: string;

  @OneToOne((type) => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @BeforeInsert()
  generateVerificationCode(): void {
    this.code = uuid();
  }
}
```

Behind the scene, it insert `user_id` in `verification` table

```sql
INSERT INTO "verification"("createdAt", "updatedAt", "code", "user_id") VALUES (DEFAULT, DEF
AULT, $1, $2) RETURNING "id", "createdAt", "updatedAt"
-- PARAMETERS: ["b9253e97-7b7d-460c-8608-7779fdc8a25b",3]
```

#### Transaction in UsersService

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';
import { CreateUserDto } from './dtos/create-user.dto';
import { LoginUserDto } from './dtos/login-user.dto';
import { User } from './entities/user.entity';
import { JwtService } from 'src/jwt/jwt.service';
import { SearchUserFilters } from './interfaces/search-user-filters.interface';
import { UpdateUserDto } from './dtos/update-user.dto';
import { Verification } from './entities/verification.entity';

type QueryResult = [boolean, string?];

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Verification)
    private readonly verificationRepository: Repository<Verification>,

    private readonly connection: Connection,
    private readonly jwtService: JwtService,
  ) {}

  ...

  async verifyEmail(verificationCode: string): Promise<QueryResult> {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const verificationRecord = await this.verificationRepository.findOneOrFail(
        {
          code: verificationCode,
        },
        { relations: ['user'] },
      );

      const userInDb = await this.usersRepository.findOneOrFail({
        id: verificationRecord.user.id,
      });

      userInDb.verified = true;

      try {
        await queryRunner.manager.save<User>(userInDb);
        await queryRunner.manager.delete<Verification>(Verification, {
          code: verificationCode,
        });

        await queryRunner.commitTransaction();
        return [true];
      } catch (e) {
        console.error('error', e);
        await queryRunner.rollbackTransaction();
        return [false, e.message];
      } finally {
        // you need to release a queryRunner which was manually instantiated
        await queryRunner.release();
      }
    } catch (e) {
      console.error('error', e);
      return [false, e.message];
    }
  }
}

```

We firstly inject `private readonly connection: Connection` into constructor, then use

```ts
const queryRunner = this.connection.createQueryRunner();
await queryRunner.connect();
await queryRunner.startTransaction();
```

to start a transaction.

#### Select columns from an entity

We can specify if a column is always selected by `QueryBuilder` and `find` operations. Default value is "true". If we use `@Column({ select: false })` then by default, it is not returned from `QueryBuilder` and `find` operations.

```ts
  @Field()
  @Column({ select: false })
  @IsString()
  @Length(6, 10)
  password: string;
```

Later we we need the `password` from `find` operations, we can do

```ts
const userInDb = await this.usersRepository.findOneOrFail(
  {
    id: verificationRecord.user.id,
  },
  { select: ['password', 'email', 'role'] },
);
```

#### One-to-one relationship

The relation we defined in `Verification` class is unidirectional

```ts
  @OneToOne(type => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
```

Which means a verification object contains a `user` property.

We can define bidirectional one-to-one relationship

`Verification` entity class

```ts
  @OneToOne(
    type => User,
    user => user.verification, // specify inverse side as a second parameter
  )
  @JoinColumn({ name: 'user_id' })
  user: User;
```

And because `@JoinColumn` is at the `Verification` entity class side, which means `Verification` entity class will have the foreign key column `user_id`.

`User` entity class

```ts
  @OneToOne(
    type => Verification,
    verification => verification.user, // specify inverse side as a second parameter
  )
  verification: Verification;
```
