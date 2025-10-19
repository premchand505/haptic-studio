// apps/api/src/jobs/jobs.controller.ts

import { Controller, Post, Body, Get, Patch, Param, UseGuards, Req } from '@nestjs/common';
import type { Request } from 'express';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { GenerateUploadUrlDto } from './dto/generate-upload-url.dto';
import { UpdateJobDto } from './dto/update-job.dto';
// <-- FIX: Import the GUARD, not the STRATEGY
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiKeyGuard } from '../auth/api-key/api-key.guard';

 // Protect all routes in this controller
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  // <-- FIX: Merged into one method that gets the user from the request
  findAll(@Req() req: Request) {
    const user = req.user as { id: number }; // User is attached by the JwtAuthGuard
    return this.jobsService.findAll(user.id);
  }  

  // --- 🚀 NEW ENDPOINT STARTS HERE 🚀 ---
  @UseGuards(JwtAuthGuard)
  @Get(':id/download-urls')
  generateDownloadUrls(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as { id: number };
    return this.jobsService.generateDownloadUrls(id, user.id);
  }
  // --- 🚀 NEW ENDPOINT ENDS HERE 🚀 ---

  @UseGuards(JwtAuthGuard)
  @Post()
  // <-- FIX: Merged into one method that gets the user from the request
  create(@Body() createJobDto: CreateJobDto, @Req() req: Request) {
    const user = req.user as { id: number };
    return this.jobsService.create(createJobDto, user.id);
  }  

  @UseGuards(JwtAuthGuard)
  @Post('upload-url')
  generateUploadUrl(@Body() generateUploadUrlDto: GenerateUploadUrlDto) {
    // This route is now also protected and requires a valid token
    return this.jobsService.generateUploadUrl(generateUploadUrlDto);
  }
  
  @UseGuards(ApiKeyGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateJobDto: UpdateJobDto) {
    return this.jobsService.update(id, updateJobDto);
  }
}