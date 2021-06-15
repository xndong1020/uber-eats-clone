#### Entity

Entity is a class that maps to a database table (or collection when using MongoDB). You can create an entity by defining a new class and mark it with `@Entity()`:

We can use `@ObjectType()` with `@Entity()`. `@ObjectType()` is for Graphql to take, to build schema. `@Entity()` will tell typeorm to save to database.

`\src\restaurants\entities\Restaurants.entity.ts`

```ts
import { Field, ObjectType } from '@nestjs/graphql';
import { Column, Entity } from 'typeorm';

@ObjectType()
@Entity()
export class Restaurant {
  @Column()
  @Field()
  name: string;

  @Column({ type: Boolean })
  @Field(() => Boolean)
  veganOnly: boolean;

  @Column({ type: Boolean, nullable: true })
  @Field(() => Boolean, { nullable: true })
  isGood?: boolean;
}
```

But now, it didn't automatically generate the table for us. We must register this entity in typeorm

```ts
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [Restaurant],
      synchronize: true,
      logging: ['error', 'query'],
    }),
```

But now typeorm will throw an error, because we don't have a primary key for this entity

```ts
import { Field, ObjectType } from '@nestjs/graphql';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@ObjectType()
@Entity()
export class Restaurant {
  @PrimaryGeneratedColumn()
  @Field((type) => Number)
  id: number;

  @Column()
  @Field()
  name: string;

  @Column({ type: Boolean })
  @Field(() => Boolean)
  veganOnly: boolean;

  @Column({ type: Boolean, nullable: true })
  @Field(() => Boolean, { nullable: true })
  isGood?: boolean;
}
```

Now typeorm will create this table for you.

```sql
CREATE TABLE "restaurant" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "veganOn
ly" boolean NOT NULL, "isGood" boolean, CONSTRAINT "PK_649e250d8b8165cb406d99aa30f" PRIMARY KEY ("i
d"))
```

Or, you can disable synchronize from typeorm, especially for prod env.

We can use db init script

init.sql

```sql
CREATE TABLE "restaurants"
(
    "id" SERIAL NOT NULL,
    "name" character varying NOT NULL,
    "vegan_only" boolean NOT NULL,
    "is_good" boolean,
    CONSTRAINT "PK_649e250d8b8165cb406d99aa30f" PRIMARY KEY ("id")
);

INSERT INTO restaurants(name, vegan_only, is_good) VALUES
('My Restaurant', false, true),
('Your Restaurant', false, false),
('New Restaurant', true, true);
```

Note: We can't use camelcase in postgres, for example if you name the column 'isGood', then postgres will make it lowercase 'isgood'.

It is recommended to use snake case. Hence we need to modify our entity class accordingly.

```ts
import { Field, ObjectType } from '@nestjs/graphql';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@ObjectType()
@Entity()
export class Restaurant {
  @PrimaryGeneratedColumn()
  @Field((type) => Number)
  id: number;

  @Column()
  @Field()
  name: string;

  @Column({ name: 'vegan_only', type: Boolean })
  @Field(() => Boolean)
  veganOnly: boolean;

  @Column({ name: 'is_good', type: Boolean, nullable: true })
  @Field(() => Boolean, { nullable: true })
  isGood?: boolean;
}
```

#### Active Record vs Data Mapper

In TypeORM you can use both the `Active Record` and the `Data Mapper` patterns.

Using the **Active Record** approach, you define all your query methods inside the model itself, and you save, remove, and load objects using model methods.

Simply said, the Active Record pattern is an approach to access your database within your models.

Example

```js
import { BaseEntity, Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  isActive: boolean;
}
```

All active-record entities **MUST extend** the `BaseEntity` class, which provides methods to work with the entity.

BaseEntity has most of the methods of the standard Repository. Most of the time you don't need to use Repository or EntityManager with active record entities.

Example of how to work with such entity:

