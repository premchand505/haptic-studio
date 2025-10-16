// apps/api/src/jobs/dto/create-job.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  videoFilename: string;
}