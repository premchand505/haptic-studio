// apps/api/src/jobs/dto/generate-upload-url.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateUploadUrlDto {
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  contentType: string;
}