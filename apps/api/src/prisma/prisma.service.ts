// apps/api/src/prisma/prisma.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    // This is a NestJS lifecycle hook.
    // It's a good practice to connect to the database here.
    await this.$connect();
  }
}