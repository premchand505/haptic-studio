// apps/api/src/jobs/jobs.service.ts

import { Injectable, InternalServerErrorException, NotFoundException ,BadRequestException ,UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PubSubService } from '../pubsub/pubsub.service';
import { CreateJobDto } from './dto/create-job.dto';
import { Storage } from '@google-cloud/storage';
import { GenerateUploadUrlDto } from './dto/generate-upload-url.dto';
import { UpdateJobDto } from './dto/update-job.dto';

@Injectable()
export class JobsService {
  private readonly storage: Storage;
  private readonly bucketName: string;

  constructor(
    private prisma: PrismaService,
    private pubsubService: PubSubService,
    private configService: ConfigService,
  ) {
    this.storage = new Storage({
      projectId: this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID'),
      keyFilename: this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS'),
    });

    const bucketName = this.configService.get<string>('GCS_INPUT_BUCKET');
    if (!bucketName) {
      throw new Error('GCS_INPUT_BUCKET environment variable not set!');
    }
    this.bucketName = bucketName;
  }

  async generateUploadUrl(generateUploadUrlDto: GenerateUploadUrlDto) {
    // ... (This method remains the same)
    const { filename, contentType } = generateUploadUrlDto;
    const options = {
      version: 'v4' as const,
      action: 'write' as const,
      expires: Date.now() + 15 * 60 * 1000,
      contentType,
    };
    const [url] = await this.storage
      .bucket(this.bucketName)
      .file(filename)
      .getSignedUrl(options);
    return { url };
  }

  async generateDownloadUrls(jobId: string, userId: number) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });

    if (!job) {
      throw new NotFoundException(`Job with ID ${jobId} not found.`);
    }
    if (job.userId !== userId) {
      throw new UnauthorizedException('You are not authorized to access this job.');
    }
    if (job.status !== 'COMPLETED' || !job.outputUrl) {
      throw new BadRequestException('Job is not yet complete or has no output.');
    }

    const urlParts = job.outputUrl.replace('gs://', '').split('/');
    const bucketName = urlParts[0];
    const prefix = urlParts.slice(1).join('/');

    const filesToSign = ['haptic.json', 'haptic.ahap'];
    const urls: { [key: string]: string } = {};

    for (const filename of filesToSign) {
      // This is the key change. We add a contentDisposition header.
      // This tells the browser: "Treat this file as an attachment for download".
      const options = {
        version: 'v4' as const,
        action: 'read' as const,
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        contentDisposition: `attachment; filename="${filename}"`, // <-- THE FIX
      };

      const [url] = await this.storage
        .bucket(bucketName)
        .file(`${prefix}${filename}`)
        .getSignedUrl(options);
        
      urls[filename.split('.')[1]] = url;
    }

    return urls;
  }

  // <-- FIX: Method now accepts userId and no longer creates a temporary user
  async create(createJobDto: CreateJobDto, userId: number) {
    const newJob = await this.prisma.job.create({
      data: {
        videoFilename: createJobDto.videoFilename,
        userId: userId, // Use the real user ID from the token
      },
    });

    const topicId = this.configService.get<string>('PUB_SUB_TOPIC_ID');
    if (!topicId) {
      throw new InternalServerErrorException('Server configuration error: Pub/Sub topic ID not set.');
    }

    await this.pubsubService.publishMessage(topicId, {
      jobId: newJob.id,
      videoFilename: newJob.videoFilename,
    });

    return newJob;
  }

  // <-- FIX: Method now accepts userId to filter jobs correctly
  async findAll(userId: number) {
    return this.prisma.job.findMany({
      where: {
        userId: userId, // Use the real user ID to fetch only their jobs
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async update(id: string, updateJobDto: UpdateJobDto) {
    // ... (This method remains the same)
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found.`);
    }
    return this.prisma.job.update({
      where: { id },
      data: {
        status: updateJobDto.status,
        outputUrl: updateJobDto.outputUrl,
      },
    });
  }
}