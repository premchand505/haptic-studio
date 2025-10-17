// apps/api/src/app.module.ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module'; // <-- Import here
import { JobsModule } from './jobs/jobs.module';
import { AuthModule } from './auth/auth.module';
import { PubSubModule } from  './pubsub/pubsub.module';

@Module({
  imports: [PrismaModule, JobsModule, PubSubModule, AuthModule], // <-- Add to imports array
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}