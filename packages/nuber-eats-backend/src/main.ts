declare const module: any;

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  console.log('development', join(process.cwd(), 'src/.env.dev'));

  app.useGlobalPipes(new ValidationPipe());

  await app.listen(3001);

  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => app.close());
  }
}
bootstrap();
