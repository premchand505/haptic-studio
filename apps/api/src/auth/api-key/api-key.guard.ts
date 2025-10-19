// apps/api/src/auth/api-key.guard.ts
// This is the complete, correct code for this file.

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const keyFromHeader = request.headers['x-api-key'];
    const correctKey = this.configService.get<string>('API_KEY');

    // --- 🚀 DIAGNOSTIC LOG 🚀 ---
    console.log('\n--- ApiKeyGuard Check ---');
    console.log(`Key received in header: '${keyFromHeader}'`);
    console.log(`Correct key from config:  '${correctKey}'`);
    // --- 🚀 END DIAGNOSTIC LOG 🚀 ---

    if (!correctKey) {
      console.error('SERVER ERROR: API_KEY is not configured in .env file!');
      throw new Error('API_KEY is not configured on the server!');
    }

    const isMatch = keyFromHeader === correctKey;
    console.log(`Do the keys match? ${isMatch}`);
    console.log('-------------------------\n');

    if (isMatch) {
      return true;
    } else {
      throw new UnauthorizedException('Invalid or missing API Key');
    }
  }
}