// apps/api/src/jobs/jobs.controller.ts
import { Controller, Post, Body , Get } from '@nestjs/common';
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

  @Get()
  findAll() {
    return this.jobsService.findAll();
  }

  @Post()
  create(@Body() createJobDto: CreateJobDto) {
    return this.jobsService.create(createJobDto);
  }
}