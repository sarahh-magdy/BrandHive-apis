import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import dns from 'dns';

async function bootstrap() {
  dns.setDefaultResultOrder('ipv4first');

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('ADMIN_EMAIL:', process.env.ADMIN_EMAIL);
  console.log('ADMIN_PASSWORD:', process.env.ADMIN_PASSWORD);
  await app.listen(port, '0.0.0.0');

  console.log(`Server running on: http://0.0.0.0:${port}`);
}

bootstrap();