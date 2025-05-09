import { NestFactory } from '@nestjs/core';
import * as cors from 'cors';
import { AppModule } from './app.module';
import { AppExceptionFilter } from './filters/app-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ?? 3000;

  app.use(cors());

  app.useGlobalFilters(new AppExceptionFilter());

  await app.listen(port);
}
void bootstrap();
