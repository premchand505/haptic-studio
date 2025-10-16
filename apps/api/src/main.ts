// apps/api/src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common'; // <-- Import

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

   app.enableCors({ // <-- Add this block
    origin: 'http://localhost:3001', // Allow your Next.js app
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });


  app.useGlobalPipes(new ValidationPipe({ // <-- Add this line
    whitelist: true, // Strips away properties that are not in the DTO
    forbidNonWhitelisted: true, // Throws an error if unknown properties are sent
  }));


  await app.listen(3000);

 
 
}
bootstrap();