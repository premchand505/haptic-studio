// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // --- DYNAMIC CORS CONFIGURATION ---
  const frontendUrl = process.env.FRONTEND_URL; // e.g., http://localhost:3001 or Vercel URL
  if (frontendUrl) {
    app.enableCors({
      origin: frontendUrl.split(','), // Allow multiple origins by splitting a comma-separated string
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    });
    console.log(`✅ CORS enabled for: ${frontendUrl}`);
  }
  // --- END DYNAMIC CORS ---

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