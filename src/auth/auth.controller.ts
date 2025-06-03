// src/auth/auth.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { UsersService } from '../users/users.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { User as UserEntity } from '../entities/user.entity';
import { RegisterUserDto } from './dto/register-user.dto';

interface AuthenticatedRequest extends Express.Request {
  user: UserEntity;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private readonly usersService: UsersService
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  }) // Dodaj ApiResponse, jeśli brakuje
  @ApiResponse({ status: 401, description: 'Unauthorized' }) // Dodaj ApiResponse, jeśli brakuje
  getProfile(@Request() req: AuthenticatedRequest) {
    // Dzięki ClassSerializerInterceptor i @Exclude() w encji User,
    // pole 'password' zostanie automatycznie usunięte z odpowiedzi.
    // Nie ma potrzeby manualnego usuwania go tutaj.
    return req.user; // <--- UPROSZCZONA LINIA
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Rozpoczyna proces logowania przez Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(
    @Request() req: AuthenticatedRequest,
    @Res() res: Response
  ) {
    try {
      console.log('Google callback - user:', req.user);
      const { access_token, user } = await this.authService.loginGoogle(
        req.user
      ); // Zmiana: pobierz też 'user'
      console.log('Generated token:', access_token);

      // Zamiast przekazywać cały obiekt użytkownika, można przekazać tylko potrzebne informacje
      // lub polegać na tym, że frontend pobierze profil po otrzymaniu tokenu.
      // Dla uproszczenia, przekazujemy token, a frontend może użyć /auth/profile
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      const redirectUrl = `<span class="math-inline">\{frontendUrl\}/auth/google/callback?token\=</span>{access_token}`;
      console.log('Redirecting to:', redirectUrl);

      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Google callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      res.redirect(`${frontendUrl}/login?error=auth_failed`);
    }
  }

  @Post('login')
  @ApiOperation({ summary: 'Login a user' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'john@example.com' },
        password: { type: 'string', example: 'password123' },
      },
      required: ['email', 'password'],
    },
  })
  @ApiResponse({ status: 200, description: 'User logged in successfully' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() body: { email: string; password: string }) {
    try {
      const result = await this.authService.login(body.email, body.password);
      return {
        accessToken: result.access_token,
        user: result.user, // AuthService.login już zwraca użytkownika bez hasła
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Invalid credentials',
        error.status || HttpStatus.UNAUTHORIZED
      );
    }
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterUserDto })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request / Validation error' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerUserDto: RegisterUserDto) {
    const { name, email, password } = registerUserDto;
    try {
      const user = await this.usersService.register(name, email, password);
      // Po rejestracji, zwracany obiekt użytkownika również będzie przetworzony przez ClassSerializerInterceptor,
      // więc hasło zostanie usunięte, jeśli zdecydujesz się zwrócić cały obiekt użytkownika.
      // Obecnie zwracasz tylko userId i wiadomość.
      return { message: 'User registered successfully', userId: user.id };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Could not register user',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