```js
// example how to save AR entity
const user = new User();
user.firstName = "Timber";
user.lastName = "Saw";
user.isActive = true;
await user.save();

// example how to remove AR entity
await user.remove();

// example how to load AR entities
const users = await User.find({ skip: 2, take: 5 });
const newUsers = await User.find({ isActive: true });
const timber = await User.findOne({ firstName: "T
```

Now let's say we want to create a function that returns users by first and last name. We can create such functions as a static method in a User class:

```js
import { BaseEntity, Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  isActive: boolean;

  static findByName(firstName: string, lastName: string) {
    return this.createQueryBuilder('user')
      .where('user.firstName = :firstName', { firstName })
      .andWhere('user.lastName = :lastName', { lastName })
      .getMany();
  }
}
```

And use it just like other methods:

```js
const timber = await User.findByName('Timber', 'Saw');
```

Using the **Data Mapper** approach, you define all your query methods in separate classes called "repositories", and you save, remove, and load objects using repositories. In data mapper your entities are very dumb - they just define their properties and may have some "dummy" methods.

Simply said, data mapper is an approach to access your database within repositories instead of models.

Example:

```js
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column()
  isActive: boolean;
}
```

Example of how to work with such entity:

```js
const userRepository = connection.getRepository(User);

// example how to save DM entity
const user = new User();
user.firstName = 'Timber';
user.lastName = 'Saw';
user.isActive = true;
await userRepository.save(user);

// example how to remove DM entity
await userRepository.remove(user);

// example how to load DM entities
const users = await userRepository.find({ skip: 2, take: 5 });
const newUsers = await userRepository.find({ isActive: true });
const timber = await userRepository.findOne({
  firstName: 'Timber',
  lastName: 'Saw',
});
```

Now let's say we want to create a function that returns users by first and last name. We can create such a function in a "custom repository"

```js
import { EntityRepository, Repository } from 'typeorm';
import { User } from '../entity/User';

@EntityRepository()
export class UserRepository extends Repository<User> {
  findByName(firstName: string, lastName: string) {
    return this.createQueryBuilder('user')
      .where('user.firstName = :firstName', { firstName })
      .andWhere('user.lastName = :lastName', { lastName })
      .getMany();
  }
}
```

And use it this way:

```js
const userRepository = connection.getCustomRepository(UserRepository);
const timber = await userRepository.findByName('Timber', 'Saw');
```

One thing we should always keep in mind with software development is how we are going to maintain our applications. The Data Mapper approach helps with maintainability, which is more effective in bigger apps. The Active record approach helps keep things simple which works well in smaller apps. And simplicity is always a key to better maintainability.

Using **Data Mapper approach** we can inject the repository, hence it is easier to mock and test.

#### Injecting The Repository

Step 1: Create a service class, and use `@Injectable` decorator, so it can be injected into other classes.

```ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class RestaurantService {}
```

Step 2: Register this service in `restaurants.module.ts`, both in `imports` and `providers`

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Restaurant } from './entities/Restaurants.entity';
import { RestaurantResolver } from './restaurants.resolver';
import { RestaurantService } from './restaurants.service';

@Module({
  imports: [TypeOrmModule.forFeature([Restaurant])],
  providers: [RestaurantResolver, RestaurantService],
})
export class RestaurantsModule {}
```

Step 3: Inject this service class into `RestaurantResolver`

```ts
import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { QueryRestaurantDto } from './dtos/QueryRestaurant.dto';
import { Restaurant } from './entities/Restaurants.entity';
import { RestaurantService } from './restaurants.service';

@Resolver(() => Restaurant)
export class RestaurantResolver {
  constructor(private readonly restaurantService: RestaurantService) {}
}
```

Step 4: Inject `Repository<Restaurant>` into `RestaurantService`, by using `@InjectRepository(<EntityClass>)` decorator. Then you can start using methods provided by `Repository<Restaurant>`.

Basically, `@InjectRepository(<EntityClass>)` is doing `const userRepository = connection.getRepository(<EntityClass>);`

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from './entities/Restaurants.entity';

@Injectable()
export class RestaurantService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantsRepository: Repository<Restaurant>,
  ) {}

  async getAll(filters: Partial<Restaurant>): Promise<Restaurant[]> {
    return await this.restaurantsRepository.find({ ...filters });
  }
}
```

