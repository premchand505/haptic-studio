// apps/api/src/jobs/jobs.module.ts

import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { ConfigModule } from '@nestjs/config'; // Make sure this is imported

@Module({
  imports: [ConfigModule], // <-- FIX: Add ConfigModule here
  controllers: [JobsController],
  providers: [JobsService], // You don't need to provide the guard here
})
export class JobsModule {}