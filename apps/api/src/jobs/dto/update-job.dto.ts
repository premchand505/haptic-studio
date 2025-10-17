// apps/api/src/jobs/dto/update-job.dto.ts
import { JobStatus } from '@prisma/client'; // <-- This should be the correct import
import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateJobDto {
  @IsEnum(JobStatus)
  status: JobStatus;

  @IsOptional()
  @IsString()
  // @IsUrl() // <-- We will remove this in the next step
  outputUrl?: string;
}