#### First module

`app.module.ts`. Eventually everything has to be imported into app.module.ts

```ts
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

Now add GraphQL module

`app.module.ts`

```ts
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';

@Module({
  imports: [GraphQLModule.forRoot()],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

Basically `GraphQLModule.forRoot()` is the same as `const server = new ApolloServer({ typeDefs, resolvers });` We just create a Apollo Server in nest.js way.

Now you will see an error `Error: Apollo Server requires either an existing schema, modules or typeDefs`. This is because missing typeDefs and resolvers.

#### Schema first vs Code first

In nest.js there are 2 ways. [code first](https://docs.nestjs.com/graphql/quick-start#code-first) or [schema first](https://docs.nestjs.com/graphql/quick-start#schema-first)

schema first: You need to write your schema files (.gql files)
code first: you only need to write resolvers, and nest.js will generate schema file for you.

`app.module.ts`

```ts
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'path';

@Module({
  imports: [
    GraphQLModule.forRoot({
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

Now you will see a different error: `Query root type must be provided.` which means it is looking for queries and resolvers, and couldn't find.

For now, let's create a simple module `Restaurants`

```
nest g mo Restaurants
```

This will generate a new module `Restaurants`

src/restaurants/restaurants.module.ts

```ts
import { Module } from '@nestjs/common';

@Module({})
export class RestaurantsModule {}
```

#### First Resolver

Then we create a simple resolver under `src/restaurants`

src/restaurants/restaurants.resolver.ts

```ts
import { Resolver, Query } from '@nestjs/graphql';

@Resolver()
export class RestaurantResolver {
  @Query(() => Boolean)
  isPizzaGood(): boolean {
    return true;
  }
}
```

Then import this resolver from `src/restaurants/restaurants.module.ts`

```ts
import { Module } from '@nestjs/common';
import { RestaurantResolver } from './restaurants.resolver';

@Module({
  providers: [RestaurantResolver],
})
export class RestaurantsModule {}
```

then rest.js will automatically generate a `schema.gql` under root folder

```gql
# ------------------------------------------------------
# THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
# ------------------------------------------------------

type Query {
  isPizzaGood: Boolean!
}
```

Now if you goto `http://localhost:3001/graphql`

```
query {
  isPizzaGood
}
```

and result

```
{
  "data": {
    "isPizzaGood": true
  }
}
```

#### ObjectTypes

Return a object type

In JavaScript, the fundamental way that we group and pass around data is through objects. In TypeScript, we represent those through `object types`.

Now we add an entity class

src/restaurants/entities/restaurants.entity.ts

```ts
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Restaurant {
  @Field()
  name: string;

  @Field(() => Boolean, { nullable: true })
  isGood?: boolean;
}
```

And we use this object from the resolver

```ts
import { Resolver, Query } from '@nestjs/graphql';
import { Restaurant } from './entities/restaurants.entity';

@Resolver(() => Restaurant)
export class RestaurantResolver {
  @Query(() => Restaurant)
  getMyRestaurant(): Restaurant {
    return { name: 'My Restaurant', isGood: true };
  }
}
```

Now look at the auto-generated schema

```gql
# ------------------------------------------------------
# THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
# ------------------------------------------------------

type Restaurant {
  name: String!
  isGood: Boolean
}

type Query {
  getMyRestaurant: Restaurant!
}
```

and try in Graphql playground

```
query {
  getMyRestaurant {
    name
    isGood
  }
}
```

And query result is

```
{
  "data": {
    "getMyRestaurant": {
      "name": "My Restaurant",
      "isGood": true
    }
  }
}
```

#### Arguments in query

Add `veganOnly` property in entity class

```ts
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class Restaurant {
  @Field()
  name: string;

  @Field(() => Boolean)
  veganOnly: boolean;

  @Field(() => Boolean, { nullable: true })
  isGood?: boolean;
}
```

You can use arguments in your graphql query look below

```ts
import { Resolver, Query, Args } from '@nestjs/graphql';
import { Restaurant } from './entities/restaurants.entity';

const mockRestaurant = [
  { name: 'My Restaurant', veganOnly: false, isGood: true },
  { name: 'Your Restaurant', veganOnly: true },
];

@Resolver(() => Restaurant)
export class RestaurantResolver {
  @Query(() => [Restaurant])
  getRestaurants(@Args('veganOnly') veganOnly: boolean): Restaurant[] {
    return mockRestaurant.filter((r) => r.veganOnly === veganOnly);
  }

  @Query(() => Restaurant)
  getMyRestaurant(): Restaurant {
    return { name: 'My Restaurant', veganOnly: false, isGood: true };
  }
}
```

the auto-generated schema file

```gql
# ------------------------------------------------------
# THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
# ------------------------------------------------------

type Restaurant {
  name: String!
  veganOnly: Boolean!
  isGood: Boolean
}

type Query {
  getRestaurants(veganOnly: Boolean!): [Restaurant!]!
  getMyRestaurant: Restaurant!
}
```

test query

```
query {
  getRestaurants(veganOnly: true) {
    name
    isGood
  }
}
```

or, you can use a named query

```gql
query getRestaurants($veganOnly: Boolean!) {
  getRestaurants(veganOnly: $veganOnly) {
    name
    isGood
  }
}
```

and pass argument value from a Query Variable

```
{
 "veganOnly": true
}
```

result

```
{
  "data": {
    "getRestaurants": [
      {
        "name": "Your Restaurant",
        "isGood": null
      }
    ]
  }
}
```

#### Mutation

Note: we can't use a entity class as an object type and an input type at the same type. Because nest.js will generate a input type and a object type, and they can't have the same name

So we need to defined a new input type `CreateRestaurantDto`

src/restaurants/dtos/CreateRestaurant.dto.ts

```ts
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateRestaurantDto {
  @Field()
  name: string;

  @Field(() => Boolean)
  veganOnly: boolean;

  @Field(() => Boolean, { nullable: true })
  isGood?: boolean;
}
```

And create our first mutation

```ts
import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { CreateRestaurantDto } from './dtos/CreateRestaurant.dto';
import { Restaurant } from './entities/Restaurants.entity';

const mockRestaurant = [
  { name: 'My Restaurant', veganOnly: false, isGood: true },
  { name: 'Your Restaurant', veganOnly: true },
];

@Resolver(() => Restaurant)
export class RestaurantResolver {
  @Mutation(() => Restaurant)
  createRestaurant(
    @Args('newRestaurant') newRestaurant: CreateRestaurantDto,
  ): Restaurant {
    return newRestaurant;
  }
}
```

The auto generated schema

```gql
# ------------------------------------------------------
# THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
# ------------------------------------------------------

type Restaurant {
  name: String!
  veganOnly: Boolean!
  isGood: Boolean
}

type Query {
  getRestaurants(veganOnly: Boolean!): [Restaurant!]!
  getMyRestaurant: Restaurant!
}

type Mutation {
  createRestaurant(newRestaurant: CreateRestaurantDto!): Restaurant!
}

input CreateRestaurantDto {
  name: String!
  veganOnly: Boolean!
  isGood: Boolean
}
```

Note: we have a input type `CreateRestaurantDto` and a type `Restaurant`, although they have the same properties, but they have to be separated.

Now test in Graphql playground

```
mutation createRestaurant($newRestaurant: CreateRestaurantDto!) {
  createRestaurant(newRestaurant:$newRestaurant) {
    name
    veganOnly
    isGood
  }
}
```

Graphql variables

```
{
  "newRestaurant": {
    "name": "new one",
    "veganOnly": true,
    "isGood": false
  }
}
```

Or, there is another way of creating input object by using `ArgsType` instead of `InputType`

```ts
import { ArgsType, Field } from '@nestjs/graphql';

@ArgsType()
export class CreateRestaurantDto {
  @Field()
  name: string;

  @Field(() => Boolean)
  veganOnly: boolean;

  @Field(() => Boolean, { nullable: true })
  isGood?: boolean;
}
```

And we don't need a named argument in the mutation

```gql
 @Mutation(() => Restaurant)
  createRestaurant(@Args() newRestaurant: CreateRestaurantDto): Restaurant {
    return newRestaurant;
  }
```

In the auto-generated schema file,

```
input CreateRestaurantDto {
  name: String!
  veganOnly: Boolean!
  isGood: Boolean
}
```

will become

```
type Mutation {
  createRestaurant(name: String!, veganOnly: Boolean!, isGood: Boolean): Restaurant!
}
```

Hence when you call it from the graphql playground

```
mutation createRestaurant($name: String!, $veganOnly: Boolean!, $isGood: Boolean ) {
  createRestaurant(name: $name, veganOnly: $veganOnly, isGood: $isGood) {
    name
    veganOnly
    isGood
  }
}
```

and query variables

```
{
  "name": "new one",
  "veganOnly": true,
  "isGood": false
}
```

The advantage of using `ArgsType` is we can use class validator

#### Validations

```
yarn add class-validator class-transformer
```

in the dto class

```ts
import { ArgsType, Field } from '@nestjs/graphql';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

@ArgsType()
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

And you need to register `ValidationPipe`

main.ts

```ts
declare const module: any;

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe());

  await app.listen(3001);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}
bootstrap();
```

It works well with `InputType` as well

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

And resolver

```ts
import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { CreateRestaurantDto } from './dtos/CreateRestaurant.dto';
import { Restaurant } from './entities/Restaurants.entity';

const mockRestaurant = [
  { name: 'My Restaurant', veganOnly: false, isGood: true },
  { name: 'Your Restaurant', veganOnly: true },
];

@Resolver(() => Restaurant)
export class RestaurantResolver {
  @Mutation(() => Restaurant)
  createRestaurant(
    @Args('newRestaurant') newRestaurant: CreateRestaurantDto,
  ): Restaurant {
    return newRestaurant;
  }
}
```