From our resolver `RestaurantResolver` class, we can start using the logic from `RestaurantService`

```ts
import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { CreateRestaurantDto } from './dtos/CreateRestaurant.dto';
import { QueryRestaurantDto } from './dtos/QueryRestaurant.dto';
import { Restaurant } from './entities/Restaurants.entity';
import { RestaurantService } from './restaurants.service';

@Resolver(() => Restaurant)
export class RestaurantResolver {
  constructor(private readonly restaurantService: RestaurantService) {}
  @Query(() => [Restaurant])
  async getRestaurants(
    @Args('filters') filters: QueryRestaurantDto,
  ): Promise<Restaurant[]> {
    return await this.restaurantService.getAll(filters);
  }
}
```

And `QueryRestaurantDto`

```ts
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional } from 'class-validator';

@InputType()
export class QueryRestaurantDto {
  @Field({ nullable: true })
  @IsOptional()
  name?: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  veganOnly?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  isGood?: boolean;
}
```

Query will be

```gql
query getRestaurants($filters: QueryRestaurantDto!) {
  getRestaurants(filters: $filters) {
    id
    name
    veganOnly
    isGood
  }
}
```

Query Variables can be

```
{
  "filters": {}
}
```

And query result

```json
{
  "data": {
    "getRestaurants": [
      {
        "id": 1,
        "name": "My Restaurant",
        "veganOnly": false,
        "isGood": true
      },
      {
        "id": 2,
        "name": "Your Restaurant",
        "veganOnly": false,
        "isGood": false
      },
      {
        "id": 3,
        "name": "New Restaurant",
        "veganOnly": true,
        "isGood": true
      }
    ]
  }
```

or query variable

```
{
  "filters": {
    "veganOnly": false
  }
}
```

result

```json
{
  "data": {
    "getRestaurants": [
      {
        "id": 1,
        "name": "My Restaurant",
        "veganOnly": false,
        "isGood": true
      },
      {
        "id": 2,
        "name": "Your Restaurant",
        "veganOnly": false,
        "isGood": false
      }
    ]
  }
}
```

#### Creating new entity

Since we have a separate DTO class for the `Restaurant` entity class, we can do

CreateRestaurant.dto.ts

```ts
import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

@InputType()
export class CreateRestaurantDto {
  @Field()
  @IsString()
  @Length(5, 10)
  name: string;

  @Field(() => Boolean)
  @IsBoolean()
  veganOnly: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  isGood?: boolean;
}
```

And in our service

```ts
  async createRestaurant(
    createRestaurantDto: CreateRestaurantDto,
  ): Promise<Restaurant> {
    // because the schema of CreateRestaurantDto and Restaurant are the same
    const newRestaurant = this.restaurantsRepository.create(
      createRestaurantDto,
    );
    return await this.restaurantsRepository.save(newRestaurant);
  }
```

in our resolver class:

```ts
@Mutation(() => Restaurant)
  async createRestaurant(
    @Args('newRestaurant') newRestaurant: CreateRestaurantDto,
  ): Promise<Restaurant> {
    return await this.restaurantService.createRestaurant(newRestaurant);
  }
```

And it is working fine.

```gql
mutation createRestaurant($newRestaurant: CreateRestaurantDto!) {
  createRestaurant(newRestaurant: $newRestaurant) {
    id
    name
    veganOnly
    isGood
  }
}
```

Query Variables

```
{
  "newRestaurant": {
    "name": "ne222",
    "veganOnly": true,
    "isGood": false
  }
}
```

Response

```json
{
  "data": {
    "createRestaurant": {
      "id": 5,
      "name": "ne222",
      "veganOnly": true,
      "isGood": false
    }
  }
}
```

However, the problem with this approach is, if we change anything from the entity class, we also need to change the schema from the dto class accordingly.

