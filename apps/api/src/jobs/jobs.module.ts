import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { ConfigModule } from '@nestjs/config';
@Module({
  imports:[ConfigModule],
  controllers: [JobsController],
  providers: [JobsService]
})
export class JobsModule {}
