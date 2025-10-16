// apps/api/src/pubsub/pubsub.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // <-- Import
import { PubSub } from '@google-cloud/pubsub';

@Injectable()
export class PubSubService {
  private pubSubClient: PubSub;

  // Inject ConfigService here
  constructor(private configService: ConfigService) {
    // Pass credentials directly to the constructor
    this.pubSubClient = new PubSub({
      projectId: this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID'),
      keyFilename: this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS'),
    });
  }

  async publishMessage(topicId: string, payload: any) {
    const dataBuffer = Buffer.from(JSON.stringify(payload));
    try {
      const messageId = await this.pubSubClient
        .topic(topicId)
        .publishMessage({ data: dataBuffer });
      console.log(`Message ${messageId} published to topic ${topicId}.`);
      return messageId;
    } catch (error) {
      // The error message will now be more specific if there's a problem
      console.error(`Received error while publishing: ${error.message}`);
      throw error; // Re-throw the error so the client knows something went wrong
    }
  }
}