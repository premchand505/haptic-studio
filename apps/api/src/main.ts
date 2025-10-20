// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // --- MODIFIED DYNAMIC CORS CONFIGURATION ---
  // This version always works for local development and adds production URLs when available.

  // 1. Always allow the local frontend origin by default.
  const allowedOrigins = ['http://localhost:3001'];

  // 2. Check for the production/staging URL from your environment variable.
  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl) {
    // Add any URLs from the environment variable to the list.
    allowedOrigins.push(...frontendUrl.split(','));
  }

  // 3. Enable CORS with the combined list of allowed origins.
  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });
  console.log(`✅ CORS enabled for: ${allowedOrigins.join(', ')}`);
  // --- END MODIFIED DYNAMIC CORS ---

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // --- DYNAMIC PORT BINDING ---
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  // --- END DYNAMIC PORT ---
}
bootstrap();