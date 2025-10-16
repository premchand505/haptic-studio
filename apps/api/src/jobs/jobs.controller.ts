// apps/api/src/jobs/jobs.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { GenerateUploadUrlDto } from './dto/generate-upload-url.dto'; // <-- Import

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post('upload-url') // <-- Define new route
  generateUploadUrl(@Body() generateUploadUrlDto: GenerateUploadUrlDto) {
    return this.jobsService.generateUploadUrl(generateUploadUrlDto);
  }

  @Post()
  create(@Body() createJobDto: CreateJobDto) {
    return this.jobsService.create(createJobDto);
  }
}