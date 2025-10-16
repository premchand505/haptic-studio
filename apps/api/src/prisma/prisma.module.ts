// apps/api/src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Make the module global
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Export the service
})
export class PrismaModule {}