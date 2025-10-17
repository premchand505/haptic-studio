// apps/api/src/auth/auth.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signUp(@Body() authDto: AuthDto) {
    return this.authService.signUp(authDto.email, authDto.password);
  }

  @HttpCode(HttpStatus.OK) // Set success status to 200 OK for login
  @Post('login')
  login(@Body() authDto: AuthDto) {
    return this.authService.login(authDto.email, authDto.password);
  }
}