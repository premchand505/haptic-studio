import { Global, Module } from '@nestjs/common';
import { PubSubService } from './pubsub.service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports:[ConfigModule],
  providers: [PubSubService],
  exports: [PubSubService],
})
export class PubSubModule {}