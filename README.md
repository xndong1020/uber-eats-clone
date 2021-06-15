### 1. Setup monorepo by using lerna

```
npm i lerna -D
npx lerna init

npx lerna clean -y // remove node_modules from packages folder

npx lerna bootstrap --hoist
```

### 2. setup hmr for nest.js

[hot-reload](https://docs.nestjs.com/recipes/hot-reload)

### 3. setup graphql for nest.js

```
yarn add @nestjs/graphql graphql-tools graphql apollo-server-express
```

Delete AppController, just leave `main.ts` and `app.module.ts`

main.ts

```ts
declare const module: any;

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3001);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}
bootstrap();
```

Table of content:

1. [#1 GRAPHQL API](./docs/1-GRAPHQL-API.md)
2. [#2 DATABASE CONFIGURATION](./docs/2-DATABASE-CONFIGURATION.md)
3. [#3 TYPEORM AND NEST](./docs/3-TYPEORM-AND-NEST.md)

branch is [poc/chap1-3]

4. [#4 USER CRUD](./docs/4-USER-CRUD.md)

branch is [poc/chap4]