What we can do is, nest.js provides us with `OmitType`, which can extend a base class, and omit some field from the base class. nest.js also has `PickType`, `PartialType`, `IntersectionType`.
[Mapped types](https://docs.nestjs.com/openapi/mapped-types#composition)

Note: in our case, the 3nd argument of `OmitType` is `InputType`, this is because the base class `Restaurant` is an `ObjectType` not a `InputType`, but the `CreateRestaurantDto` class needs to be a `InputType`.

The `OmitType` function accept a 3nd argument, to change the type of base class to `InputType` when inheriting from the base class.

```ts
import { InputType, OmitType } from '@nestjs/graphql';
import { Restaurant } from '../entities/Restaurants.entity';

@InputType()
export class CreateRestaurantDto extends OmitType(
  Restaurant,
  ['id'],
  InputType,
) {}
```

Now we need to move the class validation logic to the base class, which is the `Restaurant` class

Restaurants.entity.ts

```ts
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@ObjectType()
@Entity({ name: 'restaurants' })
export class Restaurant {
  @PrimaryGeneratedColumn()
  @Field(() => Int)
  id: number;

  @Column()
  @Field()
  @IsString()
  @Length(5, 10)
  name: string;

  @Column({ name: 'vegan_only', type: Boolean })
  @Field(() => Boolean)
  @IsBoolean()
  veganOnly: boolean;

  @Column({ name: 'is_good', type: Boolean, nullable: true })
  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  isGood?: boolean;
}
```

Or, if you don't want to use the 3nd argument `InputType` from `OmitType` function, you can add `@InputType({ isAbstract: true })` to the `Restaurants` entity class, to make the `InputType` decorator becomes abstract, which means the `InputType` decorator only works when the `Restaurants` class is extended by other classes.

Restaurants.entity.ts

```ts
import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@InputType({ isAbstract: true })
@ObjectType()
@Entity({ name: 'restaurants' })
export class Restaurant {
  @PrimaryGeneratedColumn()
  @Field(() => Int)
  id: number;

  @Column()
  @Field()
  @IsString()
  @Length(5, 10)
  name: string;

  @Column({ name: 'vegan_only', type: Boolean })
  @Field(() => Boolean)
  @IsBoolean()
  veganOnly: boolean;

  @Column({ name: 'is_good', type: Boolean, nullable: true })
  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isGood?: boolean;
}
```

And the dto class don't need the `InputType` argument any more.

```ts
import { InputType, OmitType } from '@nestjs/graphql';
import { Restaurant } from '../entities/Restaurants.entity';

@InputType()
export class CreateRestaurantDto extends OmitType(Restaurant, ['id']) {}
```

Source code of `MappedTypes` from `@nestjs/graphql` can be found [here](https://github.com/nestjs/graphql/tree/master/lib/type-helpers)

#### Default value for Field

```ts
import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@InputType({ isAbstract: true })
@ObjectType()
@Entity({ name: 'restaurants' })
export class Restaurant {
  @PrimaryGeneratedColumn()
  @Field(() => Int)
  id: number;

  @Column()
  @Field()
  @IsString()
  @Length(5, 10)
  name: string;

  @Column({ name: 'vegan_only', type: Boolean })
  @Field(() => Boolean)
  @IsBoolean()
  veganOnly: boolean;

  @Column({ name: 'is_good', type: Boolean, nullable: true })
  @Field(() => Boolean, { nullable: true, defaultValue: false })
  @IsOptional()
  @IsBoolean()
  isGood?: boolean;
}
```

And from the generated schema file

```gql
input CreateRestaurantDto {
  name: String!
  veganOnly: Boolean!
  isGood: Boolean = false
}
```

#### Update

Firstly, we need a input type for updating. However, this dto type can have any optional field from `Restaurant`, but MUST have a `id`.

Hence we create a intersection type of `id` from `Restaurant`, and optional fields from `CreateRestaurantDto`.

Note: must be Partial from `CreateRestaurantDto`, `not Restaurant`, otherwise the 'id' field will be optional too.

UpdateRestaurant.dto.ts

```ts
import {
  InputType,
  IntersectionType,
  PartialType,
  PickType,
} from '@nestjs/graphql';
import { Restaurant } from '../entities/Restaurants.entity';
import { CreateRestaurantDto } from './CreateRestaurant.dto';

// the update dto type MUST have a id
@InputType()
export class UpdateRestaurantDto extends IntersectionType(
  PickType(Restaurant, ['id'] as const),
  // must be Partial from CreateRestaurantDto, not Restaurant, otherwise the 'id' field will be optional too.
  PartialType(CreateRestaurantDto),
) {}
```

Now check the generated schema file:

```gql
input UpdateRestaurantDto {
  id: Int!
  name: String
  veganOnly: Boolean
  isGood: Boolean = false
}
```

and in our service

```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, UpdateResult } from 'typeorm';

import { CreateRestaurantDto } from './dtos/CreateRestaurant.dto';
import { UpdateRestaurantDto } from './dtos/UpdateRestaurant.dto';
import { Restaurant } from './entities/Restaurants.entity';

@Injectable()
export class RestaurantService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantsRepository: Repository<Restaurant>,
  ) {}

  async getAll(filters: Partial<Restaurant>): Promise<Restaurant[]> {
    return await this.restaurantsRepository.find({ ...filters });
  }

  async createRestaurant(
    createRestaurantDto: CreateRestaurantDto,
  ): Promise<Restaurant> {
    // because the schema of CreateRestaurantDto and Restaurant are the same
    const newRestaurant =
      this.restaurantsRepository.create(createRestaurantDto);
    return await this.restaurantsRepository.save(newRestaurant);
  }

  async updateRestaurant(
    updateRestaurantDto: UpdateRestaurantDto,
  ): Promise<UpdateResult> {
    return await this.restaurantsRepository.update(
      { id: updateRestaurantDto.id },
      updateRestaurantDto,
    );
  }
}
```

And resolver:

```ts
@Mutation(() => Number)
  async updateRestaurant(
    @Args('updateRestaurant') updateRestaurant: UpdateRestaurantDto,
  ): Promise<number> {
    return await (
      await this.restaurantService.updateRestaurant(updateRestaurant)
    )?.affected;
  }
```

Query

```
mutation updateRestaurant($updateRestaurant: UpdateRestaurantDto!) {
  updateRestaurant(updateRestaurant:$updateRestaurant)
}
```

Query Variables

```
{
  "updateRestaurant": {
    "id": 6,
    "name": "newname 11"
  }
}
```

Result:

```json
{
  "data": {
    "updateRestaurant": 1
  }
}
```

Or, if we want to get the updated Restaurant entity object, rather than affectedRows. We can do

```ts
  async updateRestaurant(
    updateRestaurantDto: UpdateRestaurantDto,
  ): Promise<Restaurant> {
    const restaurantInDb = await this.restaurantsRepository.findOneOrFail({
      id: updateRestaurantDto.id,
    });

    const updated = { ...restaurantInDb, ...updateRestaurantDto };
    return this.restaurantsRepository.save(updated);
  }
```

and in your resolver

```ts
  @Mutation(() => Restaurant)
  async updateRestaurant(
    @Args('updateRestaurant') updateRestaurant: UpdateRestaurantDto,
  ): Promise<Restaurant> {
    return await this.restaurantService.updateRestaurant(updateRestaurant);
  }
```

Query

```
mutation updateRestaurant($updateRestaurant: UpdateRestaurantDto!) {
  updateRestaurant(updateRestaurant:$updateRestaurant) {
    id
    name
    veganOnly
    isGood
  }
}
```

Query Variables

```
{
  "updateRestaurant": {
    "id": 6,
    "name": "newname 3"
  }
}
```

result:

```json
{
  "data": {
    "updateRestaurant": {
      "id": 6,
      "name": "newname 3",
      "veganOnly": true,
      "isGood": false
    }
  }
}
```
