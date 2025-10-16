// apps/api/src/jobs/jobs.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common'; // <-- Import exception
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PubSubService } from '../pubsub/pubsub.service';
import { CreateJobDto } from './dto/create-job.dto';
import { Storage } from '@google-cloud/storage'; // <-- Import Storage
import { GenerateUploadUrlDto } from './dto/generate-upload-url.dto';

@Injectable()
export class JobsService {
  private readonly storage: Storage; // <-- Add storage property
  private readonly bucketName: string;

  constructor(
    private prisma: PrismaService,
    private pubsubService: PubSubService,
    private configService: ConfigService,
  ) 


{
    // Initialize Storage client from the credentials in the .env file
    this.storage = new Storage({
        projectId: this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID'),
        keyFilename: this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS'),
    });

    const bucketName = this.configService.get<string>('GCS_INPUT_BUCKET');
    if (!bucketName) {
      // This stops the application from starting if the bucket name isn't configured.
      throw new Error('GCS_INPUT_BUCKET environment variable not set!');
    }
    this.bucketName = bucketName;
  
    
  }

  // Method to generate the pre-signed URL
  async generateUploadUrl(generateUploadUrlDto: GenerateUploadUrlDto) {
    const { filename, contentType } = generateUploadUrlDto;

    const options = {
      version: 'v4' as const,
      action: 'write' as const,
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType,
    };

    const [url] = await this.storage
      .bucket(this.bucketName)
      .file(filename)
      .getSignedUrl(options);

    return { url };
  }

  async create(createJobDto: CreateJobDto) {
    // ... (user upsert logic remains the same)
    await this.prisma.user.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            email: 'testuser@example.com',
            password: 'password'
        }
    });

    const newJob = await this.prisma.job.create({
      data: {
        videoFilename: createJobDto.videoFilename,
        userId: 1,
      },
    });

    // Get the topic ID from environment variables
    const topicId = this.configService.get<string>('PUB_SUB_TOPIC_ID');

    // <-- FIX IS HERE: Validate that the environment variable exists
    if (!topicId) {
      throw new InternalServerErrorException('Server configuration error: Pub/Sub topic ID not set.');
    }

    // Now TypeScript knows topicId is a string, so the error is gone.
    await this.pubsubService.publishMessage(topicId, {
      jobId: newJob.id,
      videoFilename: newJob.videoFilename,
    });

    return newJob;
  }

  async findAll() {
    // NOTE: Later, this will be filtered by the authenticated user's ID.
    // For now, we fetch all jobs for our test user.
    return this.prisma.job.findMany({
      where: {
        userId: 1, // Hardcoded for now
      },
      orderBy: {
        createdAt: 'desc', // Show the newest jobs first
      },
    });
  }
}