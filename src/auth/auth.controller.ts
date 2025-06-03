import { Controller, Get, Post, Body, UseGuards, Request, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { Response } from 'express'; // Dodajemy import Response
import { UsersService } from '../users/users.service'; // Dodajemy import
import { HttpException, HttpStatus } from '@nestjs/common'; // Dodajemy importy dla wyjątku
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger'; // Dodajemy importy dla Swagger
import { User as UserEntity } from '../entities/user.entity'; // Import encji User

// Definicja typu dla obiektu żądania z użytkownikiem
interface AuthenticatedRequest extends Express.Request {
  user: UserEntity; // Używamy UserEntity dla ścisłego typowania
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private readonly usersService: UsersService, // Dodajemy UsersService
  ) {}

  @UseGuards(AuthGuard('jwt')) // Ochrona endpointu za pomocą JWT
  @Get('profile')
  getProfile(@Request() req: AuthenticatedRequest) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = req.user;
    return { user: userWithoutPassword };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Rozpoczyna proces logowania przez Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Request() req: AuthenticatedRequest, @Res() res: Response) {
    try {
      console.log('Google callback - user:', req.user);
      const { access_token } = await this.authService.loginGoogle(req.user);
      console.log('Generated token:', access_token);
      
      // Przekierowujemy na frontend z tokenem w parametrach URL
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      const redirectUrl = `${frontendUrl}/auth/google/callback?token=${access_token}`;
      console.log('Redirecting to:', redirectUrl);
      
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Google callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
      res.redirect(`${frontendUrl}/login?error=auth_failed`);
    }
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    try {
      const result = await this.authService.login(body.email, body.password);
      return {
        accessToken: result.access_token,
        user: result.user,
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
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'John Doe' },
        email: { type: 'string', example: 'john@example.com' },
        password: { type: 'string', example: 'password123' },
      },
      required: ['name', 'email', 'password'],
    },
  })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  async register(
    @Body() body: { name: string; email: string; password: string },
  ) {
    const { name, email, password } = body;
    if (!name || !email || !password) {
      throw new HttpException('Missing required fields', HttpStatus.BAD_REQUEST);
    }

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new HttpException('User already exists', HttpStatus.BAD_REQUEST);
    }

    const user = await this.usersService.register(name, email, password);
    return { message: 'User registered successfully', userId: user.id };
  }
}